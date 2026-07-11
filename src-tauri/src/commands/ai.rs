use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_state::AppState;
use crate::domain::ai::{
    AiRunInput, AiStreamChunk, AiStreamDone, AiStreamError, AiStreamStarted, ApplyChangeInput,
    ApplyChangeResult,
};
use crate::domain::settings::AiProvider;
use crate::error::AppError;
use crate::infrastructure::ai::{DeepSeekChatCompletionsClient, OpenAiResponsesClient};
use crate::infrastructure::security::SecretStore;
use crate::services::ai_service::AiService;
use crate::services::note_service::NoteService;
use crate::services::settings_service::SettingsService;

#[tauri::command]
pub async fn run_ai_action(
    app: AppHandle,
    state: State<'_, AppState>,
    input: AiRunInput,
) -> Result<AiStreamStarted, AppError> {
    let request_id = AiService::request_id(&input);
    state.clear_ai_request(&request_id)?;
    let stream_app = app.clone();
    let stream_request_id = request_id.clone();

    tauri::async_runtime::spawn(async move {
        tokio::task::yield_now().await;
        let result =
            run_ai_action_stream(stream_app.clone(), input, stream_request_id.clone()).await;
        match result {
            Ok(()) => {
                if !is_cancelled(&stream_app, &stream_request_id) {
                    let _ = stream_app.emit(
                        "ai:done",
                        AiStreamDone {
                            request_id: stream_request_id.clone(),
                        },
                    );
                }
                let _ = stream_app
                    .state::<AppState>()
                    .clear_ai_request(&stream_request_id);
            }
            Err(AppError::AiCancelled) => {}
            Err(error) => {
                let _ = stream_app.emit(
                    "ai:error",
                    AiStreamError {
                        request_id: stream_request_id,
                        message: error.code().to_string(),
                    },
                );
            }
        }
    });

    Ok(AiStreamStarted { request_id })
}

async fn run_ai_action_stream(
    app: AppHandle,
    input: AiRunInput,
    request_id: String,
) -> Result<(), AppError> {
    if std::env::var_os("AI_NOTE_MANAGER_DISABLE_EXTERNAL_AI").is_some() {
        let output = AiService::run_action(input).map(|result| result.output)?;
        return emit_local_ai_chunks(&app, &request_id, &output).await;
    }

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::PermissionDenied)?;
    let settings = SettingsService::get_settings(app_data_dir)?;
    let Some(api_key) = SettingsService::get_api_key(&SecretStore, settings.provider.key_name())?
    else {
        let output = AiService::run_action(input).map(|result| result.output)?;
        return emit_local_ai_chunks(&app, &request_id, &output).await;
    };

    match settings.provider {
        AiProvider::Openai => {
            OpenAiResponsesClient::default()
                .stream_text(
                    &api_key,
                    &settings.model,
                    &AiService::provider_input(&input),
                    |chunk| emit_ai_chunk(&app, &request_id, chunk),
                )
                .await
        }
        AiProvider::Deepseek => {
            DeepSeekChatCompletionsClient::default()
                .stream_text(
                    &api_key,
                    &settings.model,
                    &AiService::provider_input(&input),
                    |chunk| emit_ai_chunk(&app, &request_id, chunk),
                )
                .await
        }
    }
}

async fn emit_local_ai_chunks(
    app: &AppHandle,
    request_id: &str,
    output: &str,
) -> Result<(), AppError> {
    for chunk in AiService::stream_chunks(output) {
        emit_ai_chunk(app, request_id, &chunk)?;
        tokio::task::yield_now().await;
    }
    Ok(())
}

fn emit_ai_chunk(app: &AppHandle, request_id: &str, chunk: &str) -> Result<(), AppError> {
    if is_cancelled(app, request_id) {
        return Err(AppError::AiCancelled);
    }

    let _ = app.emit(
        "ai:chunk",
        AiStreamChunk {
            request_id: request_id.to_string(),
            chunk: chunk.to_string(),
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn apply_ai_change(
    input: ApplyChangeInput,
    state: State<'_, AppState>,
) -> Result<ApplyChangeResult, AppError> {
    let vault = state.active_vault_for_id(&input.vault_id)?;
    let result = AiService::apply_change(&vault.path, input)?;
    state.with_database(|database| {
        NoteService::index_markdown_note(database, &vault, &result.path)
    })?;
    Ok(result)
}

#[tauri::command]
pub async fn cancel_ai_action(
    request_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state.cancel_ai_request(request_id)
}

fn is_cancelled(app: &AppHandle, request_id: &str) -> bool {
    app.state::<AppState>().is_ai_request_cancelled(request_id)
}
