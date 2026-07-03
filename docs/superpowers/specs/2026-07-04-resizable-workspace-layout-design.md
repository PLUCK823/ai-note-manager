# Resizable Workspace Layout Design

Date: 2026-07-04

## Goal

Implement the first phase of user-customizable workspace layout. The left file/navigation area, center note workspace, and right AI assistant area must support user-controlled width resizing. Each major area must scroll independently. In Split mode, the Markdown editor and Markdown preview must also support user-controlled width resizing.

## Scope

This phase intentionally focuses on sizing and scroll independence. It does not implement arbitrary panel docking, drag-to-reorder, bottom panels, panel hiding, or persisted layout preferences. Those can be added after the resizing foundation is stable.

## Current State

`src/app/layout.tsx` renders a fixed three-column shell:

- `aside.vault-pane`
- `main.workspace`
- `AiSidebar`

`src/shared/styles/globals.css` defines fixed grid columns: `288px minmax(460px, 1fr) 336px`. The editor/preview Split mode is also fixed: `minmax(0, 1fr) 280px`. Scroll behavior is not bounded per panel consistently; panel contents can depend on the page-level layout.

## Proposed Design

Introduce a small frontend-only layout state model inside `AppLayout` for now:

- `leftWidth`: default `288`, min `220`, max `420`
- `rightWidth`: default `336`, min `260`, max `520`
- `previewWidth`: default `360`, min `240`, max `640`

The outer app shell remains a CSS grid, but its column sizes are driven by CSS custom properties:

- `--vault-pane-width`
- `--ai-pane-width`

The Split editor/preview grid uses `--preview-pane-width`. Edit-only and preview-only modes still use a single column.

Add accessible separator handles:

- A vertical handle between the file/navigation pane and workspace.
- A vertical handle between the workspace and AI assistant pane.
- A vertical handle between Markdown editor and preview when Split mode is active.

Handles use pointer dragging for mouse/trackpad resizing and keyboard resizing with ArrowLeft/ArrowRight. Each handle has `role="separator"`, `aria-orientation="vertical"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.

## Scroll Behavior

The app shell owns the viewport height. The three primary areas use `min-height: 0` and `overflow: auto` so each area scrolls independently. The editor and preview surfaces also use `min-height: 0`; CodeMirror keeps its own internal scroll area, and the preview surface scrolls independently.

Horizontal overflow is allowed inside panels where content requires it. Long file names, Markdown tables, code blocks, and AI output should not force the whole app shell to scroll horizontally.

## Testing

Add focused React tests around `AppLayout`:

- Dragging the left workspace separator changes `--vault-pane-width`.
- Dragging the right workspace separator changes `--ai-pane-width`.
- Dragging the Split-mode editor/preview separator changes `--preview-pane-width`.
- Handles expose separator semantics and current values.

Existing smoke tests continue to cover the core app workflow. Full verification remains `pnpm check`.

## Documentation

After implementation, update `PROJECT_STATUS.md` with a new completion point for resizable workspace panes and split editor/preview resizing, including the latest full verification count.
