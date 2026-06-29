import { callCommand } from "../../shared/lib/tauri";
import type { AppSettings } from "./types";

export function getSettings() {
  return callCommand<AppSettings>("get_settings");
}
