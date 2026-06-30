export type AiAction =
  | "summarize"
  | "extract_todos"
  | "rewrite_selection"
  | "compress_selection"
  | "expand_selection"
  | "suggest_title"
  | "suggest_tags";

export type AiRunInput = {
  action: AiAction;
  noteContent: string;
  selectedText?: string;
};
