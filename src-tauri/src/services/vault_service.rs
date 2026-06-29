use std::path::Path;

use crate::domain::vault::VaultInfo;
use crate::error::AppError;

pub struct VaultService;

impl VaultService {
    pub fn vault_info_from_path(path: impl AsRef<Path>) -> Result<VaultInfo, AppError> {
        let path = path.as_ref();

        if !path.is_dir() {
            return Err(AppError::FileNotFound);
        }

        let canonical_path = path
            .canonicalize()
            .map_err(|_| AppError::PermissionDenied)?;
        let name = canonical_path
            .file_name()
            .and_then(|name| name.to_str())
            .filter(|name| !name.is_empty())
            .unwrap_or("Vault")
            .to_string();
        let path_string = canonical_path.to_string_lossy().to_string();

        Ok(VaultInfo {
            id: Self::vault_id_from_path(&canonical_path),
            path: path_string,
            name,
            last_opened_at: None,
        })
    }

    fn vault_id_from_path(path: &Path) -> String {
        format!("vault:{}", path.to_string_lossy())
    }
}

#[cfg(test)]
mod tests {
    use super::VaultService;

    #[test]
    fn builds_vault_info_from_existing_directory() {
        let vault = VaultService::vault_info_from_path(std::env::temp_dir()).unwrap();

        assert_eq!(
            vault.path,
            std::env::temp_dir()
                .canonicalize()
                .unwrap()
                .to_string_lossy()
        );
        assert!(vault.id.starts_with("vault:"));
        assert!(!vault.name.is_empty());
        assert_eq!(vault.last_opened_at, None);
    }

    #[test]
    fn rejects_non_directory_path() {
        let result = VaultService::vault_info_from_path(std::env::temp_dir().join("missing-vault"));

        assert!(result.is_err());
    }
}
