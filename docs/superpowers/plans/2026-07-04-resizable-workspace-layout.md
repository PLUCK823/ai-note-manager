# Resizable Workspace Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first phase of user-customizable workspace layout: resizable left, center, right panes; independently scrolling panels; resizable editor/preview split.

**Architecture:** Keep the current `AppLayout` ownership model and add lightweight local layout state plus reusable separator handlers. CSS custom properties drive grid column widths so tests can assert behavior without depending on browser layout calculation.

**Tech Stack:** React 19, TypeScript, Testing Library, Vitest, CSS Grid, pointer events, keyboard events.

---

## File Structure

- Modify `src/app/layout.tsx`: add layout width state, drag/keyboard resize handlers, separator elements, and CSS custom properties.
- Modify `src/app/App.test.tsx`: add layout interaction tests around `AppLayout`.
- Modify `src/shared/styles/globals.css`: convert fixed columns to variable columns, add separator styles, enforce independent scroll boundaries, and support split resizing.
- Modify `PROJECT_STATUS.md`: add a completion point and update verification counts after implementation.

## Task 1: Outer Workspace Pane Resizing

**Files:**
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/shared/styles/globals.css`

- [ ] **Step 1: Write failing tests for outer pane handles**

Add tests that render `AppLayout`, drag the file/workspace and workspace/AI separators, and assert the shell CSS variables changed.

- [ ] **Step 2: Run target tests to verify RED**

Run: `pnpm test src/app/App.test.tsx`

Expected: fail because the separator handles do not exist.

- [ ] **Step 3: Implement minimal outer pane resizing**

Add width state in `AppLayout`, render two separator buttons/elements with `role="separator"`, and update widths on pointer drag and ArrowLeft/ArrowRight.

- [ ] **Step 4: Update CSS for variable outer columns and independent scroll**

Use `grid-template-columns: var(--vault-pane-width) minmax(460px, 1fr) var(--ai-pane-width)` and set the shell/panes to `height: 100vh`, `min-height: 0`, and panel-level `overflow: auto` where appropriate.

- [ ] **Step 5: Run target tests to verify GREEN**

Run: `pnpm test src/app/App.test.tsx`

Expected: pass.

## Task 2: Editor/Preview Split Resizing

**Files:**
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/shared/styles/globals.css`

- [ ] **Step 1: Write failing test for split handle**

Add a test that renders `AppLayout`, verifies Split mode shows an editor/preview separator, drags it, and asserts `--preview-pane-width` changed.

- [ ] **Step 2: Run target tests to verify RED**

Run: `pnpm test src/app/App.test.tsx`

Expected: fail because the split separator does not exist.

- [ ] **Step 3: Implement minimal split resizing**

Add `previewWidth` state, render the split separator only in Split mode, update `--preview-pane-width`, and make the editor grid use the variable width.

- [ ] **Step 4: Run target tests to verify GREEN**

Run: `pnpm test src/app/App.test.tsx`

Expected: pass.

## Task 3: Documentation and Full Verification

**Files:**
- Modify: `PROJECT_STATUS.md`

- [ ] **Step 1: Update project status**

Add a completion point for resizable workspace panes and split editor/preview resizing. Update the latest verification section after the full check.

- [ ] **Step 2: Run complete verification**

Run: `pnpm check`

Expected: TypeScript, ESLint, Vitest, Playwright, desktop smoke, Rust fmt, Rust clippy, and Rust tests all pass.

- [ ] **Step 3: Inspect final diff**

Run:

```bash
git diff --check
git diff --stat
git status --short --branch
```

Expected: no whitespace errors; only intended files changed plus the persistent untracked `tmp/`.

- [ ] **Step 4: Commit and push**

Run:

```bash
git add PROJECT_STATUS.md src/app/App.test.tsx src/app/layout.tsx src/shared/styles/globals.css docs/superpowers/specs/2026-07-04-resizable-workspace-layout-design.md docs/superpowers/plans/2026-07-04-resizable-workspace-layout.md
git commit -m "feat: resize workspace panes"
git push origin main
```
