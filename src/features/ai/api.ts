import { callCommand } from "../../shared/lib/tauri";
import type { AiRunInput } from "./types";

export function runAiAction(input: AiRunInput) {
  return callCommand<{ requestId: string }>("run_ai_action", {
    input,
  });
}

export function cancelAiAction(requestId: string) {
  return callCommand<void>("cancel_ai_action", { requestId });
}
