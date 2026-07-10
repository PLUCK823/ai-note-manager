# VS Code File Tree and Collapsible Panes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vault navigation a VS Code-style expandable file tree and render a visible, restorable rail whenever the vault or AI pane is collapsed, including after the panes have swapped sides.

**Architecture:** `FileTree` owns transient expansion state keyed by folder path and reads the existing notes store for active-file state. `AppLayout` continues to own persisted visibility and ordering settings, but turns each logical pane into a placement-aware layout item that is either an expanded pane with a separator or a collapsed rail. No settings schema change is required because the existing visibility and position fields already express the needed persisted state.

**Tech Stack:** React 19, TypeScript, Zustand, TanStack Query, Lucide React, Vitest with Testing Library, WebdriverIO desktop-shell smoke test, CSS Grid.

---

### Task 1: Specify and test tree expansion behavior

**Files:**
- Modify: `src/features/notes/components/FileTree.test.tsx`
- Modify: `src/features/notes/components/FileTree.tsx`

- [ ] **Step 0: Add reusable test fixtures and reset the notes store**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FileTreeNode } from "../types";
import { useNotesStore } from "../hooks";

const testVault = {
  id: "vault:/Users/test/notes",
  name: "notes",
  path: "/Users/test/notes",
  lastOpenedAt: null,
};

function fileNode(name: string, path = name) {
  return { name, path, kind: "file" as const, children: [] };
}

function folderNode(name: string, children: FileTreeNode[], path = name) {
  return { name, path, kind: "folder" as const, children };
}

