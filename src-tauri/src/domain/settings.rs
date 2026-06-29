use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AiReadScope {
    CurrentNote,
    LinkedNotes,
    FullVault,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub model: String,
    pub ai_read_scope: AiReadScope,
    pub autosave: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveKeyResult {
    pub provider: String,
    pub saved: bool,
}

#[cfg(test)]
mod tests {
    use super::{AiReadScope, AppSettings};

    #[test]
    fn settings_serialize_to_frontend_camel_case_contract() {
        let settings = AppSettings {
            model: "gpt-4.1-mini".to_string(),
            ai_read_scope: AiReadScope::CurrentNote,
            autosave: true,
        };

        let value = serde_json::to_value(settings).unwrap();

        assert_eq!(value["aiReadScope"], "current_note");
        assert!(value.get("ai_read_scope").is_none());
    }
}
