use crate::domain::settings::{AiReadScope, AppSettings, SaveKeyResult};
use crate::error::AppError;

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, AppError> {
    Ok(AppSettings {
        model: "gpt-4.1-mini".to_string(),
        ai_read_scope: AiReadScope::CurrentNote,
        autosave: true,
    })
}

#[tauri::command]
pub async fn update_settings(input: AppSettings) -> Result<AppSettings, AppError> {
    Ok(input)
}

#[tauri::command]
pub async fn save_api_key(provider: String, _api_key: String) -> Result<SaveKeyResult, AppError> {
    Ok(SaveKeyResult {
        provider,
        saved: true,
    })
}
