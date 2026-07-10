import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setExpandedFolders(initialExpandedFolders(nodes, activePath));
  }, [activePath, nodes]);

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

  function toggleFolder(path: string) {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
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
            expandedFolders={expandedFolders}
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

function initialExpandedFolders(
  nodes: FileTreeNode[],
  activePath: string | null,
) {
  const expanded = new Set(
    nodes
      .filter((node) => node.kind === "folder")
      .map((node) => node.path),
  );

  function collectActiveAncestors(node: FileTreeNode) {
    if (node.kind === "folder" && activePath?.startsWith(`${node.path}/`)) {
      expanded.add(node.path);
    }
    node.children?.forEach(collectActiveAncestors);
  }

  nodes.forEach(collectActiveAncestors);
  return expanded;
}

function TreeNode({
  activePath,
  depth,
  expandedFolders,
  node,
  onToggleFolder,
}: {
  activePath: string | null;
  depth: number;
  expandedFolders: Set<string>;
  node: FileTreeNode;
  onToggleFolder: (path: string) => void;
}) {
  const currentVault = useVaultStore((state) => state.currentVault);
  const setActivePath = useNotesStore((state) => state.setActivePath);
  const loadContent = useEditorStore((state) => state.loadContent);
  const setSaveState = useEditorStore((state) => state.setSaveState);
  const isFolder = node.kind === "folder";
  const isExpanded = isFolder && expandedFolders.has(node.path);
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
          onClick={() => onToggleFolder(node.path)}
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
              expandedFolders={expandedFolders}
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
