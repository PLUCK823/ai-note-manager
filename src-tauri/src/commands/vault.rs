use crate::domain::vault::VaultInfo;
use crate::error::AppError;

#[tauri::command]
pub async fn select_vault() -> Result<VaultInfo, AppError> {
    Err(AppError::VaultNotSelected)
}

#[tauri::command]
pub async fn open_recent_vault(_path: String) -> Result<VaultInfo, AppError> {
    Err(AppError::VaultNotSelected)
}
