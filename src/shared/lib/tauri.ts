import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function callCommand<TResponse>(
  command: string,
  args?: Record<string, unknown>,
) {
  return invoke<TResponse>(command, args);
}

export function listenToEvent<TPayload>(
  eventName: string,
  handler: (payload: TPayload) => void,
) {
  return listen<TPayload>(eventName, (event) => handler(event.payload));
}
