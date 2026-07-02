# Project Status

Date: 2026-07-02

This document records the current implementation state of AI Note Manager after the first 66 tracked completion points. The app is usable as a local Markdown note workbench foundation, but it is not yet a complete PRD-level MVP.

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

23. Active-note external change detection and conflict UX are implemented.
    Evidence: `check_note_status` compares the active note's disk hash with the editor base hash, `DiskChangeNotice` polls the active note and offers Reload from disk or Keep editing, and save conflict protection remains in place.

24. Markdown preview rendering supports common Markdown blocks.
    Evidence: `parseMarkdownBlocks` strips YAML frontmatter and parses headings, paragraphs, unordered lists, ordered lists, and fenced code blocks; `MarkdownPreview` renders those blocks as React nodes and supports safe http/https inline links; frontend tests cover frontmatter hiding, links, lists, headings, and code blocks.

25. Native vault file watching is implemented.
    Evidence: `start_vault_watcher` starts a `notify` recursive watcher for the active vault, `VaultWatcher` emits normalized Markdown file payloads through the `vault:file-changed` Tauri event, `DiskChangeNotice` subscribes to that event instead of polling, invalidates the Markdown file tree query, and checks the active note status only when a matching event arrives.

26. End-to-end smoke testing is implemented.
    Evidence: `playwright.config.ts` starts the Vite frontend for Playwright, `e2e/smoke.spec.ts` mocks the Tauri command/event boundary and covers opening a vault, opening a note, editing, saving, searching, running an AI write action, and confirming the AI change. `pnpm check` now includes `pnpm e2e` so the smoke test runs with the full verification gate.

27. Markdown preview rendering supports tables, images, and task lists.
    Evidence: `parseMarkdownBlocks` parses pipe tables, http/https image syntax, and checkbox task list items; `MarkdownPreview` renders semantic tables, constrained images, and disabled task checkboxes without unsafe HTML; frontend tests cover table headers/cells, image alt/src, and checked/unchecked task items.

28. AI responses stream through the Tauri event boundary.
    Evidence: `run_ai_action` now returns a request id immediately and emits `ai:chunk`, `ai:done`, and `ai:error` events; the frontend subscribes to those events, accumulates visible chunks while generation is running, completes write actions through the existing confirmation flow, and calls `cancel_ai_action` so cancelled requests ignore late chunks. Frontend tests cover chunk rendering and cancellation, Rust tests cover stream payload serialization and chunking, and the Playwright smoke test mocks the event boundary for the AI write flow.

29. Desktop-shell smoke testing is implemented.
    Evidence: `pnpm desktop:e2e` builds the Tauri debug binary with the `wdio` feature, registers `tauri-plugin-wdio-webdriver` only for that feature, starts a real Vite dev server and Tauri desktop process, seeds a temporary HOME with a real Markdown vault and SQLite metadata, connects through embedded WebDriver, and verifies the desktop shell restores the real vault and renders `Desktop Smoke.md`. `pnpm check` now includes `pnpm desktop:e2e`.

30. Markdown preview rendering supports blockquotes.
    Evidence: `parseMarkdownBlocks` groups consecutive `>` quote lines into blockquote blocks, `MarkdownPreview` renders semantic blockquote elements with inline link support, and frontend tests cover multiline blockquotes with safe http/https links.

31. Markdown preview rendering supports footnotes.
    Evidence: `parseMarkdownBlocks` extracts `[^id]: definition` lines into a footnote section and leaves them out of regular paragraphs; `MarkdownPreview` renders `[^id]` inline references as links to semantic footnote list entries; frontend tests cover references, definition extraction, and visible footnote text.

32. Markdown preview rendering supports nested unordered lists.
    Evidence: `parseMarkdownBlocks` parses indented `-` and `*` child items into recursive unordered list items, `MarkdownPreview` renders nested bullet lists under their parent list item, and frontend tests cover two-level nested list rendering.

33. Markdown preview rendering supports nested ordered lists.
    Evidence: `parseMarkdownBlocks` parses indented numbered child items into recursive ordered list items, shares the same recursive list model used by nested bullet lists, and `MarkdownPreview` renders nested numbered lists under their parent list item. Frontend tests cover two-level nested ordered list rendering.

