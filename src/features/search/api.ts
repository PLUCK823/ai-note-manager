import { callCommand } from "../../shared/lib/tauri";
import type { SearchResult } from "./types";

export function searchNotes(vaultId: string, query: string) {
  return callCommand<SearchResult[]>("search_notes", { vaultId, query });
}
