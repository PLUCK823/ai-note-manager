use serde::ser::SerializeStruct;
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("vault_not_selected")]
    VaultNotSelected,
    #[error("file_not_found")]
    FileNotFound,
    #[error("file_not_markdown")]
    FileNotMarkdown,
    #[error("file_read_failed")]
    FileReadFailed,
    #[error("file_write_failed")]
    FileWriteFailed,
    #[error("file_conflict")]
    FileConflict,
    #[error("db_error")]
    DbError,
    #[error("ai_api_key_missing")]
    AiApiKeyMissing,
    #[error("ai_request_failed")]
    AiRequestFailed,
    #[error("ai_cancelled")]
    AiCancelled,
    #[error("permission_denied")]
    PermissionDenied,
    #[error("unknown")]
    Unknown,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::VaultNotSelected => "vault_not_selected",
            Self::FileNotFound => "file_not_found",
            Self::FileNotMarkdown => "file_not_markdown",
            Self::FileReadFailed => "file_read_failed",
            Self::FileWriteFailed => "file_write_failed",
            Self::FileConflict => "file_conflict",
            Self::DbError => "db_error",
            Self::AiApiKeyMissing => "ai_api_key_missing",
            Self::AiRequestFailed => "ai_request_failed",
            Self::AiCancelled => "ai_cancelled",
            Self::PermissionDenied => "permission_denied",
            Self::Unknown => "unknown",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}
