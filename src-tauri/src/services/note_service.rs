use std::fs;
use std::path::{Path, PathBuf};

use sha2::{Digest, Sha256};

use crate::domain::note::{FileTreeNode, FileTreeNodeKind, NoteContent, NoteInfo, SaveResult};
use crate::domain::vault::VaultInfo;
use crate::error::AppError;
use crate::infrastructure::db::Database;

pub struct NoteService;

impl NoteService {
    pub fn scan_markdown_tree(root: impl AsRef<Path>) -> Result<Vec<FileTreeNode>, AppError> {
        let root = root.as_ref();

        if !root.is_dir() {
            return Err(AppError::FileNotFound);
        }

        Self::scan_directory(root, root)
    }

    pub fn read_note(root: impl AsRef<Path>, relative_path: &str) -> Result<NoteContent, AppError> {
        let root = root.as_ref();
        let path = Self::resolve_note_path(root, relative_path)?;
        let content = fs::read_to_string(&path).map_err(|_| AppError::FileReadFailed)?;
        let modified_at = fs::metadata(&path)
            .and_then(|metadata| metadata.modified())
            .map_err(|_| AppError::FileReadFailed)
            .map(|time| format!("{time:?}"))?;

        Ok(NoteContent {
            path: Self::relative_path(root, &path)?,
            content_hash: Self::content_hash(&content),
            content,
            modified_at,
        })
    }

    pub fn save_note(
        root: impl AsRef<Path>,
        relative_path: &str,
        content: &str,
        base_version: &str,
    ) -> Result<SaveResult, AppError> {
        let root = root.as_ref();
        let path = Self::resolve_note_path(root, relative_path)?;
        let current_content = fs::read_to_string(&path).map_err(|_| AppError::FileReadFailed)?;
        let current_hash = Self::content_hash(&current_content);
        let relative_path = Self::relative_path(root, &path)?;

        if !base_version.is_empty() && current_hash != base_version {
            return Ok(SaveResult {
                path: relative_path,
                content_hash: current_hash,
                conflict: true,
                snapshot_path: None,
            });
        }

        let snapshot_path = Self::write_snapshot(root, &relative_path, &current_content)?;
        fs::write(&path, content).map_err(|_| AppError::FileWriteFailed)?;

        Ok(SaveResult {
            path: relative_path,
            content_hash: Self::content_hash(content),
            conflict: false,
            snapshot_path: Some(snapshot_path),
        })
    }

    pub fn create_note(
        root: impl AsRef<Path>,
        parent_path: &str,
        title: &str,
    ) -> Result<NoteInfo, AppError> {
        let root = root.as_ref();
        let parent = Self::resolve_folder_path(root, parent_path)?;
        let title = title.trim();
        if title.is_empty() || title.contains('/') || title.contains('\\') {
            return Err(AppError::FileWriteFailed);
        }

        let file_name = if title.to_lowercase().ends_with(".md") {
            title.to_string()
        } else {
            format!("{title}.md")
        };
        let path = parent.join(file_name);
        if path.exists() {
            return Err(AppError::FileWriteFailed);
        }

        let note_title = title.trim_end_matches(".md").trim();
        let content = format!("# {note_title}\n");
        fs::write(&path, content).map_err(|_| AppError::FileWriteFailed)?;

        Ok(NoteInfo {
            path: Self::relative_path(root, &path)?,
            title: note_title.to_string(),
        })
    }

    pub fn index_markdown_tree(
        database: &Database,
        vault: &VaultInfo,
        tree: &[FileTreeNode],
    ) -> Result<(), AppError> {
        for node in tree {
            if matches!(node.kind, FileTreeNodeKind::File) {
                let note = Self::read_note(&vault.path, &node.path)?;
                database.upsert_note_index(
                    &Self::note_id(&vault.id, &node.path),
                    &vault.id,
                    &node.path,
                    &Self::title_from_content(&note.content, &node.name),
                    note.content.len() as i64,
                    &note.content_hash,
                    &note.content,
                )?;
            }

            Self::index_markdown_tree(database, vault, &node.children)?;
        }

        Ok(())
    }

