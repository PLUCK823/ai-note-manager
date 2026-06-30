use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::app_state::AppState;
use crate::domain::vault::VaultInfo;
use crate::error::AppError;
use crate::services::vault_service::VaultService;

#[tauri::command]
pub async fn select_vault(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<VaultInfo, AppError> {
    let selected_path = app
        .dialog()
        .file()
        .set_title("Open Markdown vault")
        .blocking_pick_folder()
        .ok_or(AppError::VaultNotSelected)?
        .into_path()
        .map_err(|_| AppError::PermissionDenied)?;

    let vault = VaultService::vault_info_from_path(selected_path)?;
    state.set_active_vault(Some(vault.clone()))?;
    Ok(vault)
}

#[tauri::command]
pub async fn open_recent_vault(
    path: String,
    state: State<'_, AppState>,
) -> Result<VaultInfo, AppError> {
    let vault = VaultService::vault_info_from_path(path)?;
    state.set_active_vault(Some(vault.clone()))?;
    Ok(vault)
}

#[tauri::command]
pub async fn get_recent_vault(state: State<'_, AppState>) -> Result<Option<VaultInfo>, AppError> {
    let Some(vault) = state.recent_vault()? else {
        return Ok(None);
    };

    let vault = match VaultService::vault_info_from_path(&vault.path) {
        Ok(vault) => vault,
        Err(_) => return Ok(None),
    };
    state.set_active_vault(Some(vault.clone()))?;
    Ok(Some(vault))
}
