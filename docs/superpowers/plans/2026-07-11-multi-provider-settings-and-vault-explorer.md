# Multi-provider Settings and Vault Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add provider-aware AI configuration and a root-level vault Explorer without changing the existing note safety boundaries.

**Architecture:** Persist provider identity in `AppSettings`, route streaming requests to a provider client selected in the Tauri command layer, and keep API keys in provider-named keyring entries. `FileTree` owns transient root/create UI and delegates all filesystem writes to existing note commands.

**Tech Stack:** React 19, TanStack Query, Lucide React, Tauri 2, Rust, reqwest, Vitest, Playwright.

---

### Task 1: Define the provider persistence and streaming contract

**Files:**

- Modify: `src-tauri/src/domain/settings.rs`
- Modify: `src-tauri/src/services/settings_service.rs`
- Modify: `src-tauri/src/infrastructure/ai/mod.rs`
- Modify: `src-tauri/src/commands/ai.rs`

- [x] Add `AiProvider` with `Openai` and `Deepseek`, camel-case JSON serialization, and a default OpenAI backfill function.
- [x] Add a Rust regression test that deserializes DeepSeek settings and serializes `provider: "deepseek"` to the frontend contract.
- [x] Add `DeepSeekChatCompletionsClient` using `POST https://api.deepseek.com/chat/completions`, bearer auth, a `messages` payload, and SSE `choices[].delta.content` parsing.
- [x] Add a test covering the DeepSeek streaming body and `[DONE]`-terminated delta stream.
- [x] Route `run_ai_action` by `settings.provider`, looking up the key with `provider.key_name()` and retaining local fallback for missing keys.

### Task 2: Simplify the settings dialog

**Files:**

- Modify: `src/features/settings/types.ts`
- Modify: `src/features/settings/components/SettingsPage.tsx`
- Modify: `src/features/settings/components/SettingsPage.test.tsx`

- [x] Add the `AiProvider` frontend contract.
- [x] Add an AI provider select, provider model suggestions, and provider-specific API-key save behavior.
- [x] Remove the three workspace layout checkboxes without removing their persisted fields, which remain controlled by their direct workspace actions.
- [x] Add a failing then passing settings test for DeepSeek save behavior and the removed controls.

### Task 3: Build the vault-root Explorer controls

**Files:**

- Modify: `src/features/notes/api.ts`
- Modify: `src/features/notes/components/FileTree.tsx`
- Modify: `src/features/notes/components/FileTree.test.tsx`
- Modify: `src/shared/styles/globals.css`

- [x] Add frontend wrappers for existing `create_note` and `create_folder` commands.
- [x] Render the selected vault name as the Explorer root plus icon-only New File, New Folder, Refresh, and Collapse All buttons.
- [x] Provide inline root-level creation forms; after success invalidate the exact vault tree query.
- [x] Add focused tests for root controls, root-level creation, refresh, and collapsing root contents.

### Task 4: Verify user workflows and documentation

**Files:**

- Modify: `e2e/smoke.spec.ts`
- Modify: `PROJECT_STATUS.md`

- [x] Extend Playwright mocks and workflow assertions for provider selection and root-level file creation.
- [x] Run frontend, browser, Rust formatting, lint, and test commands.
- [x] Record final completion and verification evidence in project status.
