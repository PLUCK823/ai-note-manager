use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct VaultInfo {
    pub id: String,
    pub path: String,
    pub name: String,
    pub last_opened_at: Option<String>,
}
