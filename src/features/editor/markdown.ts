export function deriveMarkdownTitle(content: string) {
  const heading = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  return heading ? heading.replace(/^#\s+/, "") : "Untitled note";
}

type MarkdownListItem = {
  children: MarkdownListItem[];
  text: string;
};

type MarkdownTaskListItem = {
  checked: boolean;
  children: MarkdownTaskListItem[];
  text: string;
};

type MarkdownTableAlignment = "left" | "center" | "right" | null;

type LinkDefinition = {
  href: string;
  title: string | null;
};

type MarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string; children: MarkdownBlock[] }
  | { type: "unorderedList"; items: MarkdownListItem[] }
  | { type: "orderedList"; items: MarkdownListItem[]; start: number }
  | { type: "taskList"; items: MarkdownTaskListItem[] }
  | { type: "code"; language: string | null; code: string }
  | {
      type: "table";
      alignments: MarkdownTableAlignment[];
      headers: string[];
      rows: string[][];
    }
  | { type: "image"; alt: string; src: string; title: string | null }
  | { type: "thematicBreak" }
  | { type: "footnotes"; items: Array<{ id: string; text: string }> };

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = stripFrontmatter(content).split("\n");
  const linkDefinitions = parseLinkDefinitions(lines);
  const blocks: MarkdownBlock[] = [];
  const footnotes: Array<{ id: string; text: string }> = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const htmlCommentResult = skipHtmlComment(lines, index);
    if (htmlCommentResult) {
      index = htmlCommentResult.nextIndex;
      continue;
    }

    const footnote = trimmed.match(/^\[\^([^\]]+)\]:\s+(.+)$/);
    if (footnote) {
      footnotes.push({ id: footnote[1].trim(), text: footnote[2].trim() });
      index += 1;
      continue;
    }

    if (parseLinkDefinition(trimmed)) {
      index += 1;
      continue;
    }

    if (isThematicBreak(trimmed)) {
      blocks.push({ type: "thematicBreak" });
      index += 1;
      continue;
    }

    if (isIndentedCodeLine(line)) {
      const code = parseIndentedCodeBlock(lines, index);
      blocks.push(code.block);
      index = code.nextIndex;
      continue;
    }

    const fence = trimmed.match(/^(`{3,}|~{3,})\s*(\S*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      const closingFence = fence[1];
      const closingFencePattern = new RegExp(
        `^${escapeRegExp(closingFence[0]).repeat(closingFence.length)}${escapeRegExp(
          closingFence[0],
        )}*\\s*$`,
      );
      index += 1;
      while (
        index < lines.length &&
        !closingFencePattern.test(lines[index]?.trim() ?? "")
      ) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({
        type: "code",
        language: fence[2] || null,
        code: codeLines.join("\n"),
      });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        depth: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: normalizeAtxHeadingText(heading[2]),
      });
      index += 1;
      continue;
    }

    const setextHeading = parseSetextHeading(lines, index);
    if (setextHeading) {
      blocks.push(setextHeading.block);
      index = setextHeading.nextIndex;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const blockquote = parseBlockquote(lines, index, linkDefinitions);
      blocks.push(blockquote.block);
      index = blockquote.nextIndex;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    const image = trimmed.match(
      /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\)$/,
    );
    if (image) {
      blocks.push({
        type: "image",
        alt: image[1].trim(),
        src: image[2],
        title: image[3] ?? image[4] ?? image[5] ?? null,
      });
      index += 1;
      continue;
    }

    const referenceImage = trimmed.match(/^!\[([^\]]*)\]\[([^\]]*)\]$/);
    if (referenceImage) {
      const referenceId = referenceImage[2].trim() || referenceImage[1].trim();
      const definition = linkDefinitions.get(referenceId.toLowerCase());
      if (definition) {
        blocks.push({
          type: "image",
          alt: referenceImage[1].trim(),
          src: definition.href,
          title: definition.title,
        });
        index += 1;
        continue;
      }
    }

    const shortcutReferenceImage = trimmed.match(/^!\[([^\]]*)\]$/);
    if (shortcutReferenceImage) {
      const definition = linkDefinitions.get(shortcutReferenceImage[1].trim().toLowerCase());
      if (definition) {
        blocks.push({
          type: "image",
          alt: shortcutReferenceImage[1].trim(),
          src: definition.href,
          title: definition.title,
        });
        index += 1;
        continue;
      }
    }

    if (parseTaskListItem(line)) {
      const list = parseTaskList(lines, index);
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    if (parseUnorderedListItem(line)) {
      const list = parseList(lines, index, parseUnorderedListItem, "unorderedList");
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    if (parseOrderedListItem(line)) {
      const list = parseList(lines, index, parseOrderedListItem, "orderedList");
      blocks.push(list.block);
      index = list.nextIndex;
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index]?.trim() ?? "";
      if (
        !next ||
        isIndentedCodeLine(lines[index] ?? "") ||
        /^(```|~~~)/.test(next) ||
        /^\[\^[^\]]+\]:\s+/.test(next) ||
        Boolean(parseLinkDefinition(next)) ||
        isThematicBreak(next) ||
        /^(#{1,6})\s+/.test(next) ||
        isSetextHeadingUnderline(next) ||
        /^>\s?/.test(next) ||
        parseTable(lines, index) ||
        /^!\[[^\]]*\]\([^\s)]+(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)$/.test(next) ||
        Boolean(parseTaskListItem(lines[index] ?? "")) ||
        Boolean(parseUnorderedListItem(lines[index] ?? "")) ||
        Boolean(parseOrderedListItem(lines[index] ?? ""))
      ) {
        break;
      }
      paragraphLines.push(lines[index] ?? "");
      index += 1;
    }
    blocks.push({
      type: "paragraph",
      text: applyReferenceLinks(joinParagraphLines(paragraphLines), linkDefinitions),
    });
  }

  if (footnotes.length > 0) {
    blocks.push({ type: "footnotes", items: footnotes });
  }

  return blocks;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLinkDefinitions(lines: string[]) {
  const definitions = new Map<string, LinkDefinition>();

  for (const line of lines) {
    const definition = parseLinkDefinition(line.trim());
    if (definition) {
      definitions.set(definition.id.toLowerCase(), {
        href: definition.href,
        title: definition.title,
      });
    }
  }

  return definitions;
}

