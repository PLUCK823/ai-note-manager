use crate::domain::ai::{AiRunInput, AiRunResult, ApplyChangeInput, ApplyChangeResult};
use crate::error::AppError;

#[tauri::command]
pub async fn run_ai_action(_input: AiRunInput) -> Result<AiRunResult, AppError> {
    Err(AppError::AiApiKeyMissing)
}

#[tauri::command]
pub async fn apply_ai_change(_input: ApplyChangeInput) -> Result<ApplyChangeResult, AppError> {
    Err(AppError::VaultNotSelected)
}

#[tauri::command]
pub async fn cancel_ai_action(_request_id: String) -> Result<(), AppError> {
    Ok(())
}
