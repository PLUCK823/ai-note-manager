import { useQueryClient } from "@tanstack/react-query";
import { Check, FileSearch, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useEditorStore } from "../../editor/editorState";
import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { applyWorkspacePlan, planWorkspaceChanges } from "../api";
import type {
  WorkspaceOperation,
  WorkspaceOperationResult,
  WorkspacePlan,
} from "../types";

const operationLabels: Record<WorkspaceOperation["kind"], string> = {
  create: "Create",
  delete: "Delete",
  read: "Read",
  search: "Search",
  update: "Replace",
};

export function WorkspaceAssistant() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const activePath = useNotesStore((state) => state.activePath);
  const selectedText = useEditorStore((state) => state.selection?.text);
  const queryClient = useQueryClient();
  const [instruction, setInstruction] = useState("");
  const [plan, setPlan] = useState<WorkspacePlan | null>(null);
  const [selectedOperations, setSelectedOperations] = useState<Set<number>>(
    new Set(),
  );
  const [results, setResults] = useState<WorkspaceOperationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  async function createPlan() {
    if (!currentVault || !instruction.trim()) {
      return;
    }

    setError(null);
    setResults([]);
    setIsPlanning(true);
    try {
      const nextPlan = await planWorkspaceChanges({
        vaultId: currentVault.id,
        instruction: instruction.trim(),
        ...(activePath ? { activePath } : {}),
        ...(selectedText ? { selectedText } : {}),
      });
      setPlan(nextPlan);
      setSelectedOperations(
        new Set(nextPlan.operations.map((_, index) => index)),
      );
    } catch {
      setPlan(null);
      setError(
        "AI could not create a workspace plan. Check the selected provider and API key.",
      );
    } finally {
      setIsPlanning(false);
    }
  }

  async function applyPlan() {
    if (!currentVault || !plan) {
      return;
    }

    const operations = plan.operations.filter((_, index) =>
      selectedOperations.has(index),
    );
    if (operations.length === 0) {
      return;
    }

    setError(null);
    setIsApplying(true);
    try {
      const response = await applyWorkspacePlan(currentVault.id, operations);
      setResults(response.results);
      await queryClient.invalidateQueries({
        queryKey: ["markdown-files", currentVault.id],
      });
    } catch {
      setError("The selected workspace changes could not be applied.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <section
      className="workspace-assistant"
      aria-label="AI workspace assistant"
    >
      <div className="workspace-assistant-heading">
        <div>
          <p className="eyebrow">Workspace agent</p>
          <h3>Plan file work</h3>
        </div>
        <ShieldCheck aria-hidden="true" size={16} />
      </div>
      <textarea
        aria-label="Workspace instruction"
        placeholder="Summarize the roadmap files, create a release note, and update the plan."
        value={instruction}
        onChange={(event) => setInstruction(event.currentTarget.value)}
      />
      <button
        className="workspace-plan-button"
        disabled={!currentVault || !instruction.trim() || isPlanning}
        type="button"
        onClick={() => void createPlan()}
      >
        <FileSearch size={15} aria-hidden="true" />
        {isPlanning ? "Planning..." : "Create plan"}
      </button>
      {error ? <p className="inline-error">{error}</p> : null}
      {plan ? (
        <div className="workspace-plan" aria-label="Workspace change plan">
          <p>{plan.summary}</p>
          {plan.operations.map((operation, index) => (
            <label
              className="workspace-operation"
              key={`${operation.kind}-${operation.path}-${index}`}
            >
              <input
                checked={selectedOperations.has(index)}
                type="checkbox"
                onChange={() => {
                  setSelectedOperations((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  });
                }}
              />
              <span className={`workspace-operation-kind is-${operation.kind}`}>
                {operationLabels[operation.kind]}
              </span>
              <span className="workspace-operation-path">
                {operation.path ?? operation.query ?? "Workspace"}
              </span>
              <small>{operation.reason}</small>
              {operation.content ? <pre>{operation.content}</pre> : null}
            </label>
          ))}
          <button
            className="workspace-apply-button"
            disabled={selectedOperations.size === 0 || isApplying}
            type="button"
            onClick={() => void applyPlan()}
          >
            <Play size={15} aria-hidden="true" />
            {isApplying ? "Applying..." : "Apply selected changes"}
          </button>
        </div>
      ) : null}
      {results.length > 0 ? (
        <div
          className="workspace-results"
          aria-label="Workspace operation results"
        >
          {results.map((result, index) => (
            <p key={`${result.kind}-${result.path}-${index}`}>
              <Check size={14} aria-hidden="true" />
              {result.message}: {result.path ?? "Workspace"}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
