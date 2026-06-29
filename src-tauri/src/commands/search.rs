use crate::domain::search::SearchResult;
use crate::error::AppError;

#[tauri::command]
pub async fn search_notes(
    _vault_id: String,
    _query: String,
) -> Result<Vec<SearchResult>, AppError> {
    Ok(Vec::new())
}
