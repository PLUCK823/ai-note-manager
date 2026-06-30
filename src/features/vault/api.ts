import { callCommand } from "../../shared/lib/tauri";
import type { VaultInfo } from "./types";

export function selectVault() {
  return callCommand<VaultInfo>("select_vault");
}

export function getRecentVault() {
  return callCommand<VaultInfo | null>("get_recent_vault");
}
