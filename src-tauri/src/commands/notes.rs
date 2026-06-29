use crate::domain::note::{DeleteResult, FileTreeNode, NoteContent, NoteInfo, SaveResult};
use crate::error::AppError;

#[tauri::command]
pub async fn list_markdown_files(_vault_id: String) -> Result<Vec<FileTreeNode>, AppError> {
    Ok(Vec::new())
}

#[tauri::command]
pub async fn read_note(_vault_id: String, _path: String) -> Result<NoteContent, AppError> {
    Err(AppError::FileNotFound)
}

#[tauri::command]
pub async fn save_note(
    _vault_id: String,
    _path: String,
    _content: String,
    _base_version: String,
) -> Result<SaveResult, AppError> {
    Err(AppError::VaultNotSelected)
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
