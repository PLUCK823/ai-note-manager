# Confirmed AI Workspace Agent Design

## Goal

Make the AI integration dependable for external providers and capable of planning file work across the selected Markdown vault without giving a model unrestricted file-system access.

## Market-informed Constraints

The design follows the permission patterns used by current agent tooling: expose only task-relevant tools, show file-by-file changes before applying them, and require approval for side effects. VS Code documents tool approval for side-effecting tools, while Cursor presents file-level diffs for review. This app keeps a stricter default: every workspace write or deletion remains selected and confirmed in the app.

## Provider Reliability

The existing stream state accepted early chunks but ignored early terminal events. A fast provider error could arrive before the command response supplied its request id, leaving the UI stuck in a running state. The state machine now accepts an early `ai:done` or `ai:error` while a request is active and refuses a late command response from overwriting the terminal state. Provider errors are mapped to actionable UI messages.

The settings dialog provides a connection check using the currently selected provider, model, and provider-specific keyring entry. DeepSeek V4 requests explicitly disable thinking mode so normal note and planning actions receive final content deltas suitable for the app's streaming parser.

## Workspace Agent Contract

`plan_workspace_changes` accepts the selected vault id, a natural-language instruction, the active file path, and optional editor selection. It scans the vault into a Markdown-path manifest and asks the configured provider to return JSON only:

```json
{
  "summary": "What will happen",
  "operations": [
    {
      "kind": "read | search | create | update | delete",
      "path": "relative/path.md or null",
      "content": "full replacement content or null",
      "query": "search text or null",
      "reason": "Why this operation is needed"
    }
  ]
}
```

The model receives only the relative-file manifest plus explicit active/selected editor context. It does not receive a filesystem tool. It cannot apply an operation itself.

`apply_workspace_plan` receives only user-selected operations. Reads, creates, replacements, and deletes call existing `NoteService` methods, preserving relative-path validation, Markdown-only constraints, save conflict checks, and internal trash behavior. Searches use the existing vault-scoped SQLite index. The UI invalidates the vault tree only after successful application.

## UX

The AI sidebar includes a workspace instruction field and a `Create plan` action. The resulting plan displays each operation, target path, reason, and proposed replacement content. Each item is independently selectable. `Apply selected changes` is the only write-capable action. Completion results show per-operation feedback.

## Testing

- The AI sidebar regression test covers an error arriving before the backend request id.
- The workspace assistant test verifies planning does not apply operations automatically and that only confirmed operations are sent for application.
- Existing Rust tests cover provider streaming requests; full browser and desktop smoke suites ensure the primary AI workflow remains intact.
