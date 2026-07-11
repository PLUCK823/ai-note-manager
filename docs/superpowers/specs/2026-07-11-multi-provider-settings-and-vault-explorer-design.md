# Multi-provider Settings and Vault Explorer Design

## Goal

Simplify the settings dialog, support OpenAI and DeepSeek as independently configured AI providers, and make the selected vault visible and manageable as a VS Code-style Explorer root.

## Scope

- Remove the three layout checkboxes from settings: file navigation visibility, AI visibility, and AI placement.
- Persist an AI provider selection alongside the model name.
- Store API keys by provider in the system credential store.
- Support OpenAI Responses streaming and DeepSeek OpenAI-compatible Chat Completions streaming.
- Render the selected vault name as the Explorer root.
- Add root-level New File, New Folder, Refresh, and Collapse All actions.

## Provider Contract

`AppSettings` stores `provider` as `openai` or `deepseek` and defaults it to `openai` when loading older settings files. The model stays editable so a user can supply a supported provider model name. The settings UI offers current defaults: `gpt-4.1-mini` and `gpt-4.1` for OpenAI; `deepseek-v4-flash` and `deepseek-v4-pro` for DeepSeek.

The OpenAI provider keeps the existing Responses API implementation. DeepSeek uses `https://api.deepseek.com/chat/completions` with a streaming `messages` request. Each provider reads its own keyring entry, named `openai` or `deepseek`; no key is persisted in `settings.json`. Missing keys continue to use deterministic local AI output for the local workflow and desktop smoke test.

## Explorer Contract

The Explorer renders `VaultInfo.name` as a root disclosure control. Its four icon actions operate only on the active vault root:

- New File creates a Markdown note through `create_note` with an empty parent path.
- New Folder creates a directory through `create_folder` with an empty parent path.
- Refresh refetches the Markdown tree query.
- Collapse All hides the root contents while leaving the root and actions available.

Existing backend path validation remains the authority for all creation operations. The tree invalidates its query after a successful create, so server-side scan ordering remains the rendered source of truth.

## Testing

- Rust tests verify the provider serialization/backfill contract and DeepSeek request/SSE parsing.
- Settings tests verify provider, model, and provider-specific key saving while layout options are absent.
- File tree tests verify the root, four controls, root-level file creation, collapse, and refresh.
- Playwright verifies the configuration UI and an Explorer root-level file create through mocked Tauri commands.
