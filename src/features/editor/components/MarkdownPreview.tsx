import type { ReactNode } from "react";

import { parseMarkdownBlocks } from "../markdown";
import { useEditorStore } from "../editorState";

type MarkdownBlock = ReturnType<typeof parseMarkdownBlocks>[number];
type UnorderedListBlock = Extract<MarkdownBlock, { type: "unorderedList" }>;

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
  block: MarkdownBlock,
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
    case "blockquote":
      return (
        <blockquote key={key} aria-label="Markdown blockquote" role="blockquote">
          {renderInline(block.text)}
        </blockquote>
      );
    case "unorderedList":
      return renderUnorderedList(block.items, key);
    case "taskList":
      return (
        <ul key={key} aria-label="Markdown task list" className="markdown-task-list">
          {block.items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`}>
              <label>
                <input
                  aria-label={item.text}
                  checked={item.checked}
                  disabled
                  type="checkbox"
                  readOnly
                />
                <span>{renderInline(item.text)}</span>
              </label>
            </li>
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
    case "table":
      return (
        <div key={key} className="markdown-table-wrap">
          <table aria-label="Markdown table">
            <thead>
              <tr>
                {block.headers.map((header, headerIndex) => (
                  <th key={`${key}-header-${headerIndex}`} scope="col">
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`}>
                  {block.headers.map((_, cellIndex) => (
                    <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>
                      {renderInline(row[cellIndex] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "image":
      return (
        <figure key={key} className="markdown-image">
          <img alt={block.alt} src={block.src} />
        </figure>
      );
    case "footnotes":
      return (
        <ol key={key} aria-label="Markdown footnotes" className="markdown-footnotes">
          {block.items.map((item) => (
            <li id={`footnote-${item.id}`} key={`${key}-${item.id}`}>
              <span className="markdown-footnote-id">{item.id}</span>
              <span>{renderInline(item.text)}</span>
            </li>
          ))}
        </ol>
      );
  }
}

function renderUnorderedList(
  items: UnorderedListBlock["items"],
  key: string,
  nested = false,
) {
  return (
    <ul
      key={key}
      aria-label={nested ? "Markdown nested bullet list" : "Markdown bullet list"}
    >
      {items.map((item, itemIndex) => (
        <li key={`${key}-${itemIndex}`}>
          <span>{renderInline(item.text)}</span>
          {item.children.length > 0
            ? renderUnorderedList(
                item.children,
                `${key}-${itemIndex}-nested`,
                true,
              )
            : null}
        </li>
      ))}
    </ul>
  );
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const inlinePattern =
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\[\^([^\]]+)\]/g;
  let lastIndex = 0;

  for (
    let match = inlinePattern.exec(text);
    match !== null;
    match = inlinePattern.exec(text)
  ) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[3]) {
      nodes.push(
        <sup key={`${match.index}-${match[3]}`}>
          <a href={`#footnote-${match[3]}`}>{match[3]}</a>
        </sup>,
      );
    } else {
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
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
