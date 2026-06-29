use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    pub kind: FileTreeNodeKind,
    pub children: Vec<FileTreeNode>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FileTreeNodeKind {
    File,
    Folder,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteContent {
    pub path: String,
    pub content: String,
    pub modified_at: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveNoteInput {
    pub vault_id: String,
    pub path: String,
    pub content: String,
    pub base_version: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResult {
    pub path: String,
    pub content_hash: String,
    pub conflict: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteInfo {
    pub path: String,
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteResult {
    pub path: String,
    pub moved_to_trash: bool,
}

#[cfg(test)]
mod tests {
    use super::{NoteContent, SaveResult};

    #[test]
    fn note_payloads_serialize_to_frontend_camel_case_contract() {
        let note = NoteContent {
            path: "README.md".to_string(),
            content: "# Readme".to_string(),
            modified_at: "now".to_string(),
            content_hash: "hash-1".to_string(),
        };
        let save = SaveResult {
            path: "README.md".to_string(),
            content_hash: "hash-2".to_string(),
            conflict: false,
        };

        let note_value = serde_json::to_value(note).unwrap();
        let save_value = serde_json::to_value(save).unwrap();

        assert_eq!(note_value["contentHash"], "hash-1");
        assert_eq!(note_value["modifiedAt"], "now");
        assert!(note_value.get("content_hash").is_none());
        assert_eq!(save_value["contentHash"], "hash-2");
        assert!(save_value.get("content_hash").is_none());
    }
}
