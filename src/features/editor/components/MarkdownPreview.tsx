import type { ReactNode } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { parseMarkdownBlocks } from "../markdown";
import { useEditorStore } from "../editorState";
import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";

type MarkdownBlock = ReturnType<typeof parseMarkdownBlocks>[number];
type ListBlock = Extract<MarkdownBlock, { type: "orderedList" | "unorderedList" }>;
type TaskListBlock = Extract<MarkdownBlock, { type: "taskList" }>;

export function MarkdownPreview() {
  const content = useEditorStore((state) => state.content);
  const currentVault = useVaultStore((state) => state.currentVault);
  const activePath = useNotesStore((state) => state.activePath);
  const blocks = parseMarkdownBlocks(content);

  return (
    <section className="preview-surface" aria-label="Markdown preview">
      <p className="eyebrow">Preview</p>
      <div className="markdown-preview-body">
        {blocks.length > 0 ? (
          blocks.map((block, index) =>
            renderBlock(block, index, {
              activePath,
              vaultPath: currentVault?.path ?? null,
            }),
          )
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
  context: {
    activePath: string | null;
    vaultPath: string | null;
  },
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
      return renderList(block.items, key, "unordered");
    case "taskList":
      return renderTaskList(block.items, key);
    case "orderedList":
      return renderList(block.items, key, "ordered");
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
      {
        const imageSrc = resolveImageSrc(block.src, context);
        if (!imageSrc) {
          return <p key={key}>{`![${block.alt}](${block.src})`}</p>;
        }

        return (
          <figure key={key} className="markdown-image">
            <img alt={block.alt} src={imageSrc} />
          </figure>
        );
      }
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

function resolveImageSrc(
  src: string,
  context: {
    activePath: string | null;
    vaultPath: string | null;
  },
) {
  if (/^https?:\/\/[^\s)]+$/.test(src)) {
    return src;
  }

  if (!context.vaultPath || !context.activePath || isAbsolutePath(src)) {
    return null;
  }

  const noteDirectory = context.activePath.split("/").slice(0, -1);
  const resolvedSegments = normalizeVaultSegments([
    ...noteDirectory,
    ...src.split("/"),
  ]);
  if (!resolvedSegments) {
    return null;
  }

  const vaultPath = context.vaultPath.replace(/\/+$/, "");
  return convertFileSrc(`${vaultPath}/${resolvedSegments.join("/")}`);
}

function normalizeVaultSegments(segments: string[]) {
  const normalized: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (normalized.length === 0) {
        return null;
      }
      normalized.pop();
      continue;
    }

    normalized.push(segment);
  }

  return normalized;
}

function isAbsolutePath(src: string) {
  return src.startsWith("/") || /^[A-Za-z]:[\\/]/.test(src);
}

function renderTaskList(
  items: TaskListBlock["items"],
  key: string,
  nested = false,
) {
  return (
    <ul
      key={key}
      aria-label={nested ? "Markdown nested task list" : "Markdown task list"}
      className="markdown-task-list"
    >
      {items.map((item, itemIndex) => (
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
          {item.children.length > 0
            ? renderTaskList(item.children, `${key}-${itemIndex}-nested`, true)
            : null}
        </li>
      ))}
    </ul>
  );
}

function renderList(
  items: ListBlock["items"],
  key: string,
  type: "ordered" | "unordered",
  nested = false,
) {
  const label =
    type === "ordered"
      ? nested
        ? "Markdown nested numbered list"
        : "Markdown numbered list"
      : nested
        ? "Markdown nested bullet list"
        : "Markdown bullet list";
  const Tag = type === "ordered" ? "ol" : "ul";

  return (
    <Tag key={key} aria-label={label}>
      {items.map((item, itemIndex) => (
        <li key={`${key}-${itemIndex}`}>
          <span>{renderInline(item.text)}</span>
          {item.children.length > 0
            ? renderList(item.children, `${key}-${itemIndex}-nested`, type, true)
            : null}
        </li>
      ))}
    </Tag>
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
