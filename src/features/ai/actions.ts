import type { AiAction } from "./types";

export const aiActions: Array<{ id: AiAction; label: string }> = [
  { id: "summarize", label: "Summarize" },
  { id: "extract_todos", label: "Todos" },
  { id: "rewrite_selection", label: "Rewrite" },
  { id: "compress_selection", label: "Compress" },
  { id: "expand_selection", label: "Expand" },
  { id: "suggest_title", label: "Title" },
  { id: "suggest_tags", label: "Tags" },
];
