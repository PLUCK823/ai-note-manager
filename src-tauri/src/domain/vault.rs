use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultInfo {
    pub id: String,
    pub path: String,
    pub name: String,
    pub last_opened_at: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::VaultInfo;

    #[test]
    fn serializes_to_frontend_camel_case_contract() {
        let vault = VaultInfo {
            id: "vault:/tmp/notes".to_string(),
            path: "/tmp/notes".to_string(),
            name: "notes".to_string(),
            last_opened_at: None,
        };

        let value = serde_json::to_value(vault).unwrap();

        assert_eq!(value["lastOpenedAt"], serde_json::Value::Null);
        assert!(value.get("last_opened_at").is_none());
    }
}
