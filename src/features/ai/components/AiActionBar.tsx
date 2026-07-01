import { Sparkles } from "lucide-react";
import { useEffect } from "react";

import { listenToEvent } from "../../../shared/lib/tauri";
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

type AiChunkEvent = {
  requestId: string;
  chunk: string;
};

type AiTerminalEvent = {
  requestId: string;
};

export function AiActionBar() {
  const noteContent = useEditorStore((state) => state.content);
  const selection = useEditorStore((state) => state.selection);
  const appendChunk = useAiStore((state) => state.appendChunk);
  const completeStream = useAiStore((state) => state.completeStream);
  const failStream = useAiStore((state) => state.failStream);
  const setBackendRequestId = useAiStore((state) => state.setBackendRequestId);
  const setRunning = useAiStore((state) => state.setRunning);
  const setFailed = useAiStore((state) => state.setFailed);

  useEffect(() => {
    let isMounted = true;
    const unlisteners: Array<() => void> = [];

    void Promise.all([
      listenToEvent<AiChunkEvent>("ai:chunk", (event) => {
        appendChunk(event.requestId, event.chunk);
      }),
      listenToEvent<AiTerminalEvent>("ai:done", (event) => {
        completeStream(event.requestId);
      }),
      listenToEvent<AiTerminalEvent>("ai:error", (event) => {
        failStream(event.requestId);
      }),
    ]).then((removeListeners) => {
      if (isMounted) {
        unlisteners.push(...removeListeners);
      } else {
        removeListeners.forEach((removeListener) => removeListener());
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
      unlisteners.forEach((removeListener) => removeListener());
    };
  }, [appendChunk, completeStream, failStream]);

  async function handleAction(action: AiAction) {
    const selectedRange = writingActions.has(action) ? selection : null;
    const streamContext = writingActions.has(action)
      ? selectedRange
        ? {
            end: selectedRange.end,
            original: selectedRange.text,
            start: selectedRange.start,
            writing: true,
          }
        : {
            original: noteContent,
            writing: true,
          }
      : {
          original: "",
          writing: false,
        };
    const requestId = setRunning(streamContext);
    try {
      const result = await runAiAction({
        action,
        noteContent,
        ...(selectedRange ? { selectedText: selectedRange.text } : {}),
      });
      setBackendRequestId(result.requestId, requestId);
    } catch {
      setFailed(requestId);
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
