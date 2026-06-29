import { create } from "zustand";

import type { SaveState } from "./types";

type EditorState = {
  content: string;
  saveState: SaveState;
  setContent: (content: string) => void;
  setSaveState: (saveState: SaveState) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  content: "# Untitled note\n\nOpen a vault to start editing Markdown files.",
  saveState: "saved",
  setContent: (content) => set({ content, saveState: "dirty" }),
  setSaveState: (saveState) => set({ saveState }),
}));
