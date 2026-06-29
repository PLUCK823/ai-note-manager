export type SaveState = "saved" | "saving" | "dirty" | "failed" | "conflict";

export type EditorSnapshot = {
  content: string;
  baseHash: string;
};
