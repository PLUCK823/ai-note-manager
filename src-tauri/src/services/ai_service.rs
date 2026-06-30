use crate::domain::ai::{AiAction, AiRunInput, AiRunResult};
use crate::error::AppError;

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
    use crate::domain::ai::{AiAction, AiRunInput};

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
}
