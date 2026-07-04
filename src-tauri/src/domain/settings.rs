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
    #[serde(default = "default_sync_preview_scroll")]
    pub sync_preview_scroll: bool,
    #[serde(default = "default_left_pane_width")]
    pub left_pane_width: u32,
    #[serde(default = "default_right_pane_width")]
    pub right_pane_width: u32,
    #[serde(default = "default_preview_pane_width")]
    pub preview_pane_width: u32,
    #[serde(default = "default_true")]
    pub left_pane_visible: bool,
    #[serde(default = "default_true")]
    pub right_pane_visible: bool,
    #[serde(default)]
    pub ai_pane_on_left: bool,
}

fn default_true() -> bool {
    true
}

fn default_sync_preview_scroll() -> bool {
    true
}

fn default_left_pane_width() -> u32 {
    288
}

fn default_right_pane_width() -> u32 {
    336
}

fn default_preview_pane_width() -> u32 {
    360
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
            sync_preview_scroll: true,
            left_pane_width: 288,
            right_pane_width: 336,
            preview_pane_width: 360,
            left_pane_visible: true,
            right_pane_visible: true,
            ai_pane_on_left: false,
        };

        let value = serde_json::to_value(settings).unwrap();

        assert_eq!(value["aiReadScope"], "current_note");
        assert_eq!(value["syncPreviewScroll"], true);
        assert_eq!(value["leftPaneWidth"], 288);
        assert_eq!(value["rightPaneWidth"], 336);
        assert_eq!(value["previewPaneWidth"], 360);
        assert_eq!(value["leftPaneVisible"], true);
        assert_eq!(value["rightPaneVisible"], true);
        assert_eq!(value["aiPaneOnLeft"], false);
        assert!(value.get("ai_read_scope").is_none());
        assert!(value.get("sync_preview_scroll").is_none());
        assert!(value.get("left_pane_width").is_none());
        assert!(value.get("right_pane_width").is_none());
        assert!(value.get("preview_pane_width").is_none());
        assert!(value.get("left_pane_visible").is_none());
        assert!(value.get("right_pane_visible").is_none());
        assert!(value.get("ai_pane_on_left").is_none());
    }
}
