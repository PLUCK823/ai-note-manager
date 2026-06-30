import type { ReactNode } from "react";

import { parseMarkdownBlocks } from "../markdown";
import { useEditorStore } from "../editorState";

export function MarkdownPreview() {
  const content = useEditorStore((state) => state.content);
  const blocks = parseMarkdownBlocks(content);

  return (
    <section className="preview-surface" aria-label="Markdown preview">
      <p className="eyebrow">Preview</p>
      <div className="markdown-preview-body">
        {blocks.length > 0 ? (
          blocks.map((block, index) => renderBlock(block, index))
        ) : (
          <p className="preview-empty">Nothing to preview yet.</p>
        )}
      </div>
    </section>
  );
}

function renderBlock(
  block: ReturnType<typeof parseMarkdownBlocks>[number],
  index: number,
) {
  const key = `${block.type}-${index}`;

  switch (block.type) {
    case "heading":
      if (block.depth === 1) {
        return <h1 key={key}>{renderInline(block.text)}</h1>;
      }
      if (block.depth === 2) {
        return <h2 key={key}>{renderInline(block.text)}</h2>;
      }
      return <h3 key={key}>{renderInline(block.text)}</h3>;
    case "paragraph":
      return <p key={key}>{renderInline(block.text)}</p>;
    case "unorderedList":
      return (
        <ul key={key} aria-label="Markdown bullet list">
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} aria-label="Markdown numbered list">
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>
          ))}
        </ol>
      );
    case "code":
      return (
        <pre key={key} className="markdown-code-block">
          <code>{block.code}</code>
        </pre>
      );
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;

  for (
    let match = linkPattern.exec(text);
    match !== null;
    match = linkPattern.exec(text)
  ) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <a
        key={`${match.index}-${match[2]}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
      >
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
