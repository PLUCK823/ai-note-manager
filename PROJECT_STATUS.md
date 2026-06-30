# Project Status

Date: 2026-06-30

This document records the current implementation state of AI Note Manager after the first 16 tracked completion points. The app is usable as a local Markdown note workbench foundation, but it is not yet a complete PRD-level MVP.

## Completed

1. Project initialized as a Tauri + React + TypeScript + Rust desktop app.
   Evidence: `fcaa174 initialize tauri note manager`.

2. Local vault selection is implemented.
   Evidence: `0f77b97 feat: select local vault`, `select_vault`, `open_recent_vault`, `VaultPicker`.

3. Markdown file tree rendering is implemented.
   Evidence: `2964768 feat: render markdown file tree`, `list_markdown_files`, `FileTree`.

4. Markdown note opening, editing, and explicit saving are implemented.
   Evidence: `89027de feat: open and save markdown notes`, `read_note`, `save_note`, editor state, save button.

5. Save conflict protection and snapshots are implemented.
   Evidence: `7cba967 feat: protect note saves from conflicts`, `NoteService::save_note`, snapshot path support, conflict tests.

6. SQLite schema and note index initialization are implemented.
   Evidence: `fd762e4 feat: initialize sqlite note index`, `001_init.sql`, `Database::open_in_memory`.

7. Basic indexed full-text search is implemented.
   Evidence: `74297df feat: search indexed markdown notes`, `search_notes`, `SearchBox`, `SearchResults`.

8. Settings UI is implemented for model, AI read scope, autosave, and API key entry.
   Evidence: `9123586 feat: add settings form`, `SettingsPage`.

9. AI sidebar non-writing actions are implemented with local deterministic behavior.
   Evidence: `af80153 feat: run local ai note actions`, `run_ai_action`, `AiService::run_action`, `AiSidebar`.

10. AI write actions now require preview and confirmation before applying.
    Evidence: `bd9f19a feat: preview ai changes before applying`, `ApplyChangeDialog`, `AiService::apply_change`.

11. Non-sensitive settings are persisted and API keys are routed to the system credential store.
    Evidence: `SettingsService`, `settings.json` app-data persistence, `keyring` adapter in `infrastructure/security`.

12. SQLite metadata is opened from the app-data directory instead of an in-memory database.
    Evidence: `Database::open`, app startup `metadata.sqlite3` initialization, disk reopen persistence test.

13. The most recent existing vault is restored on app startup.
    Evidence: `get_recent_vault`, `Database::recent_vault`, app startup restore effect, frontend restore test.

14. Markdown note creation is implemented at the service and command boundary.
    Evidence: `NoteService::create_note`, `create_note` command, path escape rejection test.

15. Markdown note rename is implemented at the service and command boundary.
    Evidence: `NoteService::rename_note`, `rename_note` command, path separator rejection test.

16. Markdown note delete is implemented at the service and command boundary.
    Evidence: `NoteService::delete_note`, `delete_note` command, internal trash move test.

## Verification

The latest full verification for the Markdown note delete completion point used:

```bash
pnpm check
```

Result: passed. It ran TypeScript typecheck, ESLint, Vitest, Rust fmt, Rust clippy with `-D warnings`, and Rust tests. Current test count at that point: 8 frontend test files / 11 frontend tests, 23 Rust tests.

Each feature completion point above was saved as a Git commit and pushed to `origin/main`.

## Not Complete Yet

1. Real cloud AI provider integration is not implemented.
   Current AI responses are local deterministic helpers, useful for wiring and tests but not a real model API.

2. Folder creation is not implemented.
   The commands exist as placeholders and return errors.

3. Markdown editor experience is basic.
   There is no CodeMirror syntax highlighting, no robust preview mode, and no split view.

4. AI selected-text flows are incomplete.
   The data model supports `selectedText`, but the editor does not yet track user selection for rewrite/compress/expand.

5. Some PRD AI actions are not exposed in the frontend.
   Compress, expand, and improvement suggestions exist in the Rust enum/service path, but the frontend action list only exposes summarize, todos, rewrite, title, and tags.

6. Streaming, cancel, copy output, and insert-at-position flows are incomplete.
    The current AI flow is request/response and whole-note replacement for write preview.

7. External file watching is not implemented.
    Save conflict detection exists, but there is no live file watcher notifying the UI when another tool changes a note.

## Next Priorities

1. Continue file management commands.
   Add create folder.

2. Add real AI provider integration behind the existing command boundary.
   Keep current-note-only privacy as the default, avoid logging note bodies or keys, and preserve the preview-before-write rule.

3. Add editor selection tracking and selected-text AI writes.
   Rewrite, compress, and expand should target selected text first, then show a focused diff before applying.

4. Expose the full PRD AI action set in the frontend.
   Add compress, expand, and improvement suggestions to the UI with tests.

5. Improve Markdown editing.
   Add CodeMirror 6 Markdown syntax highlighting, simple preview or split preview, and better large-file behavior.

6. Add AI output utilities.
   Add copy output, cancel generation, and insert-at-cursor or append-to-note flows with confirmation.

7. Add file watching and better conflict UX.
   Notify users when the active note changes on disk and provide reload/compare choices.

8. Add end-to-end smoke testing.
    Cover selecting a vault, opening a note, editing, saving, searching, running AI, and confirming an AI write.
