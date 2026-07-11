import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  File,
  FilePlus,
  Folder,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

import { useEditorStore } from "../../editor/editorState";
import { useVaultStore } from "../../vault/hooks";
import { createFolder, createNote, listMarkdownFiles, readNote } from "../api";
import { useNotesStore } from "../hooks";
import type { FileTreeNode } from "../types";

const EMPTY_NODES: FileTreeNode[] = [];
const EMPTY_FOLDER_EXPANSION = new Map<string, boolean>();

export function FileTree() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const queryClient = useQueryClient();
  const fileTreeQuery = useQuery({
    queryKey: ["markdown-files", currentVault?.id],
    queryFn: () => listMarkdownFiles(currentVault!.id),
    enabled: Boolean(currentVault),
  });
  const nodes = fileTreeQuery.data ?? EMPTY_NODES;
  const activePath = useNotesStore((state) => state.activePath);
  const [folderExpansion, setFolderExpansion] = useState(() => ({
    vaultId: null as string | null,
    values: new Map<string, boolean>(),
  }));
  const [rootExpanded, setRootExpanded] = useState(true);
  const [createKind, setCreateKind] = useState<"file" | "folder" | null>(null);
  const [newEntryName, setNewEntryName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const visibleFolderExpansion =
    folderExpansion.vaultId === currentVault?.id
      ? folderExpansion.values
      : EMPTY_FOLDER_EXPANSION;

  if (!currentVault) {
    return (
      <nav className="file-tree empty-tree" aria-label="Markdown file tree">
        Open a vault to show Markdown files.
      </nav>
    );
  }

  if (fileTreeQuery.isLoading) {
    return (
      <nav className="file-tree empty-tree" aria-label="Markdown file tree">
        Loading Markdown files...
      </nav>
    );
  }

  if (fileTreeQuery.isError) {
    return (
      <nav className="file-tree empty-tree" aria-label="Markdown file tree">
        Failed to load Markdown files.
      </nav>
    );
  }

  function toggleFolder(path: string, expanded: boolean) {
    setFolderExpansion((current) => {
      const next =
        current.vaultId === currentVault?.id
          ? new Map(current.values)
          : new Map<string, boolean>();
      next.set(path, expanded);
      return { vaultId: currentVault?.id ?? null, values: next };
    });
  }

  function collapseAll() {
    setRootExpanded(false);
  }

  async function createRootEntry() {
    if (!currentVault || !createKind || !newEntryName.trim()) {
      return;
    }

    setCreateError(null);
    try {
      if (createKind === "file") {
        await createNote(currentVault.id, "", newEntryName.trim());
      } else {
        await createFolder(currentVault.id, "", newEntryName.trim());
      }
      setNewEntryName("");
      setCreateKind(null);
      setRootExpanded(true);
      await queryClient.invalidateQueries({
        queryKey: ["markdown-files", currentVault.id],
      });
    } catch {
      setCreateError(
        createKind === "file"
          ? "Failed to create file."
          : "Failed to create folder.",
      );
    }
  }

  function beginCreate(kind: "file" | "folder") {
    setCreateKind(kind);
    setCreateError(null);
    setNewEntryName("");
  }

  return (
    <nav className="file-tree" aria-label="Markdown file tree">
      <div className="tree-root-header">
        <button
          aria-expanded={rootExpanded}
          className="tree-root-toggle"
          type="button"
          onClick={() => setRootExpanded((expanded) => !expanded)}
        >
          {rootExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
          <Folder size={16} aria-hidden="true" />
          <span>{currentVault.name}</span>
        </button>
        <div className="tree-actions" aria-label="File tree actions">
          <button
            aria-label="New file"
            title="New file"
            type="button"
            onClick={() => beginCreate("file")}
          >
            <FilePlus size={16} aria-hidden="true" />
          </button>
          <button
            aria-label="New folder"
            title="New folder"
            type="button"
            onClick={() => beginCreate("folder")}
          >
            <FolderPlus size={16} aria-hidden="true" />
          </button>
          <button
            aria-label="Refresh file tree"
            title="Refresh file tree"
            type="button"
            onClick={() => void fileTreeQuery.refetch()}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button
            aria-label="Collapse all folders"
            title="Collapse all folders"
            type="button"
            onClick={collapseAll}
          >
            <ChevronsUpDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      {createKind ? (
        <form
          className="tree-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            void createRootEntry();
          }}
        >
          <label>
            {createKind === "file" ? "New file name" : "New folder name"}
            <input
              autoFocus
              value={newEntryName}
              onChange={(event) => setNewEntryName(event.currentTarget.value)}
            />
          </label>
          <button type="submit">
            {createKind === "file" ? "Create file" : "Create folder"}
          </button>
          <button type="button" onClick={() => setCreateKind(null)}>
            Cancel
          </button>
        </form>
      ) : null}
      {createError ? <p className="inline-error">{createError}</p> : null}
      {rootExpanded ? (
        nodes.length > 0 ? (
          nodes.map((node) => (
            <TreeNode
              activePath={activePath}
              depth={0}
              folderExpansion={visibleFolderExpansion}
              key={node.path}
              node={node}
              onToggleFolder={toggleFolder}
            />
          ))
        ) : (
          <span className="empty-tree">No Markdown files found.</span>
        )
      ) : null}
    </nav>
  );
}

function TreeNode({
  activePath,
  depth,
  folderExpansion,
  node,
  onToggleFolder,
}: {
  activePath: string | null;
  depth: number;
  folderExpansion: Map<string, boolean>;
  node: FileTreeNode;
  onToggleFolder: (path: string, expanded: boolean) => void;
}) {
  const currentVault = useVaultStore((state) => state.currentVault);
  const setActivePath = useNotesStore((state) => state.setActivePath);
  const loadContent = useEditorStore((state) => state.loadContent);
  const setSaveState = useEditorStore((state) => state.setSaveState);
  const isFolder = node.kind === "folder";
  const defaultExpanded =
    depth === 0 || Boolean(activePath?.startsWith(`${node.path}/`));
  const isExpanded =
    isFolder && (folderExpansion.get(node.path) ?? defaultExpanded);
  const indent = { paddingLeft: `${8 + depth * 16}px` };

  async function handleClick() {
    if (!currentVault || node.kind !== "file") {
      return;
    }

    setSaveState("saving");
    try {
      const note = await readNote(currentVault.id, node.path);
      setActivePath(note.path);
      loadContent({ content: note.content, baseHash: note.contentHash });
    } catch {
      setSaveState("failed");
    }
  }

  return (
    <div className="tree-node">
      {isFolder ? (
        <button
          aria-expanded={isExpanded}
          className="tree-item tree-folder"
          style={indent}
          type="button"
          onClick={() => onToggleFolder(node.path, !isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown size={15} aria-hidden="true" />
          ) : (
            <ChevronRight size={15} aria-hidden="true" />
          )}
          <Folder size={15} aria-hidden="true" />
          <span>{node.name}</span>
        </button>
      ) : (
        <button
          aria-current={activePath === node.path ? "page" : undefined}
          className={`tree-item tree-file${activePath === node.path ? " is-active" : ""}`}
          style={indent}
          type="button"
          onClick={handleClick}
        >
          <File size={15} aria-hidden="true" />
          <span>{node.name}</span>
        </button>
      )}
      {isExpanded ? (
        <div className="tree-children" role="group">
          {node.children?.map((child) => (
            <TreeNode
              activePath={activePath}
              depth={depth + 1}
              folderExpansion={folderExpansion}
              key={child.path}
              node={child}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
