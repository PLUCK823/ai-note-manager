import { useAiStore } from "../aiState";

export function AiResultPreview() {
  const output = useAiStore((state) => state.output);
  const status = useAiStore((state) => state.status);
  const outputBlocks = output
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <section className="ai-preview" aria-label="AI result preview">
      <p className="eyebrow">Preview before writing</p>
      {status === "running" ? <p>Running AI action...</p> : null}
      {status === "failed" ? <p>AI action failed.</p> : null}
      {outputBlocks.length > 0 ? (
        <div className="ai-output" aria-label="AI output">
          {outputBlocks.map((block) => (
            <pre key={block}>{block}</pre>
          ))}
        </div>
      ) : status === "idle" ? (
        <p>
          AI suggestions will appear here before any note changes are applied.
        </p>
      ) : null}
    </section>
  );
}
