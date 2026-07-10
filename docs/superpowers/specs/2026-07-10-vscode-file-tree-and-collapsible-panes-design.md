# VS Code File Tree and Collapsible Panes Design

## Goal

Turn the vault navigation into a VS Code-style expandable file tree and make the vault and AI panes independently collapsible without losing a visible way to restore them. The two functional panes must continue to swap between the left and right workspace edges and retain their respective widths and collapse state.

## Scope

This change covers the desktop workspace only:

- Expandable and collapsible folder nodes in the vault tree.
- Active-note highlighting in the tree.
- A narrow restore rail for a collapsed vault or AI pane.
- Existing vault/AI position swapping, with correct behavior after either pane is collapsed.
- Frontend and desktop-shell regression coverage for the user-visible controls.

This change does not add drag-and-drop docking, arbitrary panel ordering, keyboard tree navigation beyond native buttons, or persisted per-folder expansion preferences.

## Existing Context

`AppLayout` already persists `leftPaneVisible`, `rightPaneVisible`, `aiPaneOnLeft`, and the widths of the vault, AI, and preview panes through `AppSettings`. The names `leftPaneVisible` and `rightPaneVisible` refer to the vault and AI functional panes, not their physical placement after swapping. `FileTree` already receives a nested `FileTreeNode[]` from the backend, but recursively renders all children without folder state or active-file styling.

## Design

### Pane identity and physical placement

The vault pane and the AI pane remain separate logical identities. `aiPaneOnLeft` determines their physical order around the workspace. A collapsed logical pane renders a narrow restore rail in its current physical location rather than being removed from layout entirely.

Each rail contains one icon-only button:

- Vault rail: accessible name `Show file navigation`.
- AI rail: accessible name `Show AI assistant`.

The normal, expanded pane continues to expose the existing toolbar control with the inverse accessible action (`Hide file navigation` or `Hide AI assistant`). A rail occupies a stable small width and is not resizable. An expanded pane keeps its own persisted width; swapping does not transfer or recalculate widths.

The render sequence is determined by physical placement, not by fixed left/right CSS names:

1. First functional pane or its collapsed rail.
2. Its resize separator only when expanded.
3. Main workspace.
4. The second pane's resize separator only when expanded.
5. Second functional pane or its collapsed rail.

This eliminates the current ambiguity where the restore button is associated with a fixed side even after AI and vault swap positions.

### File tree structure

`FileTree` will retain folder expansion state in React as a set of folder paths. The initial expanded set includes every top-level folder so a newly opened vault remains immediately useful. When an active file exists, every ancestor folder on its relative path is also expanded, ensuring the selection is visible after opening a note or after a file-tree refresh.

Each folder row contains a dedicated disclosure button with the folder name and an arrow icon. Its `aria-expanded` value represents whether its child group is rendered. Clicking it only changes that folder's state. Child rows are rendered only while the folder is expanded.

Each Markdown file row is a button that loads the note. If its path equals the active note path, it receives the selected visual treatment and `aria-current="page"`. File and folder rows use their appropriate Lucide icons. Existing loading, empty, error, and no-vault states remain unchanged.

### Visual direction

The tree uses a compact, utilitarian Explorer treatment that fits the existing desktop app: small disclosure arrows, consistent indentation, subdued folder labels, precise hover feedback, and a clear but restrained active-file surface. It is not a generic card list. The collapse rails use icon buttons and a border that visually reconnects them to the workspace edge.

### Failure handling

The existing note-load failure behavior remains: selecting a file moves the editor save state to `failed` if reading fails. Folder toggling has no asynchronous operation and cannot leave an inconsistent server state. Settings writes preserve the existing optimistic query update pattern; a failed visibility update leaves the last persisted query data as the rendered source of truth on refetch.

## Testing Strategy

### Frontend unit and integration tests

Add FileTree coverage for:

- Top-level folders rendering expanded by default.
- Clicking a folder collapses its children and updates `aria-expanded`.
- Nested folder toggles affect only that folder.
- The active note row exposes `aria-current="page"` and selected styling.
- Opening a nested active file causes its ancestor folders to be visible.

Add App coverage for:

- Hiding each logical pane renders a restore rail instead of removing all restore controls.
- The rail is restored with the expected accessible button.
- After swapping panes, a collapsed vault or AI rail is rendered on the pane's new physical side.
- Existing resize and position-swap behavior remains available while panes are expanded.

### Desktop-shell smoke test

Extend the real desktop workflow to exercise the workspace toolbar: collapse the vault pane, restore it, move AI to the left, collapse the AI pane, restore it, and verify the main note workspace stays interactive. Native file picker automation remains out of scope.

## Acceptance Criteria

- The vault tree is visibly hierarchical and folders can be independently expanded or collapsed.
- Opening a note leaves its complete tree path expanded and the active note distinguishable.
- Vault and AI panes can be independently collapsed and restored from a visible narrow rail.
- Vault and AI can be swapped from left to right before or after one is collapsed.
- Pane sizes and swap/visibility settings continue to persist through the existing settings model.
- Targeted tests, the full `pnpm check` suite, and the updated project status document are green before commit and push.
