import { create } from "zustand";

import type { SaveState } from "./types";

type EditorState = {
  content: string;
  baseHash: string;
  saveState: SaveState;
  setContent: (content: string) => void;
  loadContent: (input: { content: string; baseHash: string }) => void;
  markSaved: (baseHash: string) => void;
  setSaveState: (saveState: SaveState) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  content: "# Untitled note\n\nOpen a vault to start editing Markdown files.",
  baseHash: "",
  saveState: "saved",
  setContent: (content) => set({ content, saveState: "dirty" }),
  loadContent: ({ baseHash, content }) =>
    set({ baseHash, content, saveState: "saved" }),
  markSaved: (baseHash) => set({ baseHash, saveState: "saved" }),
  setSaveState: (saveState) => set({ saveState }),
}));
