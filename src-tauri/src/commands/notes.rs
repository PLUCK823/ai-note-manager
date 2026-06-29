use tauri::State;

use crate::app_state::AppState;
use crate::domain::note::{DeleteResult, FileTreeNode, NoteContent, NoteInfo, SaveResult};
use crate::error::AppError;
use crate::services::note_service::NoteService;

#[tauri::command]
pub async fn list_markdown_files(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileTreeNode>, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::scan_markdown_tree(vault.path)
}

#[tauri::command]
pub async fn read_note(
    vault_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<NoteContent, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::read_note(vault.path, &path)
}

#[tauri::command]
pub async fn save_note(
    vault_id: String,
    path: String,
    content: String,
    base_version: String,
    state: State<'_, AppState>,
) -> Result<SaveResult, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::save_note(vault.path, &path, &content, &base_version)
}

#[tauri::command]
pub async fn create_note(
    _vault_id: String,
    _parent_path: String,
    _title: String,
) -> Result<NoteInfo, AppError> {
    Err(AppError::VaultNotSelected)
}

#[tauri::command]
pub async fn rename_note(
    _vault_id: String,
    _old_path: String,
    _new_name: String,
) -> Result<NoteInfo, AppError> {
    Err(AppError::VaultNotSelected)
}

#[tauri::command]
pub async fn delete_note(_vault_id: String, _path: String) -> Result<DeleteResult, AppError> {
    Err(AppError::VaultNotSelected)
}
