use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub active_vault_id: Mutex<Option<String>>,
}
