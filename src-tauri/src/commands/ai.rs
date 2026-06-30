use tauri::{AppHandle, Manager, State};

use crate::app_state::AppState;
use crate::domain::ai::{AiRunInput, AiRunResult, ApplyChangeInput, ApplyChangeResult};
use crate::error::AppError;
use crate::infrastructure::ai::OpenAiResponsesClient;
use crate::infrastructure::security::SecretStore;
use crate::services::ai_service::AiService;
use crate::services::settings_service::SettingsService;

#[tauri::command]
pub async fn run_ai_action(app: AppHandle, input: AiRunInput) -> Result<AiRunResult, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::PermissionDenied)?;
    let settings = SettingsService::get_settings(app_data_dir)?;
    let Some(api_key) = SettingsService::get_api_key(&SecretStore, "openai")? else {
        return AiService::run_action(input);
    };

    OpenAiResponsesClient::default()
        .run(
            &api_key,
            &settings.model,
            &AiService::provider_input(&input),
        )
        .await
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
pub async fn cancel_ai_action(_request_id: String) -> Result<(), AppError> {
    Ok(())
}
