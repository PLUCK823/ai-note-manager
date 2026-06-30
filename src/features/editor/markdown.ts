export function deriveMarkdownTitle(content: string) {
  const heading = content
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));

  return heading ? heading.replace(/^#\s+/, "") : "Untitled note";
}

type MarkdownBlock =
  | { type: "heading"; depth: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unorderedList"; items: string[] }
  | { type: "orderedList"; items: string[] }
  | { type: "code"; language: string | null; code: string };

export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = stripFrontmatter(content).split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const fence = trimmed.match(/^```(\S*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.trim().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      index += 1;
      blocks.push({
        type: "code",
        language: fence[1] || null,
        code: codeLines.join("\n"),
      });
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        depth: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index]?.trim().match(/^[-*]\s+(.+)$/);
        if (!item) {
          break;
        }
        items.push(item[1].trim());
        index += 1;
      }
      blocks.push({ type: "unorderedList", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index]?.trim().match(/^\d+\.\s+(.+)$/);
        if (!item) {
          break;
        }
        items.push(item[1].trim());
        index += 1;
      }
      blocks.push({ type: "orderedList", items });
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index]?.trim() ?? "";
      if (
        !next ||
        /^```/.test(next) ||
        /^(#{1,3})\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
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
