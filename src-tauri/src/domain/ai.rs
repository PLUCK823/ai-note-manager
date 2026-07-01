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
pub struct AiStreamStarted {
    pub request_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamChunk {
    pub request_id: String,
    pub chunk: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamDone {
    pub request_id: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStreamError {
    pub request_id: String,
    pub message: String,
}

#[cfg(test)]
mod streaming_contract_tests {
    use serde_json::json;

    use super::{AiStreamChunk, AiStreamDone, AiStreamError, AiStreamStarted};

    #[test]
    fn stream_payloads_serialize_to_frontend_camel_case_contract() {
        let started = serde_json::to_value(AiStreamStarted {
            request_id: "ai-1".to_string(),
        })
        .unwrap();
        let chunk = serde_json::to_value(AiStreamChunk {
            request_id: "ai-1".to_string(),
            chunk: "hello".to_string(),
        })
        .unwrap();
        let done = serde_json::to_value(AiStreamDone {
            request_id: "ai-1".to_string(),
        })
        .unwrap();
        let error = serde_json::to_value(AiStreamError {
            request_id: "ai-1".to_string(),
            message: "failed".to_string(),
        })
        .unwrap();

        assert_eq!(started, json!({ "requestId": "ai-1" }));
        assert_eq!(chunk, json!({ "requestId": "ai-1", "chunk": "hello" }));
        assert_eq!(done, json!({ "requestId": "ai-1" }));
        assert_eq!(error, json!({ "requestId": "ai-1", "message": "failed" }));
    }
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