34. Markdown preview rendering supports nested task lists.
    Evidence: `parseMarkdownBlocks` parses indented `- [ ]` and `- [x]` child task items into recursive task list items, `MarkdownPreview` renders nested task lists under their parent task item, and frontend tests cover nested checked and unchecked task rendering.

35. Markdown preview rendering supports local vault image assets.
    Evidence: `parseMarkdownBlocks` accepts local image targets, `MarkdownPreview` resolves relative image paths against the active note directory inside the selected vault, uses Tauri `convertFileSrc` for desktop-safe asset URLs, rejects absolute paths and `..` paths that escape the vault, and `tauri.conf.json` enables the asset protocol with a home-directory scope. Frontend tests cover valid sibling-directory image resolution and escaping-path fallback to text.

36. Desktop-shell smoke testing covers the real open/edit/save/search workflow.
    Evidence: `e2e-desktop/shell-smoke.mjs` now restores a seeded vault in the real Tauri shell, opens `Desktop Smoke.md` through the real command boundary, edits the CodeMirror Markdown editor, saves through the real save command, verifies the Markdown file on disk, searches for the saved content, and verifies the result inside the desktop shell. The save and AI apply command paths now refresh the SQLite note index after successful writes, and a Rust regression test covers saved-content indexing.

37. Desktop-shell smoke testing covers the real AI preview/apply workflow.
    Evidence: `e2e-desktop/shell-smoke.mjs` now runs a deterministic local AI rewrite in the real Tauri shell, waits for the `Apply AI change` confirmation dialog, applies the proposal to the CodeMirror editor, verifies the editor becomes dirty, saves the AI-updated note, and verifies the rewritten Markdown on disk. The desktop smoke process sets `AI_NOTE_MANAGER_DISABLE_EXTERNAL_AI=true` so it does not depend on a developer keyring or network provider, and `AiState` now accepts stream chunks that arrive before `run_ai_action` returns its backend request id. Frontend tests cover this early-event race.

38. OpenAI provider-side Responses API streaming is implemented.
    Evidence: `OpenAiResponsesClient` now builds `stream: true` Responses API requests, consumes the HTTP SSE response incrementally, parses `response.output_text.delta` events, and emits each provider delta directly through the existing `ai:chunk` Tauri event boundary. The command path still falls back to deterministic local AI when no API key exists or when desktop smoke sets `AI_NOTE_MANAGER_DISABLE_EXTERNAL_AI=true`. Rust tests cover streaming request construction and SSE delta parsing.

39. Markdown preview rendering supports common inline formatting.
    Evidence: `MarkdownPreview` now renders inline code spans, bold text, and italic text as semantic `code`, `strong`, and `em` elements while preserving existing inline link and footnote rendering. Frontend tests cover inline code, bold, and italic rendering in paragraphs.

40. Markdown preview rendering supports all ATX heading levels.
    Evidence: `parseMarkdownBlocks` now accepts heading markers from `#` through `######`, `MarkdownPreview` renders semantic `h1` through `h6` elements, and frontend tests cover heading levels four, five, and six.

41. Markdown preview rendering supports Setext headings.
    Evidence: `parseMarkdownBlocks` now recognizes CommonMark-style Setext heading underlines made from `=` and `-`, renders them as semantic level one and level two headings through the existing preview renderer, and frontend tests cover both Setext heading depths.

42. Markdown preview rendering supports thematic breaks.
    Evidence: `parseMarkdownBlocks` now recognizes CommonMark-style thematic breaks made from `---`, `***`, and `___`, `MarkdownPreview` renders them as semantic separators, and frontend tests cover all three marker styles without exposing the raw marker text.

43. Markdown preview rendering trims ATX heading closing sequences.
    Evidence: `parseMarkdownBlocks` now removes trailing CommonMark-style closing hash sequences from ATX heading text before rendering, while preserving the semantic heading level. Frontend tests cover level two and level three headings with closing `#` markers and trailing whitespace.

44. Markdown preview rendering supports HTTP autolinks.
    Evidence: `MarkdownPreview` now renders CommonMark-style `<http://...>` and `<https://...>` autolinks as safe external anchor elements while keeping the existing markdown link handling. Frontend tests cover both HTTP and HTTPS autolinks without exposing the surrounding angle brackets.

45. Markdown preview rendering supports email autolinks.
    Evidence: `MarkdownPreview` now renders CommonMark-style `<team@example.com>` email autolinks as `mailto:` anchors while leaving surrounding prose intact. Frontend tests cover the mailto href and ensure the raw angle-bracket source is not exposed.

