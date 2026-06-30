# Project Status

Date: 2026-06-30

This document records the current implementation state of AI Note Manager after the first 22 tracked completion points. The app is usable as a local Markdown note workbench foundation, but it is not yet a complete PRD-level MVP.

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

17. Folder creation is implemented at the service and command boundary.
    Evidence: `NoteService::create_folder`, `create_folder` command, path escape rejection test.

18. OpenAI Responses API integration is implemented behind the AI command boundary.
    Evidence: `OpenAiResponsesClient`, API key retrieval from keyring, settings model usage, provider request/response tests.

19. Editor selection tracking and selected-text AI writes are implemented.
    Evidence: `MarkdownEditor` stores selected ranges, rewrite/compress/expand send `selectedText`, `ApplyChangeDialog` replaces only the selected range when confirmed, frontend selected-text tests.

20. All MVP PRD AI actions are exposed in the frontend.
    Evidence: `AiAction` includes summarize, todos, rewrite, compress, expand, title, tags, and improvement suggestions; `AiSidebar` tests cover improvement suggestions as a non-writing action.

21. Markdown editing now uses CodeMirror 6 with view mode controls.
    Evidence: `MarkdownEditor` creates a CodeMirror Markdown editor with syntax highlighting, line numbers, history, line wrapping, and selected-text tracking; the workspace supports Edit, Split, and Preview modes with tests.

22. AI output utilities are implemented.
    Evidence: AI output can be copied, running generation can be cancelled and ignored when it resolves later, and non-writing output can be inserted at the editor cursor or appended to the note through the existing confirmation dialog.

## Verification

The latest full verification for the AI output utilities completion point used:

```bash
pnpm check
```

Result: passed. It ran TypeScript typecheck, ESLint, Vitest, Rust fmt, Rust clippy with `-D warnings`, and Rust tests. Current test count at that point: 9 frontend test files / 22 frontend tests, 28 Rust tests.

Each feature completion point above was saved as a Git commit and pushed to `origin/main`.

## Not Complete Yet

1. Markdown preview rendering is still basic.
   The preview derives a title and body text, but it does not yet render full Markdown constructs like lists, code blocks, links, or frontmatter.

2. Streaming AI responses are not implemented.
    The current AI flow is still request/response, although cancellation ignores late results and all note writes go through confirmation.

3. External file watching is not implemented.
    Save conflict detection exists, but there is no live file watcher notifying the UI when another tool changes a note.

## Next Priorities

1. Add file watching and better conflict UX.
   Notify users when the active note changes on disk and provide reload/compare choices.

2. Improve Markdown preview rendering.
   Render common Markdown blocks more faithfully while keeping source files unchanged.

3. Add end-to-end smoke testing.
    Cover selecting a vault, opening a note, editing, saving, searching, running AI, and confirming an AI write.
