use std::path::Path;

use crate::domain::ai::{AiAction, AiRunInput, AiRunResult, ApplyChangeInput, ApplyChangeResult};
use crate::error::AppError;
use crate::services::note_service::NoteService;

pub struct AiService;

impl AiService {
    pub fn run_action(input: AiRunInput) -> Result<AiRunResult, AppError> {
        let source = input
            .selected_text
            .as_deref()
            .filter(|text| !text.trim().is_empty())
            .unwrap_or(&input.note_content);
        let output = match input.action {
            AiAction::Summarize => Self::summarize(source),
            AiAction::ExtractTodos => Self::extract_todos(source),
            AiAction::SuggestTitle => Self::suggest_title(source),
            AiAction::SuggestTags => Self::suggest_tags(source),
            AiAction::SuggestImprovements => Self::suggest_improvements(source),
            AiAction::RewriteSelection
            | AiAction::CompressSelection
            | AiAction::ExpandSelection => {
                format!("## Draft\n\n{}", source.trim())
            }
        };

        Ok(AiRunResult {
            request_id: format!("local-{}", Self::content_fingerprint(source)),
            output,
        })
    }

    pub fn apply_change(
        root: impl AsRef<Path>,
        input: ApplyChangeInput,
    ) -> Result<ApplyChangeResult, AppError> {
        let save_result =
            NoteService::save_note(root, &input.path, &input.replacement, &input.base_version)?;

        if save_result.conflict {
            return Err(AppError::FileConflict);
        }

        Ok(ApplyChangeResult {
            path: save_result.path,
            content_hash: save_result.content_hash,
        })
    }

    fn summarize(content: &str) -> String {
        let first_lines = content
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .take(3)
            .collect::<Vec<_>>()
            .join(" ");

        format!("## Summary\n\n{}", first_lines)
    }

    fn extract_todos(content: &str) -> String {
        let todos = content
            .lines()
            .map(str::trim)
            .filter(|line| line.starts_with("- [ ]") || line.to_lowercase().contains("todo"))
            .map(|line| format!("- {}", line.trim_start_matches("- ").trim()))
            .collect::<Vec<_>>();

        if todos.is_empty() {
            "## Todos\n\n- No explicit todos found.".to_string()
        } else {
            format!("## Todos\n\n{}", todos.join("\n"))
        }
    }

    fn suggest_title(content: &str) -> String {
        let title = content
            .lines()
            .map(str::trim)
            .find(|line| line.starts_with("# "))
            .map(|line| line.trim_start_matches("# ").trim())
            .filter(|title| !title.is_empty())
            .unwrap_or("Untitled note");

        format!("## Suggested title\n\n{}", title)
    }

    fn suggest_tags(content: &str) -> String {
        let mut tags = Vec::new();
        let lower = content.to_lowercase();
        for (needle, tag) in [
            ("rust", "rust"),
            ("tauri", "tauri"),
            ("ai", "ai"),
            ("todo", "todo"),
            ("mvp", "mvp"),
        ] {
            if lower.contains(needle) {
                tags.push(format!("- #{tag}"));
            }
        }

        if tags.is_empty() {
            "## Suggested tags\n\n- #notes".to_string()
        } else {
            format!("## Suggested tags\n\n{}", tags.join("\n"))
        }
    }

    fn suggest_improvements(content: &str) -> String {
        let word_count = content.split_whitespace().count();
        format!(
            "## Improvements\n\n- Clarify the main takeaway.\n- Add concrete next steps.\n- Current length: {word_count} words."
        )
    }

    fn content_fingerprint(content: &str) -> u64 {
        content.bytes().fold(5381_u64, |hash, byte| {
            hash.wrapping_mul(33) ^ u64::from(byte)
        })
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use crate::domain::ai::{AiAction, AiRunInput, ApplyChangeInput};
    use crate::services::note_service::NoteService;

    use super::AiService;

    #[test]
    fn summarizes_current_note_without_external_api() {
        let result = AiService::run_action(AiRunInput {
            action: AiAction::Summarize,
            note_content: "# Plan\n\nShip the MVP.\nTrack open risks.".to_string(),
            selected_text: None,
        })
        .unwrap();

        assert!(result.output.contains("Summary"));
        assert!(result.output.contains("Ship the MVP"));
        assert!(!result.request_id.is_empty());
    }

    #[test]
    fn applies_confirmed_change_with_note_conflict_protection() {
        let root = test_root("apply-confirmed-change");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("Note.md"), "# Plan\n\nShip the MVP.").unwrap();
        let note = NoteService::read_note(&root, "Note.md").unwrap();

        let result = AiService::apply_change(
            &root,
            ApplyChangeInput {
                vault_id: "vault:test".to_string(),
                path: "Note.md".to_string(),
                replacement: "# Plan\n\nShip the MVP with milestones.".to_string(),
                base_version: note.content_hash,
            },
        )
        .unwrap();

        assert_eq!(result.path, "Note.md");
        assert_eq!(
            fs::read_to_string(root.join("Note.md")).unwrap(),
            "# Plan\n\nShip the MVP with milestones."
        );
        assert!(!result.content_hash.is_empty());
    }

    fn test_root(name: &str) -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!(
            "ai-note-manager-ai-service-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&root);
        root
    }
}
