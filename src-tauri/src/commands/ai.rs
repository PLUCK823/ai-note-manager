use std::path::Path;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::app_state::AppState;
use crate::domain::ai::{
    AiRunInput, AiStreamChunk, AiStreamDone, AiStreamError, AiStreamStarted, ApplyChangeInput,
    ApplyChangeResult, ApplyWorkspacePlanInput, ApplyWorkspacePlanResult, WorkspaceOperation,
    WorkspaceOperationKind, WorkspaceOperationResult, WorkspacePlan, WorkspacePlanInput,
};
use crate::domain::settings::AiProvider;
use crate::domain::settings::AppSettings;
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

#[tauri::command]
pub async fn plan_workspace_changes(
    app: AppHandle,
    state: State<'_, AppState>,
    input: WorkspacePlanInput,
) -> Result<WorkspacePlan, AppError> {
    let vault = state.active_vault_for_id(&input.vault_id)?;
    let tree = NoteService::scan_markdown_tree(&vault.path)?;
    let mut paths = Vec::new();
    collect_workspace_paths(&tree, &mut paths);
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::PermissionDenied)?;
    let settings = SettingsService::get_settings(app_data_dir)?;
    let api_key = SettingsService::get_api_key(&SecretStore, settings.provider.key_name())?
        .ok_or(AppError::AiApiKeyMissing)?;
    let provider_input = workspace_plan_prompt(&input, &paths);
    let output = collect_provider_output(
        &settings.provider,
        &api_key,
        &settings.model,
        &provider_input,
    )
    .await?;

    parse_workspace_plan(&output)
}

#[tauri::command]
pub async fn check_ai_provider(
    input: AppSettings,
    api_key: Option<String>,
) -> Result<bool, AppError> {
    let api_key = api_key
        .filter(|value| !value.trim().is_empty())
        .or(SettingsService::get_api_key(
            &SecretStore,
            input.provider.key_name(),
        )?)
        .ok_or(AppError::AiApiKeyMissing)?;
    let output = collect_provider_output(
        &input.provider,
        &api_key,
        &input.model,
        "Reply with exactly: OK",
    )
    .await?;
    Ok(!output.trim().is_empty())
}

#[tauri::command]
pub async fn apply_workspace_plan(
    input: ApplyWorkspacePlanInput,
    state: State<'_, AppState>,
) -> Result<ApplyWorkspacePlanResult, AppError> {
    let vault = state.active_vault_for_id(&input.vault_id)?;
    let mut results = Vec::new();

    for operation in input.operations {
        let result = match operation.kind {
            WorkspaceOperationKind::Read => {
                let path = required_path(&operation)?;
                let note = NoteService::read_note(&vault.path, &path)?;
                WorkspaceOperationResult {
                    kind: WorkspaceOperationKind::Read,
                    path: Some(note.path),
                    message: "Read file".to_string(),
                    content: Some(note.content),
                }
            }
            WorkspaceOperationKind::Search => {
                let query = operation.query.as_deref().ok_or(AppError::FileReadFailed)?;
                let matches =
                    state.with_database(|database| database.search_notes(&vault.id, query))?;
                WorkspaceOperationResult {
                    kind: WorkspaceOperationKind::Search,
                    path: None,
                    message: matches
                        .into_iter()
                        .map(|item| item.path)
                        .collect::<Vec<_>>()
                        .join("\n"),
                    content: None,
                }
            }
            WorkspaceOperationKind::Create => {
                let path = required_path(&operation)?;
                let title = Path::new(&path)
                    .file_name()
                    .and_then(|name| name.to_str())
                    .ok_or(AppError::FileWriteFailed)?;
                let parent = Path::new(&path)
                    .parent()
                    .and_then(|parent| parent.to_str())
                    .unwrap_or("");
                let note = NoteService::create_note(&vault.path, parent, title)?;
                if let Some(content) = operation.content {
                    let created = NoteService::read_note(&vault.path, &note.path)?;
                    NoteService::save_note(
                        &vault.path,
                        &note.path,
                        &content,
                        &created.content_hash,
                    )?;
                }
                WorkspaceOperationResult {
                    kind: WorkspaceOperationKind::Create,
                    path: Some(note.path),
                    message: "Created file".to_string(),
                    content: None,
                }
            }
            WorkspaceOperationKind::Update => {
                let path = required_path(&operation)?;
                let content = operation
                    .content
                    .as_deref()
                    .ok_or(AppError::FileWriteFailed)?;
                let current = NoteService::read_note(&vault.path, &path)?;
                let saved =
                    NoteService::save_note(&vault.path, &path, content, &current.content_hash)?;
                if saved.conflict {
                    return Err(AppError::FileConflict);
                }
                WorkspaceOperationResult {
                    kind: WorkspaceOperationKind::Update,
                    path: Some(saved.path),
                    message: "Updated file".to_string(),
                    content: None,
                }
            }
            WorkspaceOperationKind::Delete => {
                let path = required_path(&operation)?;
                let deleted = NoteService::delete_note(&vault.path, &path)?;
                WorkspaceOperationResult {
                    kind: WorkspaceOperationKind::Delete,
                    path: Some(deleted.path),
                    message: "Moved file to trash".to_string(),
                    content: None,
                }
            }
        };
        results.push(result);
    }

    Ok(ApplyWorkspacePlanResult { results })
}

