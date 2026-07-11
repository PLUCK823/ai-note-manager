use serde_json::{json, Value};

use crate::domain::ai::AiRunResult;
use crate::error::AppError;

pub struct AiClient;

pub struct OpenAiResponsesClient {
    http: reqwest::Client,
}

pub struct DeepSeekChatCompletionsClient {
    http: reqwest::Client,
}

impl Default for DeepSeekChatCompletionsClient {
    fn default() -> Self {
        Self {
            http: reqwest::Client::new(),
        }
    }
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

    pub async fn stream_text(
        &self,
        api_key: &str,
        model: &str,
        input: &str,
        mut on_delta: impl FnMut(&str) -> Result<(), AppError>,
    ) -> Result<(), AppError> {
        let mut response = self
            .http
            .post(Self::RESPONSES_URL)
            .bearer_auth(api_key)
            .json(&Self::streaming_request_body(model, input))
            .send()
            .await
            .map_err(|_| AppError::AiRequestFailed)?;

        if !response.status().is_success() {
            return Err(AppError::AiRequestFailed);
        }

        let mut buffer = String::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| AppError::AiRequestFailed)?
        {
            buffer.push_str(&String::from_utf8_lossy(&chunk).replace("\r\n", "\n"));
            while let Some(record_end) = buffer.find("\n\n") {
                let record = buffer[..record_end].to_string();
                buffer.drain(..record_end + 2);
                for delta in Self::parse_sse_text_deltas(&record)? {
                    on_delta(&delta)?;
                }
            }
        }

        if !buffer.trim().is_empty() {
            for delta in Self::parse_sse_text_deltas(&buffer)? {
                on_delta(&delta)?;
            }
        }

        Ok(())
    }

    fn request_body(model: &str, input: &str) -> Value {
        json!({
            "model": model,
            "input": input,
        })
    }

    fn streaming_request_body(model: &str, input: &str) -> Value {
        json!({
            "model": model,
            "input": input,
            "stream": true,
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

    fn parse_sse_text_deltas(records: &str) -> Result<Vec<String>, AppError> {
        records
            .split("\n\n")
            .filter_map(Self::parse_sse_text_delta)
            .collect()
    }

    fn parse_sse_text_delta(record: &str) -> Option<Result<String, AppError>> {
        let mut event = None;
        let mut data = String::new();

        for line in record.lines() {
            if let Some(value) = line.strip_prefix("event:") {
                event = Some(value.trim());
                continue;
            }

            if let Some(value) = line.strip_prefix("data:") {
                data.push_str(value.trim_start());
            }
        }

        if event != Some("response.output_text.delta") {
            return None;
        }

        Some(
            serde_json::from_str::<Value>(&data)
                .map_err(|_| AppError::AiRequestFailed)
                .and_then(|payload| {
                    payload
                        .get("delta")
                        .and_then(Value::as_str)
                        .map(ToString::to_string)
                        .ok_or(AppError::AiRequestFailed)
                }),
        )
    }
}

impl DeepSeekChatCompletionsClient {
    const CHAT_COMPLETIONS_URL: &'static str = "https://api.deepseek.com/chat/completions";

    pub async fn stream_text(
        &self,
        api_key: &str,
        model: &str,
        input: &str,
        mut on_delta: impl FnMut(&str) -> Result<(), AppError>,
    ) -> Result<(), AppError> {
        let mut response = self
            .http
            .post(Self::CHAT_COMPLETIONS_URL)
            .bearer_auth(api_key)
            .json(&Self::streaming_request_body(model, input))
            .send()
            .await
            .map_err(|_| AppError::AiRequestFailed)?;

        if !response.status().is_success() {
            return Err(AppError::AiRequestFailed);
        }

        let mut buffer = String::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|_| AppError::AiRequestFailed)?
        {
            buffer.push_str(&String::from_utf8_lossy(&chunk).replace("\r\n", "\n"));
            while let Some(record_end) = buffer.find("\n\n") {
                let record = buffer[..record_end].to_string();
                buffer.drain(..record_end + 2);
                for delta in Self::parse_sse_text_deltas(&record)? {
                    on_delta(&delta)?;
                }
            }
        }

        if !buffer.trim().is_empty() {
            for delta in Self::parse_sse_text_deltas(&buffer)? {
                on_delta(&delta)?;
            }
        }

        Ok(())
    }

    fn streaming_request_body(model: &str, input: &str) -> Value {
        json!({
            "model": model,
            "messages": [{ "role": "user", "content": input }],
            "stream": true,
        })
    }

    fn parse_sse_text_deltas(records: &str) -> Result<Vec<String>, AppError> {
        records
            .split("\n\n")
            .filter_map(|record| {
                let data = record
                    .lines()
                    .filter_map(|line| line.strip_prefix("data:"))
                    .map(str::trim_start)
                    .collect::<String>();
                if data.is_empty() || data == "[DONE]" {
                    return None;
                }

                Some(
                    serde_json::from_str::<Value>(&data)
                        .map_err(|_| AppError::AiRequestFailed)
                        .map(|payload| {
                            payload["choices"]
                                .as_array()
                                .into_iter()
                                .flatten()
                                .filter_map(|choice| {
                                    choice["delta"]["content"]
                                        .as_str()
                                        .filter(|content| !content.is_empty())
                                        .map(ToString::to_string)
                                })
                                .collect::<Vec<_>>()
                        }),
                )
            })
            .collect::<Result<Vec<Vec<String>>, AppError>>()
            .map(|groups| groups.into_iter().flatten().collect())
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{DeepSeekChatCompletionsClient, OpenAiResponsesClient};

    #[test]
    fn builds_responses_request_with_model_and_input() {
        let body = OpenAiResponsesClient::request_body("gpt-4.1-mini", "Summarize this note");

        assert_eq!(body["model"], "gpt-4.1-mini");
        assert_eq!(body["input"], "Summarize this note");
    }

    #[test]
    fn builds_streaming_responses_request_with_model_and_input() {
        let body =
            OpenAiResponsesClient::streaming_request_body("gpt-4.1-mini", "Summarize this note");

        assert_eq!(body["model"], "gpt-4.1-mini");
        assert_eq!(body["input"], "Summarize this note");
        assert_eq!(body["stream"], true);
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

    #[test]
    fn parses_output_text_deltas_from_responses_sse_records() {
        let records = [
            "event: response.created\n",
            "data: {\"type\":\"response.created\"}\n\n",
            "event: response.output_text.delta\n",
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\"Hello\"}\n\n",
            "event: response.output_text.delta\n",
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\" world\"}\n\n",
            "event: response.completed\n",
            "data: {\"type\":\"response.completed\"}\n\n",
        ]
        .join("");

        let deltas = OpenAiResponsesClient::parse_sse_text_deltas(&records).unwrap();

        assert_eq!(deltas, vec!["Hello".to_string(), " world".to_string()]);
    }

    #[test]
    fn builds_deepseek_chat_completion_request_and_parses_stream_deltas() {
        let body = DeepSeekChatCompletionsClient::streaming_request_body(
            "deepseek-v4-flash",
            "Summarize this note",
        );
        let records = [
            "data: {\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\" world\"}}]}\n\n",
            "data: [DONE]\n\n",
        ]
        .join("");

        assert_eq!(body["model"], "deepseek-v4-flash");
        assert_eq!(body["stream"], true);
        assert_eq!(body["messages"][0]["role"], "user");
        assert_eq!(
            DeepSeekChatCompletionsClient::parse_sse_text_deltas(&records).unwrap(),
            vec!["Hello".to_string(), " world".to_string()]
        );
    }
}
