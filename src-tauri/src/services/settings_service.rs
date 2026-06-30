use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::settings::{AiReadScope, AppSettings, SaveKeyResult};
use crate::error::AppError;

pub trait SecretStore {
    fn save_api_key(&self, provider: &str, api_key: &str) -> Result<(), AppError>;
    fn get_api_key(&self, provider: &str) -> Result<Option<String>, AppError>;
}

pub struct SettingsService;

impl SettingsService {
    const SETTINGS_FILE: &'static str = "settings.json";

    pub fn get_settings(app_data_dir: impl AsRef<Path>) -> Result<AppSettings, AppError> {
        let settings_path = Self::settings_path(app_data_dir);
        if !settings_path.exists() {
            return Ok(Self::default_settings());
        }

        let content = fs::read_to_string(settings_path).map_err(|_| AppError::FileReadFailed)?;
        serde_json::from_str(&content).map_err(|_| AppError::FileReadFailed)
    }

    pub fn update_settings(
        app_data_dir: impl AsRef<Path>,
        settings: AppSettings,
    ) -> Result<AppSettings, AppError> {
        let settings_path = Self::settings_path(app_data_dir);
        if let Some(parent) = settings_path.parent() {
            fs::create_dir_all(parent).map_err(|_| AppError::FileWriteFailed)?;
        }

        let content = serde_json::to_string_pretty(&settings).map_err(|_| AppError::Unknown)?;
        fs::write(settings_path, content).map_err(|_| AppError::FileWriteFailed)?;
        Ok(settings)
    }

    pub fn save_api_key(
        secret_store: &impl SecretStore,
        provider: &str,
        api_key: &str,
    ) -> Result<SaveKeyResult, AppError> {
        secret_store.save_api_key(provider, api_key)?;
        Ok(SaveKeyResult {
            provider: provider.to_string(),
            saved: true,
        })
    }

    pub fn get_api_key(
        secret_store: &impl SecretStore,
        provider: &str,
    ) -> Result<Option<String>, AppError> {
        secret_store.get_api_key(provider)
    }

    fn settings_path(app_data_dir: impl AsRef<Path>) -> PathBuf {
        app_data_dir.as_ref().join(Self::SETTINGS_FILE)
    }

    fn default_settings() -> AppSettings {
        AppSettings {
            model: "gpt-4.1-mini".to_string(),
            ai_read_scope: AiReadScope::CurrentNote,
            autosave: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;
    use std::fs;

    use crate::domain::settings::{AiReadScope, AppSettings};

    use super::{SecretStore, SettingsService};

    #[test]
    fn persists_non_sensitive_settings_to_app_data() {
        let root = test_root("persist-settings");
        let settings = AppSettings {
            model: "gpt-4.1".to_string(),
            ai_read_scope: AiReadScope::LinkedNotes,
            autosave: false,
        };

        SettingsService::update_settings(&root, settings).unwrap();
        let loaded = SettingsService::get_settings(&root).unwrap();

        assert_eq!(loaded.model, "gpt-4.1");
        assert!(matches!(loaded.ai_read_scope, AiReadScope::LinkedNotes));
        assert!(!loaded.autosave);
    }

    #[test]
    fn saves_api_key_to_secret_store_without_writing_it_to_settings_file() {
        let root = test_root("save-api-key");
        let secrets = RecordingSecretStore::default();

        SettingsService::save_api_key(&secrets, "openai", "sk-test-secret").unwrap();

        assert_eq!(
            secrets.saved.borrow().as_ref(),
            Some(&("openai".to_string(), "sk-test-secret".to_string()))
        );
        let settings_path = SettingsService::settings_path(&root);
        if settings_path.exists() {
            let content = fs::read_to_string(settings_path).unwrap();
            assert!(!content.contains("sk-test-secret"));
        }
    }

    #[test]
    fn reads_api_key_from_secret_store() {
        let secrets = RecordingSecretStore::default();
        SettingsService::save_api_key(&secrets, "openai", "sk-test-secret").unwrap();

        let api_key = SettingsService::get_api_key(&secrets, "openai").unwrap();

        assert_eq!(api_key, Some("sk-test-secret".to_string()));
    }

    #[derive(Default)]
    struct RecordingSecretStore {
        saved: RefCell<Option<(String, String)>>,
    }

    impl SecretStore for RecordingSecretStore {
        fn save_api_key(
            &self,
            provider: &str,
            api_key: &str,
        ) -> Result<(), crate::error::AppError> {
            self.saved
                .replace(Some((provider.to_string(), api_key.to_string())));
            Ok(())
        }

        fn get_api_key(&self, provider: &str) -> Result<Option<String>, crate::error::AppError> {
            Ok(self
                .saved
                .borrow()
                .as_ref()
                .filter(|(saved_provider, _)| saved_provider == provider)
                .map(|(_, api_key)| api_key.clone()))
        }
    }

    fn test_root(name: &str) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!(
            "ai-note-manager-settings-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        root
    }
}
