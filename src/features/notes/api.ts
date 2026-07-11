import { callCommand } from "../../shared/lib/tauri";
import type { FileTreeNode, NoteContent } from "./types";

export function listMarkdownFiles(vaultId: string) {
  return callCommand<FileTreeNode[]>("list_markdown_files", { vaultId });
}

export function startVaultWatcher(vaultId: string) {
  return callCommand<void>("start_vault_watcher", { vaultId });
}

export function readNote(vaultId: string, path: string) {
  return callCommand<NoteContent>("read_note", { vaultId, path });
}

export function createNote(vaultId: string, parentPath: string, title: string) {
  return callCommand<{ path: string; title: string }>("create_note", {
    vaultId,
    parentPath,
    title,
  });
}

export function createFolder(
  vaultId: string,
  parentPath: string,
  name: string,
) {
  return callCommand<FileTreeNode>("create_folder", {
    vaultId,
    parentPath,
    name,
  });
}

export function checkNoteStatus(
  vaultId: string,
  path: string,
  baseVersion: string,
) {
  return callCommand<{
    path: string;
    modifiedAt: string;
    contentHash: string;
    changed: boolean;
  }>("check_note_status", { vaultId, path, baseVersion });
}

export function saveNote(
  vaultId: string,
  path: string,
  content: string,
  baseVersion: string,
) {
  return callCommand<{
    path: string;
    contentHash: string;
    conflict: boolean;
    snapshotPath: string | null;
  }>("save_note", {
    vaultId,
    path,
    content,
    baseVersion,
  });
}
