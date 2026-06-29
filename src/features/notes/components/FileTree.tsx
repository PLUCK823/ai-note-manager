import { useQuery } from "@tanstack/react-query";
import { File, Folder } from "lucide-react";

import { useVaultStore } from "../../vault/hooks";
import { listMarkdownFiles } from "../api";
import type { FileTreeNode } from "../types";

export function FileTree() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const fileTreeQuery = useQuery({
    queryKey: ["markdown-files", currentVault?.id],
    queryFn: () => listMarkdownFiles(currentVault!.id),
    enabled: Boolean(currentVault),
  });

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

  const nodes = fileTreeQuery.data ?? [];

  return (
    <nav className="file-tree" aria-label="Markdown file tree">
      {nodes.length > 0 ? (
        nodes.map((node) => <TreeNode key={node.path} node={node} depth={0} />)
      ) : (
        <span className="empty-tree">No Markdown files found.</span>
      )}
    </nav>
  );
}

function TreeNode({ depth, node }: { depth: number; node: FileTreeNode }) {
  const Icon = node.kind === "folder" ? Folder : File;

  return (
    <div className="tree-node">
      <button
        className="tree-item"
        style={{ paddingLeft: `${10 + depth * 14}px` }}
        type="button"
      >
        <Icon size={15} aria-hidden="true" />
        {node.name}
      </button>
      {node.children?.map((child) => (
        <TreeNode depth={depth + 1} key={child.path} node={child} />
      ))}
    </div>
  );
}
