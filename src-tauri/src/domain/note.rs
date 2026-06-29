use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
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
pub struct NoteContent {
    pub path: String,
    pub content: String,
    pub modified_at: String,
    pub content_hash: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveNoteInput {
    pub vault_id: String,
    pub path: String,
    pub content: String,
    pub base_version: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct SaveResult {
    pub path: String,
    pub content_hash: String,
    pub conflict: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct NoteInfo {
    pub path: String,
    pub title: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DeleteResult {
    pub path: String,
    pub moved_to_trash: bool,
}
