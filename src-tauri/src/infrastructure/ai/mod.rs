use serde_json::{json, Value};

use crate::domain::ai::AiRunResult;
use crate::error::AppError;

pub struct AiClient;

pub struct OpenAiResponsesClient {
    http: reqwest::Client,
}

impl Default for OpenAiResponsesClient {
    fn default() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }
}

impl OpenAiResponsesClient {
    const RESPONSES_URL: &'static str = "https://api.openai.com/v1/responses";

    pub async fn run(
        &self,
        api_key: &str,
        model: &str,
        input: &str,
    ) -> Result<AiRunResult, AppError> {
        let response = self
            .http
            .post(Self::RESPONSES_URL)
            .bearer_auth(api_key)
            .json(&Self::request_body(model, input))
            .send()
            .await
            .map_err(|_| AppError::AiRequestFailed)?;

        if !response.status().is_success() {
            return Err(AppError::AiRequestFailed);
        }

        let payload = response
            .json::<Value>()
            .await
            .map_err(|_| AppError::AiRequestFailed)?;
        Self::parse_output(&payload)
    }

    fn request_body(model: &str, input: &str) -> Value {
        json!({
            "model": model,
            "input": input,
        })
    }

    fn parse_output(payload: &Value) -> Result<AiRunResult, AppError> {
        let request_id = payload
            .get("id")
            .and_then(Value::as_str)
            .ok_or(AppError::AiRequestFailed)?
            .to_string();
        let output = payload
            .get("output_text")
            .and_then(Value::as_str)
            .ok_or(AppError::AiRequestFailed)?
            .to_string();

        Ok(AiRunResult { request_id, output })
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::OpenAiResponsesClient;

    #[test]
    fn builds_responses_request_with_model_and_input() {
        let body = OpenAiResponsesClient::request_body("gpt-4.1-mini", "Summarize this note");

        assert_eq!(body["model"], "gpt-4.1-mini");
        assert_eq!(body["input"], "Summarize this note");
    }

    #[test]
    fn parses_output_text_from_responses_payload() {
        let payload = json!({
            "id": "resp_123",
            "output_text": "## Summary\n\nShip it."
        });

        let output = OpenAiResponsesClient::parse_output(&payload).unwrap();

        assert_eq!(output.request_id, "resp_123");
        assert_eq!(output.output, "## Summary\n\nShip it.");
    }
}
