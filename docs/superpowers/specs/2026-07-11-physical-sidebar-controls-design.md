# Physical Sidebar Controls Fix Design

## Problem

The current workspace toolbar contains two collapse buttons that always target the logical vault or AI pane. After the panes swap physical sides, the button associated with the left side can still collapse the vault on the right. The toolbar controls duplicate the restore rails and leave the workspace responsible for sidebar behavior.

## Design

Each expanded physical sidebar owns one collapse button in its own header. The action is addressed by physical edge: `Collapse left sidebar` or `Collapse right sidebar`. The button toggles whichever logical pane is currently rendered at that edge.

The central workspace toolbar keeps only the pane-swap command. It no longer has sidebar-collapse controls.

A collapsed side renders one fixed-width `CollapsedPaneRail` in the matching grid column. Its restore control is also addressed by physical edge: `Expand left sidebar` or `Expand right sidebar`. No resize separator is rendered for a collapsed side.

The rendering helpers receive both the logical pane identity and physical edge. They derive:
- the persisted visibility field to update;
- header button label and icon direction from the physical edge;
- rail position and width from the physical edge;
- separator order and resize direction from the physical edge.

## Acceptance Criteria

- With AI on the left, the control inside the AI sidebar collapses only AI and leaves the vault on the right expanded.
- With the default layout, the control inside the vault sidebar collapses only the vault and leaves AI on the right expanded.
- There are no collapse buttons in the workspace toolbar.
- A collapsed side remains exactly one 44px rail in its physical grid column with one restore button and no adjacent separator.
- Restore actions expand the pane on the same physical side.
- Unit, browser smoke, desktop-shell smoke, and full `pnpm check` verification pass.