fn required_path(operation: &WorkspaceOperation) -> Result<String, AppError> {
    operation
        .path
        .as_ref()
        .filter(|path| !path.trim().is_empty())
        .cloned()
        .ok_or(AppError::FileReadFailed)
}

fn collect_workspace_paths(tree: &[crate::domain::note::FileTreeNode], paths: &mut Vec<String>) {
    for node in tree {
        if matches!(node.kind, crate::domain::note::FileTreeNodeKind::File) {
            paths.push(node.path.clone());
        }
        collect_workspace_paths(&node.children, paths);
    }
}

fn workspace_plan_prompt(input: &WorkspacePlanInput, paths: &[String]) -> String {
    format!(
        "You are a local Markdown workspace assistant. Return JSON only, without Markdown fences.\n\
Schema: {{\"summary\":string,\"operations\":[{{\"kind\":\"read|search|create|update|delete\",\"path\":string|null,\"content\":string|null,\"query\":string|null,\"reason\":string}}]}}.\n\
Only use paths from the manifest for read, update, and delete. Create paths must end in .md and stay relative to the workspace. Update content replaces the entire target file. Prefer read or search before update when the instruction lacks file content.\n\
Workspace manifest:\n{}\n\
Active file: {}\nSelected text: {}\nUser instruction: {}",
        paths.join("\n"),
        input.active_path.as_deref().unwrap_or("none"),
        input.selected_text.as_deref().unwrap_or("none"),
        input.instruction,
    )
}

async fn collect_provider_output(
    provider: &AiProvider,
    api_key: &str,
    model: &str,
    input: &str,
) -> Result<String, AppError> {
    let mut output = String::new();
    match provider {
        AiProvider::Openai => {
            OpenAiResponsesClient::default()
                .stream_text(api_key, model, input, |chunk| {
                    output.push_str(chunk);
                    Ok(())
                })
                .await?
        }
        AiProvider::Deepseek => {
            DeepSeekChatCompletionsClient::default()
                .stream_text(api_key, model, input, |chunk| {
                    output.push_str(chunk);
                    Ok(())
                })
                .await?
        }
    }
    Ok(output)
}

fn parse_workspace_plan(output: &str) -> Result<WorkspacePlan, AppError> {
    let trimmed = output.trim();
    let json = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .map(|value| value.trim().trim_end_matches("```").trim())
        .unwrap_or(trimmed);
    serde_json::from_str(json).map_err(|_| AppError::AiRequestFailed)
}

fn is_cancelled(app: &AppHandle, request_id: &str) -> bool {
    app.state::<AppState>().is_ai_request_cancelled(request_id)
}
