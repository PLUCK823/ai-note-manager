export type AiReadScope = "current_note" | "linked_notes" | "full_vault";
export type AiProvider = "openai" | "deepseek";

export type AppSettings = {
  provider: AiProvider;
  model: string;
  aiReadScope: AiReadScope;
  autosave: boolean;
  syncPreviewScroll: boolean;
  leftPaneWidth: number;
  rightPaneWidth: number;
  previewPaneWidth: number;
  leftPaneVisible: boolean;
  rightPaneVisible: boolean;
  aiPaneOnLeft: boolean;
};
