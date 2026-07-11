# Confirmed AI Workspace Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make provider failures visible and add a workspace-scoped AI plan/review/apply workflow.

**Architecture:** The frontend represents a provider stream as a durable request state that can receive chunks or terminal events in either order. The backend turns an LLM response into a typed plan but keeps all filesystem operations behind `NoteService` and an explicit apply command. The UI presents the plan before it calls that apply command.

**Tech Stack:** React 19, Zustand, TanStack Query, Tauri 2, Rust, reqwest, Vitest, Playwright.

---

### Task 1: Repair provider stream terminal handling

**Files:**

- Modify: `src/features/ai/aiState.ts`
- Modify: `src/features/ai/components/AiActionBar.tsx`
- Modify: `src/features/ai/components/AiResultPreview.tsx`
- Test: `src/features/ai/components/AiSidebar.test.tsx`

- [x] Add a failing early `ai:error` regression case.
- [x] Preserve error messages, accept terminal events before a backend request id, and prevent late ids from replacing terminal state.
- [x] Render provider-aware user-facing failure messages.

### Task 2: Add provider verification and stable DeepSeek output

**Files:**

- Modify: `src-tauri/src/commands/ai.rs`
- Modify: `src-tauri/src/infrastructure/ai/mod.rs`
- Modify: `src/features/settings/api.ts`
- Modify: `src/features/settings/components/SettingsPage.tsx`

- [x] Add a connection check using the selected provider's keyring entry and model.
- [x] Disable DeepSeek thinking mode for normal streamed content requests.
- [x] Assert the DeepSeek request body includes the chosen thinking mode.

### Task 3: Define and execute a restricted workspace plan

**Files:**

- Modify: `src-tauri/src/domain/ai.rs`
- Modify: `src-tauri/src/commands/ai.rs`
- Modify: `src-tauri/src/lib.rs`

- [x] Define serializable workspace plan and operation contracts.
- [x] Generate a plan from the vault Markdown manifest, active path, selected text, and instruction.
- [x] Apply only submitted operations through existing read/search/create/save/delete boundaries.

### Task 4: Add the plan-review UI

**Files:**

- Create: `src/features/ai/components/WorkspaceAssistant.tsx`
- Create: `src/features/ai/components/WorkspaceAssistant.test.tsx`
- Modify: `src/features/ai/api.ts`
- Modify: `src/features/ai/types.ts`
- Modify: `src/features/ai/components/AiSidebar.tsx`
- Modify: `src/shared/styles/globals.css`

- [x] Add a natural-language workspace instruction surface.
- [x] Show each plan operation with a selectable checkbox, target path, reason, and replacement preview.
- [x] Apply only selected operations and invalidate the active vault tree after success.
- [x] Test plan-before-apply behavior and the selected-operation payload.

### Task 5: Verify and record

**Files:**

- Modify: `PROJECT_STATUS.md`

- [x] Run the frontend and Rust test suites, typecheck, lint, browser smoke, and desktop shell smoke.
- [x] Update project status with final test counts, commit, and push.
