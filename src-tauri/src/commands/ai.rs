use tauri::State;

use crate::app_state::AppState;
use crate::domain::ai::{AiRunInput, AiRunResult, ApplyChangeInput, ApplyChangeResult};
use crate::error::AppError;
use crate::services::ai_service::AiService;

#[tauri::command]
pub async fn run_ai_action(input: AiRunInput) -> Result<AiRunResult, AppError> {
    AiService::run_action(input)
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
