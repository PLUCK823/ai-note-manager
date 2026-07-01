use std::path::{Path, PathBuf};

use notify::event::{ModifyKind, RenameMode};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

use crate::domain::note::{VaultFileEvent, VaultFileEventKind};
use crate::error::AppError;

pub struct FileSystem;

pub const VAULT_FILE_CHANGED_EVENT: &str = "vault:file-changed";

pub struct VaultWatcher {
    _watcher: RecommendedWatcher,
}

impl VaultWatcher {
    pub fn new(
        vault_id: String,
        vault_root: PathBuf,
        emit: impl Fn(VaultFileEvent) + Send + 'static,
    ) -> Result<Self, AppError> {
        let watch_root = vault_root.clone();
        let mut watcher = RecommendedWatcher::new(
            move |result: notify::Result<Event>| {
                let Ok(event) = result else {
                    return;
                };

                for payload in vault_file_events_from_notify_event(&vault_id, &vault_root, &event) {
                    emit(payload);
                }
            },
            Config::default(),
        )
        .map_err(|_| AppError::FileWatchFailed)?;

        watcher
            .watch(&watch_root, RecursiveMode::Recursive)
            .map_err(|_| AppError::FileWatchFailed)?;

        Ok(Self { _watcher: watcher })
    }
}

fn vault_file_events_from_notify_event(
    vault_id: &str,
    vault_root: &Path,
    event: &Event,
) -> Vec<VaultFileEvent> {
    let Some(kind) = file_event_kind(&event.kind) else {
        return Vec::new();
    };

    event
        .paths
        .iter()
        .filter_map(|path| VaultFileEvent::from_path(vault_id, vault_root, path, kind.clone()))
        .collect()
}

fn file_event_kind(event_kind: &EventKind) -> Option<VaultFileEventKind> {
    match event_kind {
        EventKind::Create(_) => Some(VaultFileEventKind::Created),
        EventKind::Modify(ModifyKind::Name(RenameMode::Any | RenameMode::Both)) => {
            Some(VaultFileEventKind::Renamed)
        }
        EventKind::Modify(_) => Some(VaultFileEventKind::Modified),
        EventKind::Remove(_) => Some(VaultFileEventKind::Removed),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use crate::domain::note::{VaultFileEvent, VaultFileEventKind};
    use std::path::PathBuf;

    #[test]
    fn builds_relative_markdown_event_payload_inside_vault() {
        let root = PathBuf::from("/Users/test/notes");
        let path = root.join("Daily").join("Plan.md");

        let event = VaultFileEvent::from_path(
            "vault:/Users/test/notes",
            &root,
            &path,
            VaultFileEventKind::Modified,
        )
        .unwrap();

        assert_eq!(event.vault_id, "vault:/Users/test/notes");
        assert_eq!(event.path, "Daily/Plan.md");
        assert_eq!(event.kind, VaultFileEventKind::Modified);
    }

    #[test]
    fn ignores_non_markdown_and_outside_vault_paths() {
        let root = PathBuf::from("/Users/test/notes");

        assert!(VaultFileEvent::from_path(
            "vault:/Users/test/notes",
            &root,
            &root.join("image.png"),
            VaultFileEventKind::Modified,
        )
        .is_none());
        assert!(VaultFileEvent::from_path(
            "vault:/Users/test/notes",
            &root,
            &PathBuf::from("/Users/test/other/Note.md"),
            VaultFileEventKind::Modified,
        )
        .is_none());
    }
}
