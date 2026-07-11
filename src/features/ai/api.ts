import { callCommand } from "../../shared/lib/tauri";
import type {
  AiRunInput,
  WorkspaceOperation,
  WorkspaceOperationResult,
  WorkspacePlan,
} from "./types";

export function runAiAction(input: AiRunInput) {
  return callCommand<{ requestId: string }>("run_ai_action", {
    input,
  });
}

export function cancelAiAction(requestId: string) {
  return callCommand<void>("cancel_ai_action", { requestId });
}

export function planWorkspaceChanges(input: {
  vaultId: string;
  instruction: string;
  activePath?: string;
  selectedText?: string;
}) {
  return callCommand<WorkspacePlan>("plan_workspace_changes", { input });
}

export function applyWorkspacePlan(
  vaultId: string,
  operations: WorkspaceOperation[],
) {
  return callCommand<{ results: WorkspaceOperationResult[] }>(
    "apply_workspace_plan",
    { input: { vaultId, operations } },
  );
}