    fn scan_directory(root: &Path, directory: &Path) -> Result<Vec<FileTreeNode>, AppError> {
        let mut nodes = Vec::new();

        for entry in fs::read_dir(directory).map_err(|_| AppError::FileReadFailed)? {
            let entry = entry.map_err(|_| AppError::FileReadFailed)?;
            let path = entry.path();
            let file_type = entry.file_type().map_err(|_| AppError::FileReadFailed)?;

            if file_type.is_dir() {
                let children = Self::scan_directory(root, &path)?;
                if !children.is_empty() {
                    nodes.push(Self::folder_node(root, path, children)?);
                }
            } else if file_type.is_file() && Self::is_markdown_path(&path) {
                nodes.push(Self::file_node(root, path)?);
            }
        }

        nodes.sort_by(|left, right| match (&left.kind, &right.kind) {
            (FileTreeNodeKind::File, FileTreeNodeKind::Folder) => std::cmp::Ordering::Less,
            (FileTreeNodeKind::Folder, FileTreeNodeKind::File) => std::cmp::Ordering::Greater,
            _ => left.name.to_lowercase().cmp(&right.name.to_lowercase()),
        });

        Ok(nodes)
    }

    fn file_node(root: &Path, path: PathBuf) -> Result<FileTreeNode, AppError> {
        Ok(FileTreeNode {
            name: Self::file_name(&path)?,
            path: Self::relative_path(root, &path)?,
            kind: FileTreeNodeKind::File,
            children: Vec::new(),
        })
    }

    fn folder_node(
        root: &Path,
        path: PathBuf,
        children: Vec<FileTreeNode>,
    ) -> Result<FileTreeNode, AppError> {
        Ok(FileTreeNode {
            name: Self::file_name(&path)?,
            path: Self::relative_path(root, &path)?,
            kind: FileTreeNodeKind::Folder,
            children,
        })
    }

