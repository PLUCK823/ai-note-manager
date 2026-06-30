use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AiAction {
    Summarize,
    ExtractTodos,
    RewriteSelection,
    CompressSelection,
    ExpandSelection,
    SuggestTitle,
    SuggestTags,
    SuggestImprovements,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRunInput {
    pub action: AiAction,
    pub note_content: String,
    pub selected_text: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiRunResult {
    pub request_id: String,
    pub output: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyChangeInput {
    pub vault_id: String,
    pub path: String,
    pub replacement: String,
    pub base_version: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyChangeResult {
    pub path: String,
    pub content_hash: String,
}
