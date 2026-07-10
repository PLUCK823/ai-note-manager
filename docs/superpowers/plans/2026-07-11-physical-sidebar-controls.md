# Physical Sidebar Controls Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make sidebar collapse and restore controls follow the physical left or right workspace edge after pane swapping.

**Architecture:** Render each logical pane through an edge-aware item helper. Expanded panes receive a header control addressed by their edge; collapsed panes render a matching rail. The workspace toolbar retains only swapping.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Playwright, WebdriverIO, CSS Grid.

---

### Task 1: Add failing physical-edge regression tests

**Files:**
- Modify: `src/app/App.test.tsx`

- [ ] Add a test that starts with `aiPaneOnLeft: true`, clicks `Collapse left sidebar` inside `AI assistant`, and expects a left `Collapsed AI assistant` rail while `Vault navigation` remains visible.
- [ ] Add a default-layout test that clicks `Collapse left sidebar` inside `Vault navigation`, expects a left vault rail, and retains AI.
- [ ] Assert the workspace toolbar has no `Collapse left sidebar` or `Collapse right sidebar` control.
- [ ] Run: `pnpm test src/app/App.test.tsx`. Expected: FAIL because controls are in the workspace toolbar and retain logical-pane labels.

### Task 2: Render edge-owned controls and stable rails

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/features/ai/components/AiSidebar.tsx`
- Modify: `src/shared/styles/globals.css`

- [ ] Replace logical toolbar visibility controls with the swap button only.
- [ ] Pass `edge`, `onCollapse`, and a physical-edge aria label into each expanded sidebar.
- [ ] Render `Collapse left sidebar` or `Collapse right sidebar` in each sidebar header; call the visibility toggle for the pane rendered there.
- [ ] Render `Expand left sidebar` or `Expand right sidebar` in the same edge's rail.
- [ ] Ensure an expanded item emits pane plus interior separator and a collapsed item emits only the 44px rail.
- [ ] Run: `pnpm test src/app/App.test.tsx`. Expected: PASS.

### Task 3: Verify real workflows and document state

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Modify: `e2e-desktop/shell-smoke.mjs`
- Modify: `PROJECT_STATUS.md`

- [ ] Add browser smoke coverage for swapping and collapsing the physical left sidebar.
- [ ] Update desktop smoke labels to physical-edge controls and verify collapsing after swap preserves the opposite side.
- [ ] Update project status with the corrected edge-owned controls and current verification counts.
- [ ] Run: `pnpm check`.
- [ ] Commit and push the implementation.
