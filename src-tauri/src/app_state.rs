use std::sync::Mutex;

use crate::domain::vault::VaultInfo;
use crate::error::AppError;
use crate::infrastructure::db::Database;
use crate::infrastructure::fs::VaultWatcher;

pub struct AppState {
    active_vault: Mutex<Option<VaultInfo>>,
    database: Mutex<Database>,
    vault_watcher: Mutex<Option<VaultWatcher>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            active_vault: Mutex::new(None),
            database: Mutex::new(
                Database::open_in_memory().expect("failed to initialize application database"),
            ),
            vault_watcher: Mutex::new(None),
        }
    }
}

impl AppState {
    pub fn from_database(database: Database) -> Self {
        Self {
            active_vault: Mutex::new(None),
            database: Mutex::new(database),
            vault_watcher: Mutex::new(None),
        }
    }

    pub fn set_active_vault(&self, vault: Option<VaultInfo>) -> Result<(), AppError> {
        if let Some(vault) = &vault {
            self.with_database(|database| {
                database.upsert_vault(&vault.id, &vault.path, &vault.name)
            })?;
        }

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

    pub fn with_database<T>(
        &self,
        operation: impl FnOnce(&Database) -> Result<T, AppError>,
    ) -> Result<T, AppError> {
        let database = self.database.lock().map_err(|_| AppError::Unknown)?;
        operation(&database)
    }

    pub fn recent_vault(&self) -> Result<Option<VaultInfo>, AppError> {
        self.with_database(Database::recent_vault)
    }

    pub fn set_vault_watcher(&self, watcher: VaultWatcher) -> Result<(), AppError> {
        let mut vault_watcher = self.vault_watcher.lock().map_err(|_| AppError::Unknown)?;
        *vault_watcher = Some(watcher);
        Ok(())
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
