use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_state::AppState;
use crate::domain::ai::{
    AiRunInput, AiStreamChunk, AiStreamDone, AiStreamError, AiStreamStarted, ApplyChangeInput,
    ApplyChangeResult,
};
use crate::error::AppError;
use crate::infrastructure::ai::OpenAiResponsesClient;
use crate::infrastructure::security::SecretStore;
use crate::services::ai_service::AiService;
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
        let result = run_ai_action_output(stream_app.clone(), input).await;
        match result {
            Ok(output) => {
                for chunk in AiService::stream_chunks(&output) {
                    if is_cancelled(&stream_app, &stream_request_id) {
                        return;
                    }
                    let _ = stream_app.emit(
                        "ai:chunk",
                        AiStreamChunk {
                            request_id: stream_request_id.clone(),
                            chunk,
                        },
                    );
                    tokio::task::yield_now().await;
                }

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

async fn run_ai_action_output(app: AppHandle, input: AiRunInput) -> Result<String, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::PermissionDenied)?;
    let settings = SettingsService::get_settings(app_data_dir)?;
    let Some(api_key) = SettingsService::get_api_key(&SecretStore, "openai")? else {
        return AiService::run_action(input).map(|result| result.output);
    };

    OpenAiResponsesClient::default()
        .run(
            &api_key,
            &settings.model,
            &AiService::provider_input(&input),
        )
        .await
        .map(|result| result.output)
}

#[tauri::command]
pub async fn apply_ai_change(
    input: ApplyChangeInput,
    state: State<'_, AppState>,
) -> Result<ApplyChangeResult, AppError> {
    let vault = state.active_vault_for_id(&input.vault_id)?;
    AiService::apply_change(vault.path, input)
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