beforeEach(() => {
  listMarkdownFilesMock.mockReset();
  useVaultStore.getState().setCurrentVault(null);
  useNotesStore.getState().setActivePath(null);
});
```

- [ ] **Step 1: Add a failing top-level folder-collapse test**

```tsx
it("collapses and expands a top-level folder without hiding sibling files", async () => {
  useVaultStore.getState().setCurrentVault(testVault);
  listMarkdownFilesMock.mockResolvedValue([
    fileNode("README.md"),
    folderNode("projects", [fileNode("Plan.md", "projects/Plan.md")]),
  ]);

  render(<FileTree />, { wrapper: TestProvider });

  const projects = await screen.findByRole("button", { name: "projects" });
  expect(projects).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();

  fireEvent.click(projects);

  expect(projects).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("button", { name: "Plan.md" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "README.md" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm it fails because folders have no expansion state**

Run: `pnpm test src/features/notes/components/FileTree.test.tsx`

Expected: FAIL because the folder button does not expose `aria-expanded` and its child remains visible after the click.

- [ ] **Step 3: Add failing nested-folder and active-file tests**

```tsx
it("only toggles the selected nested folder", async () => {
  useVaultStore.getState().setCurrentVault(testVault);
  listMarkdownFilesMock.mockResolvedValue([
    folderNode("projects", [
      folderNode("research", [fileNode("Notes.md", "projects/research/Notes.md")], "projects/research"),
      folderNode("delivery", [fileNode("Plan.md", "projects/delivery/Plan.md")], "projects/delivery"),
    ]),
  ]);

  render(<FileTree />, { wrapper: TestProvider });

  fireEvent.click(await screen.findByRole("button", { name: "projects" }));
  fireEvent.click(screen.getByRole("button", { name: "delivery" }));
  fireEvent.click(screen.getByRole("button", { name: "research" }));

  expect(screen.getByRole("button", { name: "Notes.md" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "research" }));

  expect(screen.queryByRole("button", { name: "Notes.md" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();
});

it("expands the active file ancestors and marks its row current", async () => {
  useNotesStore.getState().setActivePath("projects/research/Notes.md");
  useVaultStore.getState().setCurrentVault(testVault);
  listMarkdownFilesMock.mockResolvedValue([
    folderNode("projects", [
      folderNode("research", [fileNode("Notes.md", "projects/research/Notes.md")], "projects/research"),
    ]),
  ]);

  render(<FileTree />, { wrapper: TestProvider });

  expect(await screen.findByRole("button", { name: "Notes.md" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
```

- [ ] **Step 4: Implement the minimum tree state and semantics**

```tsx
const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
const activePath = useNotesStore((state) => state.activePath);

function initialExpandedFolders(nodes: FileTreeNode[], activePath: string | null) {
  const expanded = new Set(
    nodes.filter((node) => node.kind === "folder").map((node) => node.path),
  );

  function collect(node: FileTreeNode) {
    if (node.kind === "folder" && activePath?.startsWith(`${node.path}/`)) {
      expanded.add(node.path);
    }
    node.children?.forEach(collect);
  }

  nodes.forEach(collect);
  return expanded;
}

useEffect(() => {
  setExpandedFolders(initialExpandedFolders(nodes, activePath));
}, [nodes, activePath]);

function toggleFolder(path: string) {
  setExpandedFolders((current) => {
    const next = new Set(current);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  });
}
```

Pass `expandedFolders.has(node.path)` to each folder row and render its child group only when true. Render folders with a disclosure button, `ChevronRight`/`ChevronDown`, and `aria-expanded`. Render files as note-opening buttons with `aria-current={activePath === node.path ? "page" : undefined}` and an `is-active` class. Keep note read and save-state failure handling exactly as today.

- [ ] **Step 5: Run the focused FileTree tests and confirm they pass**

Run: `pnpm test src/features/notes/components/FileTree.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the tree behavior**

```bash
git add src/features/notes/components/FileTree.tsx src/features/notes/components/FileTree.test.tsx
git commit -m "feat: add collapsible vault file tree"
```

### Task 2: Add placement-aware collapsed rails for workspace panes

**Files:**
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/shared/styles/globals.css`

- [ ] **Step 0: Extract the shared settings fixture and import `within`**

```tsx
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const defaultSettings = {
  model: "gpt-4.1-mini",
  aiReadScope: "current_note" as const,
  autosave: true,
  syncPreviewScroll: true,
  leftPaneWidth: 288,
  rightPaneWidth: 336,
  previewPaneWidth: 360,
  leftPaneVisible: true,
  rightPaneVisible: true,
  aiPaneOnLeft: false,
};
```

Replace the repeated `getSettingsMock.mockResolvedValue({...})` default object in `beforeEach` with `getSettingsMock.mockResolvedValue(defaultSettings)`.

- [ ] **Step 1: Add a failing vault-rail test**

```tsx
it("renders a vault restore rail when file navigation is collapsed", async () => {
  getSettingsMock.mockResolvedValue({ ...defaultSettings, leftPaneVisible: false });
  render(<TestProviders><App /></TestProviders>);

  const rail = await screen.findByLabelText("Collapsed file navigation");
  expect(rail).toBeInTheDocument();
  expect(within(rail).getByRole("button", { name: "Show file navigation" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Vault navigation")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused App test and confirm it fails**

Run: `pnpm test src/app/App.test.tsx`

Expected: FAIL because the current hidden state has only an unlabelled floating button, not a `Collapsed file navigation` rail.

- [ ] **Step 3: Add failing AI-rail and post-swap placement tests**

```tsx
it("renders the collapsed AI rail on the first workspace edge after swapping", async () => {
  getSettingsMock.mockResolvedValue({
    ...defaultSettings,
    aiPaneOnLeft: true,
    rightPaneVisible: false,
  });
  render(<TestProviders><App /></TestProviders>);

  const shell = await screen.findByTestId("app-shell");
  const rail = screen.getByLabelText("Collapsed AI assistant");
  expect(rail).toHaveAttribute("data-edge", "left");
  expect(within(rail).getByRole("button", { name: "Show AI assistant" })).toBeInTheDocument();
  expect(shell).toHaveStyle({ "--first-pane-width": "44px" });
});

it("moves a collapsed vault rail to the right edge after the swap command", async () => {
  getSettingsMock.mockResolvedValue({ ...defaultSettings, leftPaneVisible: false });
  render(<TestProviders><App /></TestProviders>);

  fireEvent.click(await screen.findByRole("button", { name: "Move AI assistant to left" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Collapsed file navigation")).toHaveAttribute("data-edge", "right");
  });
});
```

- [ ] **Step 4: Implement a logical-pane layout item**

Create a local `WorkspacePane` type with `id`, `visible`, `width`, `pane`, `resizer`, and `rail`. Build the vault and AI items from their logical visibility settings. Each rail is an `<aside>` with `className="collapsed-pane-rail"`, an `aria-label`, a `data-edge` derived after order selection, and exactly one icon-only `Button` that calls the existing visibility toggle.

Replace the `firstPane`/`firstResizer` and `secondPane`/`secondResizer` pairs with two ordered items whose render functions receive `"left" | "right"`. A visible item renders its full pane plus separator. A hidden item renders only its rail. Compute `firstPaneWidth` and `secondPaneWidth` after the AI/vault order is resolved, using `44` for a collapsed item and its logical persisted width for an expanded item. Publish them as `--first-pane-width` and `--second-pane-width`; this keeps AI and vault widths attached to the correct pane after swapping.

- [ ] **Step 5: Add the rail CSS**

```css
.collapsed-pane-rail {
  align-items: flex-start;
  background: rgba(255, 252, 246, 0.92);
  border-color: rgba(23, 32, 27, 0.16);
  border-style: solid;
  display: flex;
  min-height: calc(100vh - 34px);
  padding: 8px 4px;
}

.collapsed-pane-rail[data-edge="left"] { border-width: 0 1px 0 0; }
.collapsed-pane-rail[data-edge="right"] { border-width: 0 0 0 1px; }

.app-shell {
  grid-template-columns:
    var(--first-pane-width) 8px minmax(460px, 1fr) 8px
    var(--second-pane-width);
}
```

Keep the grid column structure stable and do not show a resize separator while a rail is rendered.

- [ ] **Step 6: Run App tests and confirm they pass**

Run: `pnpm test src/app/App.test.tsx`

Expected: PASS, including existing resize, persistence, hide/show, and swap coverage.

- [ ] **Step 7: Commit the collapsed-rail behavior**

```bash
git add src/app/layout.tsx src/app/App.test.tsx src/shared/styles/globals.css
git commit -m "feat: add restorable workspace pane rails"
```

### Task 3: Extend the real desktop workflow

**Files:**
- Modify: `e2e-desktop/shell-smoke.mjs`

- [ ] **Step 1: Add a failing desktop workflow assertion for vault collapse and restore**

Add this after the shell confirms the seeded note is visible:

```js
await clickButton(browser, "Hide file navigation");
await browser.$('[aria-label="Collapsed file navigation"]').waitForDisplayed();
await clickButton(browser, "Show file navigation");
await browser.$('[aria-label="Vault navigation"]').waitForDisplayed();
```

- [ ] **Step 2: Run the desktop smoke test and confirm the current implementation fails its rail assertion**

Run: `pnpm desktop:e2e`

Expected: FAIL before Task 2 is complete because the rail label is absent.

- [ ] **Step 3: Add swap and AI collapse/restore assertions**

```js
await clickButton(browser, "Move AI assistant to left");
await clickButton(browser, "Hide AI assistant");
await browser.$('[aria-label="Collapsed AI assistant"]').waitForDisplayed();
await clickButton(browser, "Show AI assistant");
await browser.$('[aria-label="AI assistant"]').waitForDisplayed();
await browser.$('[aria-label="Markdown editor"]').waitForDisplayed();
```

- [ ] **Step 4: Run the desktop smoke test and confirm it passes**

Run: `pnpm desktop:e2e`

Expected: PASS.

- [ ] **Step 5: Commit the desktop coverage**

```bash
git add e2e-desktop/shell-smoke.mjs
git commit -m "test: cover workspace pane rail workflow"
```

### Task 4: Validate the feature and update project status

**Files:**
- Modify: `PROJECT_STATUS.md`

- [ ] **Step 1: Run focused frontend regressions**

Run: `pnpm test src/features/notes/components/FileTree.test.tsx src/app/App.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run the complete verification gate**

Run: `pnpm check`

Expected: PASS: typecheck, lint, all Vitest files, Playwright, desktop shell, Rust fmt, clippy, and Rust tests.

- [ ] **Step 3: Update status evidence**

Update `PROJECT_STATUS.md` to record the new completion point, including the VS Code-style tree, restorable rails, placement-aware swap behavior, the latest full-check test counts, and any remaining limitation. Remove stale wording that says layout visibility or panel swapping is unimplemented.

- [ ] **Step 4: Review the final diff and status**

Run: `git diff --check && git status --short && git log -4 --oneline`

Expected: no whitespace errors; only intended source, test, documentation, and existing user-owned `tmp/` changes appear.

- [ ] **Step 5: Commit and push the finished feature**

```bash
git add PROJECT_STATUS.md
git commit -m "docs: record collapsible workspace panes"
git push origin main
```
