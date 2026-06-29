import { callCommand } from "../../shared/lib/tauri";
import type { AiRunInput } from "./types";

export function runAiAction(input: AiRunInput) {
  return callCommand<string>("run_ai_action", { input });
}