function parseLinkDefinition(line: string) {
  const definition = line.match(
    /^\[([^\]^][^\]]*)\]:\s+(https?:\/\/[^\s]+)(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?$/,
  );
  if (!definition) {
    return null;
  }

  return {
    href: definition[2],
    id: definition[1].trim(),
    title: definition[3] ?? definition[4] ?? definition[5] ?? null,
  };
}

function applyReferenceLinks(text: string, definitions: Map<string, LinkDefinition>) {
  return text
    .replace(/\[([^\]]+)\]\[([^\]]+)\]/g, (source, label, id) => {
      const definition = definitions.get(id.trim().toLowerCase());
      return definition ? formatReferenceLink(label, definition) : source;
    })
    .replace(/\[([^\]]+)\]\[\]/g, (source, label) => {
      const definition = definitions.get(label.trim().toLowerCase());
      return definition ? formatReferenceLink(label, definition) : source;
    })
    .replace(/\[([^\]]+)\](?![[(])/g, (source, label) => {
      const definition = definitions.get(label.trim().toLowerCase());
      return definition ? formatReferenceLink(label, definition) : source;
    });
}

function formatReferenceLink(label: string, definition: LinkDefinition) {
  return definition.title
    ? `[${label}](${definition.href} "${definition.title}")`
    : `[${label}](${definition.href})`;
}

function joinParagraphLines(lines: string[]) {
  return lines.reduce((text, line, index) => {
    const hardBreak = /(?: {2,}|\\)$/.test(line);
    const lineText = line.replace(/(?: {2,}|\\)$/, "").trim();
    const separator = hardBreak ? "\n" : " ";

    if (index === 0) {
      return `${lineText}${index < lines.length - 1 ? separator : ""}`;
    }

    return `${text}${lineText}${index < lines.length - 1 ? separator : ""}`;
  }, "");
}

function parseIndentedCodeBlock(lines: string[], index: number) {
  const codeLines: string[] = [];
  let nextIndex = index;

  while (nextIndex < lines.length && isIndentedCodeLine(lines[nextIndex] ?? "")) {
    codeLines.push((lines[nextIndex] ?? "").replace(/^( {4}|\t)/, ""));
    nextIndex += 1;
  }

  return {
    block: {
      type: "code" as const,
      language: null,
      code: codeLines.join("\n"),
    },
    nextIndex,
  };
}

