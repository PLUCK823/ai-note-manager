import { callCommand } from "../../shared/lib/tauri";
import type { AppSettings } from "./types";

export function getSettings() {
  return callCommand<AppSettings>("get_settings");
}

export function updateSettings(input: AppSettings) {
  return callCommand<AppSettings>("update_settings", { input });
}

export function saveApiKey(provider: string, apiKey: string) {
  return callCommand<{ provider: string; saved: boolean }>("save_api_key", {
    provider,
    apiKey,
  });
}

export function checkAiProvider(input: AppSettings) {
  return callCommand<boolean>("check_ai_provider", { input });
}
