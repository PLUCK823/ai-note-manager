import { callCommand } from "../../shared/lib/tauri";
import type { FileTreeNode, NoteContent } from "./types";

export function listMarkdownFiles(vaultId: string) {
  return callCommand<FileTreeNode[]>("list_markdown_files", { vaultId });
}

export function readNote(vaultId: string, path: string) {
  return callCommand<NoteContent>("read_note", { vaultId, path });
}
