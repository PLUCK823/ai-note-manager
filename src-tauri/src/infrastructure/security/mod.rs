use crate::error::AppError;
use crate::services::settings_service::SecretStore as SecretStorePort;

pub struct SecretStore;

const API_KEY_SERVICE: &str = "com.pluck823.ainotemanager.api-keys";
const LEGACY_API_KEY_SERVICE: &str = "ai-note-manager";

fn keychain_service() -> &'static str {
    API_KEY_SERVICE
}

fn keychain_entry(service: &str, provider: &str) -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(service, provider).map_err(|error| {
        eprintln!("Unable to initialize macOS Keychain entry for {provider}: {error}");
        AppError::PermissionDenied
    })
}

fn keychain_error(action: &str, provider: &str, error: keyring::Error) -> AppError {
    eprintln!("Unable to {action} API key for {provider} in macOS Keychain: {error}");
    AppError::PermissionDenied
}

impl SecretStorePort for SecretStore {
    fn save_api_key(&self, provider: &str, api_key: &str) -> Result<(), AppError> {
        let entry = keychain_entry(keychain_service(), provider)?;
        entry
            .set_password(api_key)
            .map_err(|error| keychain_error("store", provider, error))
    }

    fn get_api_key(&self, provider: &str) -> Result<Option<String>, AppError> {
        let entry = keychain_entry(keychain_service(), provider)?;
        match entry.get_password() {
            Ok(api_key) => Ok(Some(api_key)),
            Err(keyring::Error::NoEntry) => self.get_legacy_api_key(provider),
            Err(error) => Err(keychain_error("read", provider, error)),
        }
    }
}

impl SecretStore {
    fn get_legacy_api_key(&self, provider: &str) -> Result<Option<String>, AppError> {
        let entry = keychain_entry(LEGACY_API_KEY_SERVICE, provider)?;
        match entry.get_password() {
            Ok(api_key) => Ok(Some(api_key)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(keychain_error("read legacy", provider, error)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::keychain_service;

    #[test]
    fn stores_new_api_keys_under_the_app_specific_service() {
        assert_eq!(keychain_service(), "com.pluck823.ainotemanager.api-keys");
    }
}
