import { Clipboard, CornerDownLeft, ListEnd, Square } from "lucide-react";

import { useEditorStore } from "../../editor/editorState";
import { useAiStore } from "../aiState";

export function AiResultPreview() {
  const output = useAiStore((state) => state.output);
  const status = useAiStore((state) => state.status);
  const cancelGeneration = useAiStore((state) => state.cancelGeneration);
  const setPendingChange = useAiStore((state) => state.setPendingChange);
  const content = useEditorStore((state) => state.content);
  const cursorPosition = useEditorStore((state) => state.cursorPosition);
  const outputBlocks = output
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  function copyOutput() {
    void navigator.clipboard?.writeText(output);
  }

  function insertAtCursor() {
    const insertion = `${output.trim()}\n\n`;
    setPendingChange({
      end: cursorPosition,
      original: "",
      replacement: insertion,
      start: cursorPosition,
    });
  }

  function appendToNote() {
    const insertion = `${content.trimEnd() ? "\n\n" : ""}${output.trim()}`;
    setPendingChange({
      end: content.length,
      original: "",
      replacement: insertion,
      start: content.length,
    });
  }

  return (
    <section className="ai-preview" aria-label="AI result preview">
      <p className="eyebrow">Preview before writing</p>
      {status === "running" ? (
        <div className="ai-preview-status">
          <p>Running AI action...</p>
          <button
            className="ai-tool-button"
            type="button"
            onClick={cancelGeneration}
          >
            <Square size={13} aria-hidden="true" />
            Cancel generation
          </button>
        </div>
      ) : null}
      {status === "failed" ? <p>AI action failed.</p> : null}
      {outputBlocks.length > 0 ? (
        <>
          <div className="ai-output-toolbar">
            <button
              className="ai-tool-button"
              type="button"
              onClick={copyOutput}
            >
              <Clipboard size={13} aria-hidden="true" />
              Copy output
            </button>
            <button
              className="ai-tool-button"
              type="button"
              onClick={insertAtCursor}
            >
              <CornerDownLeft size={13} aria-hidden="true" />
              Insert at cursor
            </button>
            <button
              className="ai-tool-button"
              type="button"
              onClick={appendToNote}
            >
              <ListEnd size={13} aria-hidden="true" />
              Append to note
            </button>
          </div>
          <div className="ai-output" aria-label="AI output">
            {outputBlocks.map((block) => (
              <pre key={block}>{block}</pre>
            ))}
          </div>
        </>
      ) : status === "idle" ? (
        <p>
          AI suggestions will appear here before any note changes are applied.
        </p>
      ) : null}
    </section>
  );
}
