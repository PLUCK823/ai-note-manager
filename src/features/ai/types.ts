export type AiAction =
  | "summarize"
  | "extract_todos"
  | "rewrite_selection"
  | "compress_selection"
  | "expand_selection"
  | "suggest_title"
  | "suggest_tags"
  | "suggest_improvements";

export type AiRunInput = {
  action: AiAction;
  noteContent: string;
  selectedText?: string;
};

export type WorkspaceOperationKind =
  "read" | "search" | "create" | "update" | "delete";

export type WorkspaceOperation = {
  kind: WorkspaceOperationKind;
  path?: string | null;
  content?: string | null;
  query?: string | null;
  reason: string;
};

export type WorkspacePlan = {
  summary: string;
  operations: WorkspaceOperation[];
};

export type WorkspaceOperationResult = {
  kind: WorkspaceOperationKind;
  path?: string | null;
  message: string;
  content?: string | null;
};
