use crate::error::AppError;
use crate::services::settings_service::SecretStore as SecretStorePort;

pub struct SecretStore;

impl SecretStorePort for SecretStore {
    fn save_api_key(&self, provider: &str, api_key: &str) -> Result<(), AppError> {
        let entry = keyring::Entry::new("ai-note-manager", provider)
            .map_err(|_| AppError::PermissionDenied)?;
        entry
            .set_password(api_key)
            .map_err(|_| AppError::PermissionDenied)
    }
}
