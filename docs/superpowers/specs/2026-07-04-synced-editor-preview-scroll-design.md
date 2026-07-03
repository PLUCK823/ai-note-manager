# Synced Editor Preview Scroll Design

Date: 2026-07-04

## Goal

In Split mode, the Markdown editor and Markdown preview should scroll together by default. Users can turn this behavior off from Settings.

## Scope

This phase implements proportional vertical scroll synchronization. It does not attempt block-level or Markdown AST-based source mapping between editor lines and preview elements.

## Design

Add `syncPreviewScroll: boolean` to app settings. The default is `true`, and settings persistence stores it alongside model, AI read scope, and autosave.

`AppLayout` reads the shared settings query. When Split mode is active and `syncPreviewScroll` is true, scrolling either CodeMirror's scroll DOM or the Markdown preview surface synchronizes the other pane by scroll percentage. A small guard prevents scroll events triggered by synchronization from recursively triggering the opposite side.

`SettingsPage` adds a checkbox labeled `Sync editor and preview scrolling`. Saving settings updates the backend and the React Query cache so the running layout responds immediately.

## Testing

- Rust settings tests cover camelCase serialization, default settings, and persistence of `syncPreviewScroll`.
- Settings UI tests cover loading and saving the toggle.
- App layout tests cover editor-to-preview and preview-to-editor proportional synchronization, and verify disabling the setting stops synchronization.

## Documentation

After implementation, update `PROJECT_STATUS.md` with a new completion point and the latest `pnpm check` result.