function isIndentedCodeLine(line: string) {
  return /^( {4}|\t)\S/.test(line);
}

function normalizeAtxHeadingText(text: string) {
  return text.trim().replace(/\s+#+\s*$/, "").trim();
}

function parseSetextHeading(lines: string[], index: number) {
  const text = lines[index]?.trim() ?? "";
  const underline = lines[index + 1]?.trim() ?? "";

  if (!text || !isSetextHeadingUnderline(underline)) {
    return null;
  }

  return {
    block: {
      type: "heading" as const,
      depth: (underline.startsWith("=") ? 1 : 2) as 1 | 2,
      text,
    },
    nextIndex: index + 2,
  };
}

function isSetextHeadingUnderline(line: string) {
  return /^(=+|-+)\s*$/.test(line);
}

function parseBlockquote(lines: string[], index: number, linkDefinitions: Map<string, LinkDefinition>) {
  const bodyLines: string[] = [];
  let nextIndex = index;

  while (nextIndex < lines.length) {
    const raw = lines[nextIndex] ?? "";
    const trimmed = raw.trim();
    // Empty blockquote line (just '>') preserves paragraph break
    if (trimmed === ">") {
      bodyLines.push("");
      nextIndex += 1;
      continue;
    }
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (!quote) {
      break;
    }
    bodyLines.push(quote[1] ?? "");
    nextIndex += 1;
  }

  // Check for nested blockquotes in the stripped body
  const hasNested = bodyLines.some((line) => /^>\s?/.test(line));

  if (!hasNested) {
    const text = joinBlockquoteBody(bodyLines);
    return {
      block: {
        type: "blockquote" as const,
        text: applyReferenceLinks(text, linkDefinitions),
        children: [] as MarkdownBlock[],
      },
      nextIndex,
    };
  }

  // Reparse stripped body to find nested blockquotes and other blocks
  const body = bodyLines.join("\n");
  const nestedBlocks = parseMarkdownBlocks(body);
  // Filter out nested blockquotes as children, keep rest as text
  const children: MarkdownBlock[] = [];
  const textParts: string[] = [];

  for (const block of nestedBlocks) {
    if (block.type === "blockquote") {
      children.push(block);
    } else if (block.type === "paragraph") {
      textParts.push(block.text);
    } else {
      children.push(block);
    }
  }

  return {
    block: {
      type: "blockquote" as const,
      text: textParts.join(" "),
      children,
    },
    nextIndex,
  };
}

function joinBlockquoteBody(lines: string[]) {
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length > 0) {
        paragraphs.push(current.join(" "));
        current = [];
      }
    } else {
      current.push(trimmed);
    }
  }

  if (current.length > 0) {
    paragraphs.push(current.join(" "));
  }

  return paragraphs.join("\n");
}

function isThematicBreak(line: string) {
  return /^([-*_])(?:\s*\1){2,}$/.test(line);
}

function parseTaskList(lines: string[], index: number, baseIndent?: number) {
  const firstItem = parseTaskListItem(lines[index] ?? "");
  const listIndent = baseIndent ?? firstItem?.indent ?? 0;
  const items: MarkdownTaskListItem[] = [];
  let currentItem: MarkdownTaskListItem | null = null;
  let nextIndex = index;

  while (nextIndex < lines.length) {
    const item = parseTaskListItem(lines[nextIndex] ?? "");
    if (!item || item.indent < listIndent) {
      break;
    }

    if (item.indent === listIndent) {
      currentItem = {
        checked: item.checked,
        children: [],
        text: item.text,
      };
      items.push(currentItem);
      nextIndex += 1;
      continue;
    }

    if (!currentItem) {
      break;
    }

    const nestedList = parseTaskList(lines, nextIndex, item.indent);
    currentItem.children.push(...nestedList.block.items);
    nextIndex = nestedList.nextIndex;
  }

  return {
    block: {
      type: "taskList" as const,
      items,
    },
    nextIndex,
  };
}

function parseTaskListItem(line: string) {
  const item = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
  if (!item) {
    return null;
  }

  return {
    checked: item[2].toLowerCase() === "x",
    indent: item[1].replace(/\t/g, "  ").length,
    text: item[3].trim(),
  };
}