46. Markdown preview rendering supports tilde fenced code blocks.
    Evidence: `parseMarkdownBlocks` now recognizes both backtick and tilde fenced code blocks, preserves the fenced code body, and closes only on the matching fence marker. Frontend tests cover `~~~ts` fenced code rendering without exposing the raw fence marker.

47. Markdown preview rendering supports spaced fenced code info strings.
    Evidence: `parseMarkdownBlocks` now accepts a space between the opening fence marker and the info string, so fences like ```` ``` ts ```` render as code blocks instead of paragraphs. Frontend tests cover spaced info string code rendering without exposing the raw fence marker.

48. Markdown preview rendering supports indented code blocks.
    Evidence: `parseMarkdownBlocks` now recognizes top-level lines indented by four spaces or a tab as code blocks, strips the code indentation, and renders the result through the existing semantic code block preview. Frontend tests cover multi-line indented code rendering.

49. Markdown preview rendering preserves ordered list start numbers.
    Evidence: `parseMarkdownBlocks` now records the first ordered-list marker number and `MarkdownPreview` renders it through the semantic `ol start` attribute. Frontend tests cover an ordered list that starts at `3.` and verifies the rendered list starts at 3.

50. Markdown preview rendering supports plus-marker unordered lists.
    Evidence: `parseMarkdownBlocks` now recognizes `+` as an unordered-list marker alongside `-` and `*`, and the existing semantic bullet-list renderer handles the parsed items. Frontend tests cover a `+` marker list without falling back to paragraph text.

51. Markdown preview rendering supports plus-marker task lists.
    Evidence: `parseMarkdownBlocks` now recognizes `+ [ ]` and `+ [x]` as task-list markers alongside `-` and `*`, and the existing disabled checkbox task-list renderer handles checked and unchecked plus-marker task items. Frontend tests cover both plus-marker checked and unchecked task items.

52. Markdown preview rendering supports parenthesized ordered lists.
    Evidence: `parseMarkdownBlocks` now recognizes ordered-list markers written as `1)` alongside `1.`, preserves the first marker number through the existing semantic ordered-list renderer, and frontend tests cover a parenthesized ordered list that starts at `3)`.

53. Markdown preview rendering supports strikethrough text.
    Evidence: `MarkdownPreview` now renders GFM-style `~~text~~` inline spans as semantic `del` elements while preserving the existing inline rendering pipeline. Frontend tests cover strikethrough rendering without exposing the raw `~~` markers.

54. Markdown preview rendering supports underscore emphasis.
    Evidence: `MarkdownPreview` now renders CommonMark-style `__strong__` and `_emphasis_` inline spans as semantic `strong` and `em` elements alongside the existing asterisk forms. Frontend tests cover both underscore strong and emphasis rendering without exposing the raw underscore markers.

55. Markdown preview rendering supports double-backtick inline code spans.
    Evidence: `MarkdownPreview` now recognizes inline code spans delimited by double backticks before the single-backtick rule, so code text can include a literal single backtick. Frontend tests cover a double-backtick code span that preserves an internal backtick without exposing the raw delimiter markers.

56. Markdown preview rendering supports reference-style links.
    Evidence: `parseMarkdownBlocks` now collects http/https reference link definitions, omits those definition lines from rendered content, and resolves paragraph/blockquote references like `[label][id]` through the existing safe inline link renderer. Frontend tests cover a reference-style link and hidden definition line.

57. Markdown preview rendering supports collapsed reference-style links.
    Evidence: `parseMarkdownBlocks` now resolves collapsed references like `[label][]` using the matching http/https reference definition id, reusing the existing safe inline link renderer and hidden definition-line handling. Frontend tests cover a collapsed reference-style link and hidden definition line.

58. Markdown preview rendering supports shortcut reference-style links.
    Evidence: `parseMarkdownBlocks` now resolves shortcut references like `[label]` using the matching http/https reference definition id while preserving normal inline links and explicit reference links. Frontend tests cover a shortcut reference-style link and hidden definition line.

59. Markdown preview rendering supports reference-style images.
    Evidence: `parseMarkdownBlocks` now resolves block image syntax like `![alt][id]` through collected http/https reference definitions and renders the result through the existing safe image renderer while keeping definition lines hidden. Frontend tests cover a reference-style image and hidden definition line.

60. Markdown preview rendering supports collapsed reference-style images.
    Evidence: `parseMarkdownBlocks` now resolves block image syntax like `![alt][]` through a matching http/https reference definition id derived from the image alt text, reusing the existing safe image renderer and hidden definition-line handling. Frontend tests cover a collapsed reference-style image and hidden definition line.

61. Markdown preview rendering supports shortcut reference-style images.
    Evidence: `parseMarkdownBlocks` now resolves block image syntax like `![alt]` through a matching http/https reference definition id derived from the image alt text, reusing the existing safe image renderer and hidden definition-line handling. Frontend tests cover a shortcut reference-style image and hidden definition line.

62. Markdown preview rendering supports longer fenced code markers.
    Evidence: `parseMarkdownBlocks` now recognizes backtick and tilde code fences made from three or more matching marker characters and closes only on a fence of the same marker with at least the opening length. Frontend tests cover a four-backtick fenced block containing nested triple-backtick text.

63. Markdown preview rendering supports pipe tables without outer pipes.
    Evidence: `parseMarkdownBlocks` accepts pipe table header, separator, and body rows with or without leading/trailing pipe characters, and `MarkdownPreview` renders them through the existing semantic table renderer. Frontend tests cover a table written without outer pipes.

64. Markdown preview rendering supports hard line breaks in paragraphs.
    Evidence: `parseMarkdownBlocks` preserves paragraph hard line breaks written with two trailing spaces or a trailing backslash, and `MarkdownPreview` renders those preserved breaks as `<br>` elements without exposing the marker characters. Frontend tests cover both hard line break forms in one paragraph.

65. Markdown preview rendering supports table column alignment.
    Evidence: `parseMarkdownBlocks` now preserves GFM table separator alignment markers for left, center, and right aligned columns, and `MarkdownPreview` applies the corresponding `text-align` style to table headers and cells. Frontend tests cover `:---`, `:---:`, and `---:` markers.

66. Markdown preview rendering supports backslash-escaped punctuation.
    Evidence: `MarkdownPreview` now treats backslash-escaped ASCII punctuation as literal text in inline Markdown parsing, so escaped emphasis and link markers do not create formatting or links. Frontend tests cover escaped asterisks and escaped link punctuation.

## Verification

The latest full verification for the backslash-escaped punctuation completion point used:

```bash
pnpm check
```

Result: passed. It ran TypeScript typecheck, ESLint, Vitest, Playwright, the desktop-shell smoke test, Rust fmt, Rust clippy with `-D warnings`, and Rust tests. Current test count at that point: 11 frontend test files / 63 frontend tests, 1 Playwright browser smoke test, 1 desktop-shell smoke test, 36 Rust tests.

Each feature completion point above was saved as a Git commit and pushed to `origin/main`.

## Not Complete Yet

1. Markdown preview rendering is intentionally lightweight.
   The preview now covers common Markdown blocks, ATX headings with closing sequence trimming, Setext headings, thematic breaks, backtick and tilde fenced code blocks with compact or spaced info strings and variable-length fences, indented code blocks, paragraph hard line breaks, inline code spans including double-backtick spans with internal backticks, common inline formatting with asterisk and underscore emphasis, backslash-escaped punctuation, strikethrough text, inline links, full/collapsed/shortcut reference-style links, HTTP and email autolinks, blockquotes, footnotes, nested unordered lists with `-`, `*`, and `+` markers, nested ordered lists with `.` and `)` markers plus start numbers, nested task lists with `-`, `*`, and `+` markers, pipe tables with or without outer pipes and column alignment, http/https images, full/collapsed/shortcut reference-style images, local vault images, and task lists, but it does not yet support full CommonMark edge cases.

2. Desktop-shell workflow coverage is still narrow.
    The desktop smoke test now launches a real Tauri shell and exercises real app-data/vault filesystem restore, note opening, editing, saving, disk write verification, search behavior, and AI preview/apply behavior, but it does not yet drive native OS file picker dialogs.

## Next Priorities

1. Continue Markdown preview fidelity improvements.
   Add stricter CommonMark behavior if richer reading mode fidelity becomes important.

2. Expand desktop-shell workflow coverage where practical.
   Native OS file picker automation remains a separate platform-specific concern.