    fn is_markdown_path(path: &Path) -> bool {
        path.extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("md"))
    }

    fn resolve_note_path(root: &Path, relative_path: &str) -> Result<PathBuf, AppError> {
        if !root.is_dir() {
            return Err(AppError::FileNotFound);
        }

        let requested_path = Path::new(relative_path);
        if requested_path.is_absolute()
            || requested_path
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return Err(AppError::PermissionDenied);
        }

        let path = root.join(requested_path);
        if !Self::is_markdown_path(&path) {
            return Err(AppError::FileNotMarkdown);
        }
        if !path.exists() {
            return Err(AppError::FileNotFound);
        }

        Ok(path)
    }

    fn resolve_folder_path(root: &Path, relative_path: &str) -> Result<PathBuf, AppError> {
        if !root.is_dir() {
            return Err(AppError::FileNotFound);
        }

        let requested_path = Path::new(relative_path);
        if requested_path.is_absolute()
            || requested_path
                .components()
                .any(|component| matches!(component, std::path::Component::ParentDir))
        {
            return Err(AppError::PermissionDenied);
        }

        let path = if relative_path.trim().is_empty() {
            root.to_path_buf()
        } else {
            root.join(requested_path)
        };

        if !path.is_dir() {
            return Err(AppError::FileNotFound);
        }

        Ok(path)
    }

    fn content_hash(content: &str) -> String {
        format!("{:x}", Sha256::digest(content.as_bytes()))
    }

    fn note_id(vault_id: &str, path: &str) -> String {
        Self::content_hash(&format!("{vault_id}:{path}"))
    }

    fn title_from_content(content: &str, fallback_name: &str) -> String {
        content
            .lines()
            .map(str::trim)
            .find_map(|line| line.strip_prefix("# ").map(str::trim))
            .filter(|title| !title.is_empty())
            .unwrap_or(fallback_name)
            .to_string()
    }

    fn write_snapshot(root: &Path, relative_path: &str, content: &str) -> Result<String, AppError> {
        let snapshot_root = root.join(".ai-note-manager").join("snapshots");
        fs::create_dir_all(&snapshot_root).map_err(|_| AppError::FileWriteFailed)?;
        let snapshot_name = format!(
            "{}-{}.md",
            Self::content_hash(relative_path),
            Self::content_hash(content)
        );
        let snapshot_path = snapshot_root.join(snapshot_name);
        fs::write(&snapshot_path, content).map_err(|_| AppError::FileWriteFailed)?;
        Self::relative_path(root, &snapshot_path)
    }

    fn file_name(path: &Path) -> Result<String, AppError> {
        path.file_name()
            .and_then(|name| name.to_str())
            .map(ToString::to_string)
            .ok_or(AppError::FileReadFailed)
    }

    fn relative_path(root: &Path, path: &Path) -> Result<String, AppError> {
        path.strip_prefix(root)
            .map_err(|_| AppError::PermissionDenied)
            .map(|path| path.to_string_lossy().replace('\\', "/"))
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::NoteService;

    #[test]
    fn scans_markdown_files_into_tree_and_ignores_other_files() {
        let root =
            std::env::temp_dir().join(format!("ai-note-manager-scan-{}", std::process::id()));
        let nested = root.join("projects");
        fs::create_dir_all(&nested).unwrap();
        fs::write(root.join("README.md"), "# Readme").unwrap();
        fs::write(root.join("ignore.txt"), "ignore").unwrap();
        fs::write(nested.join("Plan.MD"), "# Plan").unwrap();

        let tree = NoteService::scan_markdown_tree(&root).unwrap();

        fs::remove_dir_all(&root).unwrap();

        assert_eq!(tree.len(), 2);
        assert_eq!(tree[0].name, "README.md");
        assert_eq!(tree[0].path, "README.md");
        assert_eq!(tree[1].name, "projects");
        assert_eq!(tree[1].children.len(), 1);
        assert_eq!(tree[1].children[0].name, "Plan.MD");
        assert_eq!(tree[1].children[0].path, "projects/Plan.MD");
    }

    #[test]
    fn reads_markdown_note_content_with_hash() {
        let root = test_root("read");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("Note.md"), "# Note\n\nBody").unwrap();

        let note = NoteService::read_note(&root, "Note.md").unwrap();

        fs::remove_dir_all(&root).unwrap();

        assert_eq!(note.path, "Note.md");
        assert_eq!(note.content, "# Note\n\nBody");
        assert!(!note.content_hash.is_empty());
    }

    #[test]
    fn saves_markdown_note_content_and_rejects_path_escape() {
        let root = test_root("save");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("Note.md"), "# Note").unwrap();
        let base_hash = NoteService::read_note(&root, "Note.md")
            .unwrap()
            .content_hash;

        let result = NoteService::save_note(&root, "Note.md", "# Updated", &base_hash).unwrap();
        let escaped = NoteService::save_note(&root, "../outside.md", "bad", "old-hash");

        let saved_content = fs::read_to_string(root.join("Note.md")).unwrap();

        assert_eq!(saved_content, "# Updated");
        assert_eq!(result.path, "Note.md");
        assert!(!result.content_hash.is_empty());
        assert!(result.snapshot_path.is_some());
        assert!(escaped.is_err());

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn returns_conflict_without_overwriting_when_base_hash_is_stale() {
        let root = test_root("conflict");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("Note.md"), "# Original").unwrap();
        let base_hash = NoteService::read_note(&root, "Note.md")
            .unwrap()
            .content_hash;
        fs::write(root.join("Note.md"), "# External edit").unwrap();

        let result = NoteService::save_note(&root, "Note.md", "# User edit", &base_hash).unwrap();
        let content_after_save = fs::read_to_string(root.join("Note.md")).unwrap();

        assert!(result.conflict);
        assert_eq!(content_after_save, "# External edit");
        assert_eq!(result.snapshot_path, None);

        fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn creates_markdown_note_in_parent_folder_and_rejects_path_escape() {
        let root = test_root("create");
        let nested = root.join("projects");
        fs::create_dir_all(&nested).unwrap();

        let note = NoteService::create_note(&root, "projects", "Launch Plan").unwrap();
        let escaped = NoteService::create_note(&root, "../outside", "Bad");

        let content = fs::read_to_string(root.join("projects").join("Launch Plan.md")).unwrap();

        assert_eq!(note.path, "projects/Launch Plan.md");
        assert_eq!(note.title, "Launch Plan");
        assert_eq!(content, "# Launch Plan\n");
        assert!(escaped.is_err());

        fs::remove_dir_all(&root).unwrap();
    }

    fn test_root(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("ai-note-manager-{}-{}", name, std::process::id()))
    }
}
