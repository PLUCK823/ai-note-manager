import { invoke } from "@tauri-apps/api/core";

export function callCommand<TResponse>(
  command: string,
  args?: Record<string, unknown>,
) {
  return invoke<TResponse>(command, args);
}
