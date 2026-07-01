use tauri::{AppHandle, Emitter, State};

use crate::app_state::AppState;
use crate::domain::note::{
    DeleteResult, FileTreeNode, NoteContent, NoteDiskStatus, NoteInfo, SaveResult,
};
use crate::error::AppError;
use crate::infrastructure::fs::{VaultWatcher, VAULT_FILE_CHANGED_EVENT};
use crate::services::note_service::NoteService;

#[tauri::command]
pub async fn list_markdown_files(
    vault_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<FileTreeNode>, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    let tree = NoteService::scan_markdown_tree(&vault.path)?;
    state.with_database(|database| NoteService::index_markdown_tree(database, &vault, &tree))?;
    Ok(tree)
}

#[tauri::command]
pub async fn start_vault_watcher(
    vault_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    let watcher = VaultWatcher::new(vault.id, vault.path.into(), move |payload| {
        let _ = app.emit(VAULT_FILE_CHANGED_EVENT, payload);
    })?;
    state.set_vault_watcher(watcher)
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
pub async fn check_note_status(
    vault_id: String,
    path: String,
    base_version: String,
    state: State<'_, AppState>,
) -> Result<NoteDiskStatus, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::check_note_status(vault.path, &path, &base_version)
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
    vault_id: String,
    parent_path: String,
    title: String,
    state: State<'_, AppState>,
) -> Result<NoteInfo, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::create_note(vault.path, &parent_path, &title)
}

#[tauri::command]
pub async fn create_folder(
    vault_id: String,
    parent_path: String,
    name: String,
    state: State<'_, AppState>,
) -> Result<FileTreeNode, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::create_folder(vault.path, &parent_path, &name)
}

#[tauri::command]
pub async fn rename_note(
    vault_id: String,
    old_path: String,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<NoteInfo, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::rename_note(vault.path, &old_path, &new_name)
}

#[tauri::command]
pub async fn delete_note(
    vault_id: String,
    path: String,
    state: State<'_, AppState>,
) -> Result<DeleteResult, AppError> {
    let vault = state.active_vault_for_id(&vault_id)?;
    NoteService::delete_note(vault.path, &path)
}
