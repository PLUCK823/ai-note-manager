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

type MarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "unorderedList"; items: MarkdownListItem[] }
  | { type: "orderedList"; items: MarkdownListItem[]; start: number }
  | { type: "taskList"; items: MarkdownTaskListItem[] }
  | { type: "code"; language: string | null; code: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "image"; alt: string; src: string }
  | { type: "thematicBreak" }
  | { type: "footnotes"; items: Array<{ id: string; text: string }> };

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = stripFrontmatter(content).split("\n");
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

    const footnote = trimmed.match(/^\[\^([^\]]+)\]:\s+(.+)$/);
    if (footnote) {
      footnotes.push({ id: footnote[1].trim(), text: footnote[2].trim() });
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

    const fence = trimmed.match(/^(```|~~~)\s*(\S*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      const closingFence = fence[1];
      index += 1;
      while (
        index < lines.length &&
        !lines[index]?.trim().startsWith(closingFence)
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
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quote = lines[index]?.trim().match(/^>\s?(.*)$/);
        if (!quote) {
          break;
        }
        quoteLines.push(quote[1].trim());
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (image) {
      blocks.push({
        type: "image",
        alt: image[1].trim(),
        src: image[2],
      });
      index += 1;
      continue;
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

    const paragraphLines: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index]?.trim() ?? "";
      if (
        !next ||
        isIndentedCodeLine(lines[index] ?? "") ||
        /^(```|~~~)/.test(next) ||
        /^\[\^[^\]]+\]:\s+/.test(next) ||
        isThematicBreak(next) ||
        /^(#{1,6})\s+/.test(next) ||
        isSetextHeadingUnderline(next) ||
        /^>\s?/.test(next) ||
        parseTable(lines, index) ||
        /^!\[[^\]]*\]\([^\s)]+\)$/.test(next) ||
        Boolean(parseTaskListItem(lines[index] ?? "")) ||
        Boolean(parseUnorderedListItem(lines[index] ?? "")) ||
        Boolean(parseOrderedListItem(lines[index] ?? ""))
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  if (footnotes.length > 0) {
    blocks.push({ type: "footnotes", items: footnotes });
  }

  return blocks;
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
  const rows: string[][] = [];
  let nextIndex = index + 2;

  while (nextIndex < lines.length && isTableRow(lines[nextIndex]?.trim() ?? "")) {
    rows.push(splitTableRow(lines[nextIndex] ?? ""));
    nextIndex += 1;
  }

  return {
    block: {
      type: "table" as const,
      headers,
      rows,
    },
    nextIndex,
  };
}

function isTableRow(line: string) {
  return line.startsWith("|") && line.endsWith("|") && splitTableRow(line).length > 1;
}

function isTableSeparator(line: string) {
  return isTableRow(line) && splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
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
