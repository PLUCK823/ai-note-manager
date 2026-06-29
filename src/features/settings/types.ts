export type AiReadScope = "current_note" | "linked_notes" | "full_vault";

export type AppSettings = {
  model: string;
  aiReadScope: AiReadScope;
  autosave: boolean;
};
