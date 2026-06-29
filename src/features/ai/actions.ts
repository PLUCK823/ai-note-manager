import type { AiAction } from "./types";

export const aiActions: Array<{ id: AiAction; label: string }> = [
  { id: "summarize", label: "Summarize" },
  { id: "extract_todos", label: "Todos" },
  { id: "rewrite_selection", label: "Rewrite" },
  { id: "suggest_title", label: "Title" },
  { id: "suggest_tags", label: "Tags" },
];
