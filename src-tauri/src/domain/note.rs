use serde::{Deserialize, Serialize};
use std::path::Path;

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
pub struct NoteDiskStatus {
    pub path: String,
    pub modified_at: String,
    pub content_hash: String,
    pub changed: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFileEvent {
    pub vault_id: String,
    pub path: String,
    pub kind: VaultFileEventKind,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum VaultFileEventKind {
    Created,
    Modified,
    Removed,
    Renamed,
}

impl VaultFileEvent {
    pub fn from_path(
        vault_id: &str,
        vault_root: &Path,
        path: &Path,
        kind: VaultFileEventKind,
    ) -> Option<Self> {
        if path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_none_or(|extension| !extension.eq_ignore_ascii_case("md"))
        {
            return None;
        }

        let relative_path = path.strip_prefix(vault_root).ok()?;
        let path = relative_path
            .components()
            .map(|component| component.as_os_str().to_string_lossy())
            .collect::<Vec<_>>()
            .join("/");

        if path.is_empty() {
            return None;
        }

        Some(Self {
            vault_id: vault_id.to_string(),
            path,
            kind,
        })
    }
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
    pub snapshot_path: Option<String>,
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
    use super::{NoteContent, NoteDiskStatus, SaveResult, VaultFileEvent, VaultFileEventKind};

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
            snapshot_path: Some(".ai-note-manager/snapshots/hash.md".to_string()),
        };
        let status = NoteDiskStatus {
            path: "README.md".to_string(),
            modified_at: "later".to_string(),
            content_hash: "hash-3".to_string(),
            changed: true,
        };
        let file_event = VaultFileEvent {
            vault_id: "vault:/tmp/notes".to_string(),
            path: "README.md".to_string(),
            kind: VaultFileEventKind::Modified,
        };

        let note_value = serde_json::to_value(note).unwrap();
        let save_value = serde_json::to_value(save).unwrap();
        let status_value = serde_json::to_value(status).unwrap();
        let file_event_value = serde_json::to_value(file_event).unwrap();

        assert_eq!(note_value["contentHash"], "hash-1");
        assert_eq!(note_value["modifiedAt"], "now");
        assert!(note_value.get("content_hash").is_none());
        assert_eq!(save_value["contentHash"], "hash-2");
        assert_eq!(
            save_value["snapshotPath"],
            ".ai-note-manager/snapshots/hash.md"
        );
        assert!(save_value.get("content_hash").is_none());
        assert_eq!(status_value["contentHash"], "hash-3");
        assert_eq!(status_value["modifiedAt"], "later");
        assert_eq!(status_value["changed"], true);
        assert_eq!(file_event_value["vaultId"], "vault:/tmp/notes");
        assert_eq!(file_event_value["path"], "README.md");
        assert_eq!(file_event_value["kind"], "modified");
    }
}
