import { Sparkles } from "lucide-react";

import { useEditorStore } from "../../editor/editorState";
import { aiActions } from "../actions";
import { runAiAction } from "../api";
import { useAiStore } from "../aiState";
import type { AiAction } from "../types";

const writingActions = new Set<AiAction>([
  "rewrite_selection",
  "compress_selection",
  "expand_selection",
]);

export function AiActionBar() {
  const noteContent = useEditorStore((state) => state.content);
  const selection = useEditorStore((state) => state.selection);
  const setRunning = useAiStore((state) => state.setRunning);
  const setOutput = useAiStore((state) => state.setOutput);
  const setFailed = useAiStore((state) => state.setFailed);

  async function handleAction(action: AiAction) {
    setRunning();
    try {
      const selectedRange = writingActions.has(action) ? selection : null;
      const result = await runAiAction({
        action,
        noteContent,
        ...(selectedRange ? { selectedText: selectedRange.text } : {}),
      });
      setOutput(
        result.output,
        writingActions.has(action)
          ? selectedRange
            ? {
                end: selectedRange.end,
                original: selectedRange.text,
                replacement: result.output,
                start: selectedRange.start,
              }
            : { original: noteContent, replacement: result.output }
          : null,
      );
    } catch {
      setFailed();
    }
  }

  return (
    <div className="ai-actions" aria-label="AI actions">
      {aiActions.map((action) => (
        <button
          className="ai-action"
          key={action.id}
          type="button"
          onClick={() => handleAction(action.id)}
        >
          <Sparkles size={14} aria-hidden="true" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
