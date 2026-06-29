use std::sync::Mutex;

use crate::domain::vault::VaultInfo;
use crate::error::AppError;

#[derive(Default)]
pub struct AppState {
    active_vault: Mutex<Option<VaultInfo>>,
}

impl AppState {
    pub fn set_active_vault(&self, vault: Option<VaultInfo>) -> Result<(), AppError> {
        let mut active_vault = self.active_vault.lock().map_err(|_| AppError::Unknown)?;
        *active_vault = vault;
        Ok(())
    }

    pub fn active_vault_for_id(&self, vault_id: &str) -> Result<VaultInfo, AppError> {
        let active_vault = self.active_vault.lock().map_err(|_| AppError::Unknown)?;
        let vault = active_vault.as_ref().ok_or(AppError::VaultNotSelected)?;

        if vault.id != vault_id {
            return Err(AppError::VaultNotSelected);
        }

        Ok(vault.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::AppState;
    use crate::domain::vault::VaultInfo;

    #[test]
    fn returns_active_vault_when_id_matches() {
        let state = AppState::default();
        let vault = VaultInfo {
            id: "vault:/tmp/notes".to_string(),
            path: "/tmp/notes".to_string(),
            name: "notes".to_string(),
            last_opened_at: None,
        };

        state.set_active_vault(Some(vault.clone())).unwrap();

        assert_eq!(
            state.active_vault_for_id(&vault.id).unwrap().path,
            vault.path
        );
    }

    #[test]
    fn rejects_missing_or_mismatched_active_vault() {
        let state = AppState::default();

        assert!(state.active_vault_for_id("vault:/tmp/notes").is_err());

        state
            .set_active_vault(Some(VaultInfo {
                id: "vault:/tmp/other".to_string(),
                path: "/tmp/other".to_string(),
                name: "other".to_string(),
                last_opened_at: None,
            }))
            .unwrap();

        assert!(state.active_vault_for_id("vault:/tmp/notes").is_err());
    }
}
