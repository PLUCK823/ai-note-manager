use tauri::State;

use crate::app_state::AppState;
use crate::domain::search::SearchResult;
use crate::error::AppError;

#[tauri::command]
pub async fn search_notes(
    vault_id: String,
    query: String,
    state: State<'_, AppState>,
) -> Result<Vec<SearchResult>, AppError> {
    state.active_vault_for_id(&vault_id)?;
    state.with_database(|database| database.search_notes(&vault_id, &query))
}
