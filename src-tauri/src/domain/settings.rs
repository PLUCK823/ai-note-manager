use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AiReadScope {
    CurrentNote,
    LinkedNotes,
    FullVault,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppSettings {
    pub model: String,
    pub ai_read_scope: AiReadScope,
    pub autosave: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveKeyResult {
    pub provider: String,
    pub saved: bool,
}
