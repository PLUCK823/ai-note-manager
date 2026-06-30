use tauri::{AppHandle, Manager};

use crate::domain::settings::{AppSettings, SaveKeyResult};
use crate::error::AppError;
use crate::infrastructure::security::SecretStore;
use crate::services::settings_service::SettingsService;

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::PermissionDenied)?;
    SettingsService::get_settings(app_data_dir)
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, input: AppSettings) -> Result<AppSettings, AppError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|_| AppError::PermissionDenied)?;
    SettingsService::update_settings(app_data_dir, input)
}

#[tauri::command]
pub async fn save_api_key(provider: String, api_key: String) -> Result<SaveKeyResult, AppError> {
    SettingsService::save_api_key(&SecretStore, &provider, &api_key)
}
