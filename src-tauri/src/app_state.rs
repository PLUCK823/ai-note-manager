use std::sync::Mutex;

use crate::error::AppError;

#[derive(Default)]
pub struct AppState {
    pub active_vault_id: Mutex<Option<String>>,
}

impl AppState {
    pub fn set_active_vault_id(&self, vault_id: Option<String>) -> Result<(), AppError> {
        let mut active_vault_id = self.active_vault_id.lock().map_err(|_| AppError::Unknown)?;
        *active_vault_id = vault_id;
        Ok(())
    }
}
