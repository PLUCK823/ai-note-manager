import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelRight,
  Search,
  Settings,
} from "lucide-react";

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
import { getSettings, updateSettings } from "../features/settings/api";
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

const COLLAPSED_PANE_WIDTH = 44;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AppLayout() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const queryClient = useQueryClient();
  const [editorMode, setEditorMode] = useState<"edit" | "split" | "preview">(
    "split",
  );
  // User-modified pane widths (null means use persisted value)
  const [userLeftWidth, setUserLeftWidth] = useState<number | null>(null);
  const [userRightWidth, setUserRightWidth] = useState<number | null>(null);
  const [userPreviewWidth, setUserPreviewWidth] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editorScroller, setEditorScroller] = useState<HTMLElement | null>(
    null,
  );
  const [previewSurface, setPreviewSurface] = useState<HTMLElement | null>(
    null,
  );
  const isSyncingScrollRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showEditor = editorMode === "edit" || editorMode === "split";
  const showPreview = editorMode === "preview" || editorMode === "split";
  const syncPreviewScroll = settingsQuery.data?.syncPreviewScroll ?? true;
  const leftPaneVisible = settingsQuery.data?.leftPaneVisible ?? true;
  const rightPaneVisible = settingsQuery.data?.rightPaneVisible ?? true;
  const aiPaneOnLeft = settingsQuery.data?.aiPaneOnLeft ?? false;
  // Derive actual pane widths from user modifications or persisted settings
  const leftWidth =
    userLeftWidth ??
    settingsQuery.data?.leftPaneWidth ??
    OUTER_LAYOUT_LIMITS.left.defaultValue;
  const rightWidth =
    userRightWidth ??
    settingsQuery.data?.rightPaneWidth ??
    OUTER_LAYOUT_LIMITS.right.defaultValue;
  const previewWidth =
    userPreviewWidth ??
    settingsQuery.data?.previewPaneWidth ??
    SPLIT_LAYOUT_LIMITS.preview.defaultValue;
  const vaultPaneWidth = leftPaneVisible ? leftWidth : COLLAPSED_PANE_WIDTH;
  const aiPaneWidth = rightPaneVisible ? rightWidth : COLLAPSED_PANE_WIDTH;
  const firstPaneWidth = aiPaneOnLeft ? aiPaneWidth : vaultPaneWidth;
  const secondPaneWidth = aiPaneOnLeft ? vaultPaneWidth : aiPaneWidth;
  const firstPaneVisible = aiPaneOnLeft ? rightPaneVisible : leftPaneVisible;
  const secondPaneVisible = aiPaneOnLeft ? leftPaneVisible : rightPaneVisible;
  const shellStyle = {
    "--vault-pane-width": `${vaultPaneWidth}px`,
    "--ai-pane-width": `${aiPaneWidth}px`,
    "--first-pane-width": `${firstPaneWidth}px`,
    "--second-pane-width": `${secondPaneWidth}px`,
    "--first-separator-width": firstPaneVisible ? "8px" : "0px",
    "--second-separator-width": secondPaneVisible ? "8px" : "0px",
    "--preview-pane-width": `${previewWidth}px`,
  } as CSSProperties;

  function handleLeftWidthChange(value: number) {
    setUserLeftWidth(value);
  }

  function handleRightWidthChange(value: number) {
    setUserRightWidth(value);
  }

  function handlePreviewWidthChange(value: number) {
    setUserPreviewWidth(value);
  }

  function toggleLeftPane() {
    if (!settingsQuery.data) return;
    const updatedSettings = {
      ...settingsQuery.data,
      leftPaneVisible: !leftPaneVisible,
    };
    updateSettings(updatedSettings).then((result) => {
      queryClient.setQueryData(["settings"], result);
    });
  }

  function toggleRightPane() {
    if (!settingsQuery.data) return;
    const updatedSettings = {
      ...settingsQuery.data,
      rightPaneVisible: !rightPaneVisible,
    };
    updateSettings(updatedSettings).then((result) => {
      queryClient.setQueryData(["settings"], result);
    });
  }

  function toggleSwapPanes() {
    if (!settingsQuery.data) return;
    const updatedSettings = {
      ...settingsQuery.data,
      aiPaneOnLeft: !aiPaneOnLeft,
    };
    updateSettings(updatedSettings).then((result) => {
      queryClient.setQueryData(["settings"], result);
    });
  }

  // Debounced save of pane widths to settings
  useEffect(() => {
    if (!settingsQuery.data) return;
    // Only save if user has modified the widths
    if (
      userLeftWidth === null &&
      userRightWidth === null &&
      userPreviewWidth === null
    )
      return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      const currentSettings = settingsQuery.data;
      const newLeftWidth = userLeftWidth ?? currentSettings.leftPaneWidth;
      const newRightWidth = userRightWidth ?? currentSettings.rightPaneWidth;
      const newPreviewWidth =
        userPreviewWidth ?? currentSettings.previewPaneWidth;
      if (
        currentSettings.leftPaneWidth !== newLeftWidth ||
        currentSettings.rightPaneWidth !== newRightWidth ||
        currentSettings.previewPaneWidth !== newPreviewWidth
      ) {
        const updatedSettings = {
          ...currentSettings,
          leftPaneWidth: newLeftWidth,
          rightPaneWidth: newRightWidth,
          previewPaneWidth: newPreviewWidth,
        };
        updateSettings(updatedSettings).then((result) => {
          queryClient.setQueryData(["settings"], result);
          // Clear user modifications after successful save
          setUserLeftWidth(null);
          setUserRightWidth(null);
          setUserPreviewWidth(null);
        });
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    userLeftWidth,
    userRightWidth,
    userPreviewWidth,
    settingsQuery.data,
    queryClient,
  ]);

  useEffect(() => {
    if (
      editorMode !== "split" ||
      !syncPreviewScroll ||
      !editorScroller ||
      !previewSurface
    ) {
      return;
    }

    function syncScroll(source: HTMLElement, target: HTMLElement) {
      const sourceScrollable = source.scrollHeight - source.clientHeight;
      const targetScrollable = target.scrollHeight - target.clientHeight;
      if (sourceScrollable <= 0 || targetScrollable <= 0) {
        return;
      }

      const ratio = source.scrollTop / sourceScrollable;
      target.scrollTop = Math.round(ratio * targetScrollable);
    }

    function runSyncedScroll(source: HTMLElement, target: HTMLElement) {
      if (isSyncingScrollRef.current) {
        return;
      }

      isSyncingScrollRef.current = true;
      syncScroll(source, target);
      window.setTimeout(() => {
        isSyncingScrollRef.current = false;
      }, 0);
    }

    function handleEditorScroll() {
      runSyncedScroll(editorScroller!, previewSurface!);
    }

    function handlePreviewScroll() {
      runSyncedScroll(previewSurface!, editorScroller!);
    }

    editorScroller.addEventListener("scroll", handleEditorScroll);
    previewSurface.addEventListener("scroll", handlePreviewScroll);

    return () => {
      editorScroller.removeEventListener("scroll", handleEditorScroll);
      previewSurface.removeEventListener("scroll", handlePreviewScroll);
    };
  }, [editorMode, editorScroller, previewSurface, syncPreviewScroll]);

  function renderVaultPane(edge: "left" | "right") {
    if (!leftPaneVisible) {
      return (
        <CollapsedPaneRail
          ariaLabel="Collapsed file navigation"
          edge={edge}
          showLabel={`Expand ${edge} sidebar`}
          onShow={toggleLeftPane}
        />
      );
    }

    const pane = (
      <aside
        className="vault-pane"
        aria-label="Vault navigation"
        data-edge={edge}
      >
        <div className="brand-bar">
          <div>
            <p className="eyebrow">Local Markdown</p>
            <h1>AI Note Manager</h1>
          </div>
          <div className="brand-actions">
            <Button
              type="button"
              variant="ghost"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings size={18} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Collapse ${edge} sidebar`}
              onClick={toggleLeftPane}
            >
              {edge === "left" ? (
                <PanelLeftClose size={18} aria-hidden="true" />
              ) : (
                <PanelRightClose size={18} aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
        <VaultPicker />
        <VaultStatus />
        <SearchBox />
        <SearchResults />
        <FileTree />
      </aside>
    );
    return pane;
  }

  function renderAiPane(edge: "left" | "right") {
    if (!rightPaneVisible) {
      return (
        <CollapsedPaneRail
          ariaLabel="Collapsed AI assistant"
          edge={edge}
          showLabel={`Expand ${edge} sidebar`}
          onShow={toggleRightPane}
        />
      );
    }

    return <AiSidebar edge={edge} onCollapse={toggleRightPane} />;
  }

  function renderVaultSeparator(edge: "left" | "right", slot: string) {
    if (!leftPaneVisible) {
      return (
        <div
          aria-hidden="true"
          className="workspace-separator-spacer"
          data-collapsed="true"
          data-grid-slot={slot}
        />
      );
    }

    return (
      <ResizeSeparator
        ariaLabel="Resize file navigation"
        className="workspace-resizer"
        dataGridSlot={slot}
        max={OUTER_LAYOUT_LIMITS.left.max}
        min={OUTER_LAYOUT_LIMITS.left.min}
        value={leftWidth}
        onResize={handleLeftWidthChange}
        reverse={edge === "right"}
      />
    );
  }

  function renderAiSeparator(edge: "left" | "right", slot: string) {
    if (!rightPaneVisible) {
      return (
        <div
          aria-hidden="true"
          className="workspace-separator-spacer"
          data-collapsed="true"
          data-grid-slot={slot}
        />
      );
    }

    return (
      <ResizeSeparator
        ariaLabel="Resize AI assistant"
        className="workspace-resizer"
        dataGridSlot={slot}
        max={OUTER_LAYOUT_LIMITS.right.max}
        min={OUTER_LAYOUT_LIMITS.right.min}
        value={rightWidth}
        onResize={handleRightWidthChange}
        reverse={edge === "right"}
      />
    );
  }

  const firstPane = aiPaneOnLeft
    ? renderAiPane("left")
    : renderVaultPane("left");
  const firstSeparator = aiPaneOnLeft
    ? renderAiSeparator("left", "left-separator")
    : renderVaultSeparator("left", "left-separator");
  const secondSeparator = aiPaneOnLeft
    ? renderVaultSeparator("right", "right-separator")
    : renderAiSeparator("right", "right-separator");
  const secondPane = aiPaneOnLeft
    ? renderVaultPane("right")
    : renderAiPane("right");

  return (
    <div className="app-shell" data-testid="app-shell" style={shellStyle}>
      {firstPane}
      {firstSeparator}

      <main
        className="workspace"
        aria-label="Note workspace"
        data-grid-slot="workspace"
      >
        <div className="workspace-toolbar-top">
          <Button
            type="button"
            variant="ghost"
            aria-label={
              aiPaneOnLeft
                ? "Move AI assistant to right"
                : "Move AI assistant to left"
            }
            onClick={toggleSwapPanes}
          >
            <ArrowLeftRight size={16} aria-hidden="true" />
          </Button>
        </div>
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
              <MarkdownEditor onScrollerReady={setEditorScroller} />
            </div>
          ) : null}
          {editorMode === "split" ? (
            <ResizeSeparator
              ariaLabel="Resize editor and preview"
              className="workspace-resizer editor-preview-resizer"
              max={SPLIT_LAYOUT_LIMITS.preview.max}
              min={SPLIT_LAYOUT_LIMITS.preview.min}
              value={previewWidth}
              onResize={handlePreviewWidthChange}
              reverse
            />
          ) : null}
          {showPreview ? (
            <MarkdownPreview surfaceRef={setPreviewSurface} />
          ) : null}
        </section>
      </main>

      {secondSeparator}
      {secondPane}

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

      <SettingsPage
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function CollapsedPaneRail({
  ariaLabel,
  edge,
  onShow,
  showLabel,
}: {
  ariaLabel: string;
  edge: "left" | "right";
  onShow: () => void;
  showLabel: string;
}) {
  return (
    <aside
      aria-label={ariaLabel}
      className="collapsed-pane-rail"
      data-edge={edge}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label={showLabel}
        onClick={onShow}
      >
        {edge === "left" ? (
          <PanelLeftOpen size={18} aria-hidden="true" />
        ) : (
          <PanelRightOpen size={18} aria-hidden="true" />
        )}
      </Button>
    </aside>
  );
}

function ResizeSeparator({
  ariaLabel,
  className,
  dataGridSlot,
  max,
  min,
  onResize,
  reverse = false,
  value,
}: {
  ariaLabel: string;
  className: string;
  dataGridSlot?: string;
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
      data-collapsed="false"
      data-grid-slot={dataGridSlot}
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
