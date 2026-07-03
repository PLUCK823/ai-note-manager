import { type CSSProperties, type PointerEvent, useState } from "react";
import { FileText, PanelRight, Search, Settings } from "lucide-react";

import { AiSidebar } from "../features/ai/components/AiSidebar";
import { DiskChangeNotice } from "../features/editor/components/DiskChangeNotice";
import { MarkdownEditor } from "../features/editor/components/MarkdownEditor";
import { MarkdownPreview } from "../features/editor/components/MarkdownPreview";
import { SaveStatus } from "../features/editor/components/SaveStatus";
import { FileTree } from "../features/notes/components/FileTree";
import { NoteHeader } from "../features/notes/components/NoteHeader";
import { NoteTabs } from "../features/notes/components/NoteTabs";
import { SearchBox } from "../features/search/components/SearchBox";
import { SearchResults } from "../features/search/components/SearchResults";
import { SettingsPage } from "../features/settings/components/SettingsPage";
import { VaultPicker } from "../features/vault/components/VaultPicker";
import { VaultStatus } from "../features/vault/components/VaultStatus";
import { Button } from "../shared/components/Button";

const OUTER_LAYOUT_LIMITS = {
  left: { defaultValue: 288, min: 220, max: 420 },
  right: { defaultValue: 336, min: 260, max: 520 },
};

const SPLIT_LAYOUT_LIMITS = {
  preview: { defaultValue: 360, min: 240, max: 640 },
};

export function AppLayout() {
  const [editorMode, setEditorMode] = useState<"edit" | "split" | "preview">(
    "split",
  );
  const [leftWidth, setLeftWidth] = useState(OUTER_LAYOUT_LIMITS.left.defaultValue);
  const [rightWidth, setRightWidth] = useState(
    OUTER_LAYOUT_LIMITS.right.defaultValue,
  );
  const [previewWidth, setPreviewWidth] = useState(
    SPLIT_LAYOUT_LIMITS.preview.defaultValue,
  );
  const showEditor = editorMode === "edit" || editorMode === "split";
  const showPreview = editorMode === "preview" || editorMode === "split";
  const shellStyle = {
    "--vault-pane-width": `${leftWidth}px`,
    "--ai-pane-width": `${rightWidth}px`,
    "--preview-pane-width": `${previewWidth}px`,
  } as CSSProperties;

  return (
    <div className="app-shell" data-testid="app-shell" style={shellStyle}>
      <aside className="vault-pane" aria-label="Vault navigation">
        <div className="brand-bar">
          <div>
            <p className="eyebrow">Local Markdown</p>
            <h1>AI Note Manager</h1>
          </div>
          <Button type="button" variant="ghost" aria-label="Settings">
            <Settings size={18} aria-hidden="true" />
          </Button>
        </div>
        <VaultPicker />
        <VaultStatus />
        <SearchBox />
        <SearchResults />
        <FileTree />
      </aside>

      <ResizeSeparator
        ariaLabel="Resize file navigation"
        className="workspace-resizer workspace-resizer-left"
        max={OUTER_LAYOUT_LIMITS.left.max}
        min={OUTER_LAYOUT_LIMITS.left.min}
        value={leftWidth}
        onResize={setLeftWidth}
      />

      <main className="workspace" aria-label="Note workspace">
        <NoteTabs />
        <NoteHeader />
        <DiskChangeNotice />
        <div className="workspace-toolbar">
          <span className="toolbar-title">
            <FileText size={16} aria-hidden="true" />
            Markdown
          </span>
          <div
            aria-label="Editor view mode"
            className="segmented-control"
            role="group"
          >
            {(["edit", "split", "preview"] as const).map((mode) => (
              <button
                aria-pressed={editorMode === mode}
                className="segment-button"
                key={mode}
                type="button"
                onClick={() => setEditorMode(mode)}
              >
                {mode === "edit"
                  ? "Edit"
                  : mode === "split"
                    ? "Split"
                    : "Preview"}
              </button>
            ))}
          </div>
          <SaveStatus />
        </div>
        <section
          className={`editor-grid editor-grid-${editorMode}`}
          aria-label="Editor and preview"
        >
          {showEditor ? (
            <div className="editor-surface">
              <MarkdownEditor />
            </div>
          ) : null}
          {editorMode === "split" ? (
            <ResizeSeparator
              ariaLabel="Resize editor and preview"
              className="workspace-resizer editor-preview-resizer"
              max={SPLIT_LAYOUT_LIMITS.preview.max}
              min={SPLIT_LAYOUT_LIMITS.preview.min}
              value={previewWidth}
              onResize={setPreviewWidth}
              reverse
            />
          ) : null}
          {showPreview ? <MarkdownPreview /> : null}
        </section>
      </main>

      <ResizeSeparator
        ariaLabel="Resize AI assistant"
        className="workspace-resizer workspace-resizer-right"
        max={OUTER_LAYOUT_LIMITS.right.max}
        min={OUTER_LAYOUT_LIMITS.right.min}
        value={rightWidth}
        onResize={setRightWidth}
        reverse
      />

      <AiSidebar />

      <footer className="status-bar" aria-label="Application status">
        <span>
          <Search size={14} aria-hidden="true" />
          SQLite index idle
        </span>
        <span>
          <PanelRight size={14} aria-hidden="true" />
          AI reads current note only
        </span>
      </footer>

      <SettingsPage />
    </div>
  );
}

function ResizeSeparator({
  ariaLabel,
  className,
  max,
  min,
  onResize,
  reverse = false,
  value,
}: {
  ariaLabel: string;
  className: string;
  max: number;
  min: number;
  onResize: (value: number) => void;
  reverse?: boolean;
  value: number;
}) {
  function resize(nextValue: number) {
    onResize(clamp(nextValue, min, max));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startValue = value;

    function handlePointerMove(moveEvent: globalThis.PointerEvent) {
      const delta = moveEvent.clientX - startX;
      resize(startValue + (reverse ? -delta : delta));
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }

  return (
    <div
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={value}
      className={className}
      role="separator"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          resize(value + (reverse ? 10 : -10));
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          resize(value + (reverse ? -10 : 10));
        }
      }}
      onPointerDown={handlePointerDown}
    />
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
