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
      return renderHeading(block.depth, block.text, key);
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
      return renderList(block.items, key, "ordered", false, block.start);
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
                  <th
                    key={`${key}-header-${headerIndex}`}
                    scope="col"
                    style={tableCellStyle(block.alignments[headerIndex])}
                  >
                    {renderInline(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={`${key}-row-${rowIndex}`}>
                  {block.headers.map((_, cellIndex) => (
                    <td
                      key={`${key}-cell-${rowIndex}-${cellIndex}`}
                      style={tableCellStyle(block.alignments[cellIndex])}
                    >
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
        const imageAlt = renderInlineText(block.alt);
        if (!imageSrc) {
          return <p key={key}>{`![${imageAlt}](${block.src})`}</p>;
        }

        return (
          <figure key={key} className="markdown-image">
            <img alt={imageAlt} src={imageSrc} />
          </figure>
        );
      }
    case "thematicBreak":
      return <hr key={key} aria-label="Markdown thematic break" />;
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

function tableCellStyle(alignment: "left" | "center" | "right" | null | undefined) {
  return alignment ? { textAlign: alignment } : undefined;
}

function renderHeading(
  depth: Extract<MarkdownBlock, { type: "heading" }>["depth"],
  text: string,
  key: string,
) {
  switch (depth) {
    case 1:
      return <h1 key={key}>{renderInline(text)}</h1>;
    case 2:
      return <h2 key={key}>{renderInline(text)}</h2>;
    case 3:
      return <h3 key={key}>{renderInline(text)}</h3>;
    case 4:
      return <h4 key={key}>{renderInline(text)}</h4>;
    case 5:
      return <h5 key={key}>{renderInline(text)}</h5>;
    case 6:
      return <h6 key={key}>{renderInline(text)}</h6>;
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
  start?: number,
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
    <Tag key={key} aria-label={label} start={type === "ordered" ? start : undefined}>
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
    /``([^`]*(?:`[^`]+)*)``|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)(?:\s+"([^"]*)")?\)|\[\^([^\]]+)\]|<(https?:\/\/[^>\s]+)>|<([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>|~~([^~]+)~~|__([^_]+)__|_([^_]+)_/g;
  let lastIndex = 0;

  for (
    let match = inlinePattern.exec(text);
    match !== null;
    match = inlinePattern.exec(text)
  ) {
    if (isEscapedMarkdownMarker(text, match.index)) {
      continue;
    }

    if (match.index > lastIndex) {
      pushTextWithLineBreaks(nodes, text.slice(lastIndex, match.index), lastIndex);
    }

    if (match[1]) {
      nodes.push(<code key={`${match.index}-code`}>{match[1]}</code>);
    } else if (match[2]) {
      nodes.push(<code key={`${match.index}-code`}>{match[2]}</code>);
    } else if (match[3]) {
      nodes.push(<strong key={`${match.index}-strong`}>{renderInlineText(match[3])}</strong>);
    } else if (match[4]) {
      nodes.push(<em key={`${match.index}-em`}>{renderInlineText(match[4])}</em>);
    } else if (match[8]) {
      nodes.push(
        <sup key={`${match.index}-${match[8]}`}>
          <a href={`#footnote-${match[8]}`}>{renderInlineText(match[8])}</a>
        </sup>,
      );
    } else if (match[9]) {
      nodes.push(
        <a
          key={`${match.index}-${match[9]}`}
          href={match[9]}
          target="_blank"
          rel="noreferrer"
        >
          {renderInlineText(match[9])}
        </a>,
      );
    } else if (match[10]) {
      nodes.push(
        <a key={`${match.index}-${match[10]}`} href={`mailto:${match[10]}`}>
          {renderInlineText(match[10])}
        </a>,
      );
    } else if (match[11]) {
      nodes.push(<del key={`${match.index}-del`}>{renderInlineText(match[11])}</del>);
    } else if (match[12]) {
      nodes.push(<strong key={`${match.index}-strong`}>{renderInlineText(match[12])}</strong>);
    } else if (match[13]) {
      nodes.push(<em key={`${match.index}-em`}>{renderInlineText(match[13])}</em>);
    } else {
      nodes.push(
        <a
          key={`${match.index}-${match[6]}`}
          href={match[6]}
          target="_blank"
          rel="noreferrer"
          title={match[7] ? renderInlineText(match[7]) : undefined}
        >
          {renderInlineText(match[5])}
        </a>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    pushTextWithLineBreaks(nodes, text.slice(lastIndex), lastIndex);
  }

  return nodes;
}

function pushTextWithLineBreaks(nodes: ReactNode[], text: string, keyPrefix: number) {
  const parts = renderInlineText(text).split("\n");

  parts.forEach((part, index) => {
    if (part) {
      nodes.push(part);
    }

    if (index < parts.length - 1) {
      nodes.push(<br key={`${keyPrefix}-br-${index}`} />);
    }
  });
}

function renderInlineText(text: string) {
  return decodeMarkdownEntities(unescapeMarkdownPunctuation(text));
}

function unescapeMarkdownPunctuation(text: string) {
  return text.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, "$1");
}

function decodeMarkdownEntities(text: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return text.replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/g, (source, entity) => {
    if (entity.startsWith("#x")) {
      return decodeCodePoint(entity.slice(2), 16) ?? source;
    }

    if (entity.startsWith("#")) {
      return decodeCodePoint(entity.slice(1), 10) ?? source;
    }

    return namedEntities[entity] ?? source;
  });
}

function decodeCodePoint(value: string, radix: 10 | 16) {
  const codePoint = Number.parseInt(value, radix);

  if (!Number.isSafeInteger(codePoint)) {
    return null;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
}

function isEscapedMarkdownMarker(text: string, markerIndex: number) {
  let slashCount = 0;

  for (let index = markerIndex - 1; index >= 0 && text[index] === "\\"; index -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}
