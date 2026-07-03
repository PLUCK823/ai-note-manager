# Synced Editor Preview Scroll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default-on synchronized scrolling between Markdown editor and preview in Split mode with a Settings toggle.

**Architecture:** Extend the existing settings contract with `syncPreviewScroll`, use the settings React Query cache as the frontend source of truth, and synchronize the CodeMirror scroll DOM with the preview surface by proportional scroll position.

**Tech Stack:** React 19, TypeScript, TanStack Query, CodeMirror 6, Tauri Rust settings service, Vitest, Testing Library.

---

## Task 1: Settings Contract

- [ ] Write failing Rust and frontend settings tests for `syncPreviewScroll`.
- [ ] Add `sync_preview_scroll` to Rust `AppSettings`, default settings, serialization tests, and persistence tests.
- [ ] Add `syncPreviewScroll` to frontend `AppSettings`, default settings, and the Settings page checkbox.
- [ ] Run `pnpm test src/features/settings/components/SettingsPage.test.tsx` and `pnpm rust:test`.

## Task 2: Split Scroll Synchronization

- [ ] Write failing App layout tests for editor-to-preview sync, preview-to-editor sync, and disabled sync.
- [ ] Expose CodeMirror's scroll DOM from `MarkdownEditor`.
- [ ] Expose the preview surface ref from `MarkdownPreview`.
- [ ] Implement guarded proportional scroll synchronization in `AppLayout`.
- [ ] Run `pnpm test src/app/App.test.tsx`.

## Task 3: Documentation, Verification, Commit

- [ ] Update `PROJECT_STATUS.md` with the new completion point and test counts.
- [ ] Run `pnpm check`.
- [ ] Inspect `git diff --check`, `git diff --stat`, and `git status --short --branch`.
- [ ] Commit with `feat: sync editor preview scroll`.
- [ ] Push `origin main`.
