use std::fs;
use std::path::{Path, PathBuf};

use crate::domain::note::{FileTreeNode, FileTreeNodeKind};
use crate::error::AppError;

pub struct NoteService;

impl NoteService {
    pub fn scan_markdown_tree(root: impl AsRef<Path>) -> Result<Vec<FileTreeNode>, AppError> {
        let root = root.as_ref();

        if !root.is_dir() {
            return Err(AppError::FileNotFound);
        }

        Self::scan_directory(root, root)
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
}