function parseList<T extends "orderedList" | "unorderedList">(
  lines: string[],
  index: number,
  parseItem: (line: string) => { indent: number; marker?: number; text: string } | null,
  type: T,
  baseIndent?: number,
) {
  const firstItem = parseItem(lines[index] ?? "");
  const listIndent = baseIndent ?? firstItem?.indent ?? 0;
  const items: MarkdownListItem[] = [];
  let currentItem: MarkdownListItem | null = null;
  let nextIndex = index;

  while (nextIndex < lines.length) {
    const item = parseItem(lines[nextIndex] ?? "");
    if (!item || item.indent < listIndent) {
      break;
    }

    if (item.indent === listIndent) {
      currentItem = { children: [], text: item.text };
      items.push(currentItem);
      nextIndex += 1;
      continue;
    }

    if (!currentItem) {
      break;
    }

    const nestedList = parseList(lines, nextIndex, parseItem, type, item.indent);
    currentItem.children.push(...nestedList.block.items);
    nextIndex = nestedList.nextIndex;
  }

  if (type === "orderedList") {
    return {
      block: {
        type: "orderedList" as const,
        items,
        start: firstItem?.marker ?? 1,
      },
      nextIndex,
    };
  }

  return {
    block: {
      type: "unorderedList" as const,
      items,
    },
    nextIndex,
  };
}

function parseUnorderedListItem(line: string) {
  const item = line.match(/^(\s*)[-*+]\s+(.+)$/);
  if (!item || /^\[[ xX]\]\s+/.test(item[2])) {
    return null;
  }

  return {
    indent: item[1].replace(/\t/g, "  ").length,
    text: item[2].trim(),
  };
}

function parseOrderedListItem(line: string) {
  const item = line.match(/^(\s*)\d+[.)]\s+(.+)$/);
  if (!item) {
    return null;
  }

  return {
    indent: item[1].replace(/\t/g, "  ").length,
    marker: Number(item[0].match(/\d+/)?.[0] ?? 1),
    text: item[2].trim(),
  };
}

function parseTable(lines: string[], index: number) {
  const header = lines[index]?.trim() ?? "";
  const separator = lines[index + 1]?.trim() ?? "";

  if (!isTableRow(header) || !isTableSeparator(separator)) {
    return null;
  }

  const headers = splitTableRow(header);
  const alignments = splitTableRow(separator).map(parseTableAlignment);
  const rows: string[][] = [];
  let nextIndex = index + 2;

  while (nextIndex < lines.length && isTableRow(lines[nextIndex]?.trim() ?? "")) {
    rows.push(splitTableRow(lines[nextIndex] ?? ""));
    nextIndex += 1;
  }

  return {
    block: {
      type: "table" as const,
      alignments,
      headers,
      rows,
    },
    nextIndex,
  };
}

function isTableRow(line: string) {
  return line.includes("|") && splitTableRow(line).length > 1;
}

function isTableSeparator(line: string) {
  return isTableRow(line) && splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseTableAlignment(cell: string): MarkdownTableAlignment {
  const startsWithColon = cell.startsWith(":");
  const endsWithColon = cell.endsWith(":");

  if (startsWithColon && endsWithColon) {
    return "center";
  }

  if (startsWithColon) {
    return "left";
  }

  if (endsWithColon) {
    return "right";
  }

  return null;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function skipHtmlComment(lines: string[], index: number) {
  const trimmed = lines[index]?.trim() ?? "";
  if (!trimmed.startsWith("<!--")) {
    return null;
  }

  if (trimmed.endsWith("-->")) {
    return { nextIndex: index + 1 };
  }

  let nextIndex = index + 1;
  while (nextIndex < lines.length && !(lines[nextIndex]?.trim() ?? "").endsWith("-->")) {
    nextIndex += 1;
  }
  return { nextIndex: nextIndex + 1 };
}

function stripFrontmatter(content: string) {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") {
    return content;
  }

  const closingIndex = lines.findIndex((line, index) => {
    return index > 0 && line.trim() === "---";
  });

  if (closingIndex === -1) {
    return content;
  }

  return lines.slice(closingIndex + 1).join("\n");
}
