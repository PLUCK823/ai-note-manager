import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";

import { useEditorStore } from "../../editor/editorState";
import { useVaultStore } from "../../vault/hooks";
import { listMarkdownFiles, readNote } from "../api";
import { useNotesStore } from "../hooks";
import type { FileTreeNode } from "../types";

const EMPTY_NODES: FileTreeNode[] = [];

export function FileTree() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const fileTreeQuery = useQuery({
    queryKey: ["markdown-files", currentVault?.id],
    queryFn: () => listMarkdownFiles(currentVault!.id),
    enabled: Boolean(currentVault),
  });
  const nodes = fileTreeQuery.data ?? EMPTY_NODES;
  const activePath = useNotesStore((state) => state.activePath);
  const [folderExpansion, setFolderExpansion] = useState<Map<string, boolean>>(
    () => new Map(),
  );

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
      const next = new Map(current);
      next.set(path, expanded);
      return next;
    });
  }

  return (
    <nav className="file-tree" aria-label="Markdown file tree">
      {nodes.length > 0 ? (
        nodes.map((node) => (
          <TreeNode
            activePath={activePath}
            depth={0}
            folderExpansion={folderExpansion}
            key={node.path}
            node={node}
            onToggleFolder={toggleFolder}
          />
        ))
      ) : (
        <span className="empty-tree">No Markdown files found.</span>
      )}
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
