import { create } from "zustand";

import type { SaveState } from "./types";

type EditorSelection = {
  start: number;
  end: number;
  text: string;
};

type EditorState = {
  content: string;
  baseHash: string;
  saveState: SaveState;
  selection: EditorSelection | null;
  setContent: (content: string) => void;
  setSelection: (selection: EditorSelection | null) => void;
  replaceRange: (input: { start: number; end: number; replacement: string }) => void;
  loadContent: (input: { content: string; baseHash: string }) => void;
  markSaved: (baseHash: string) => void;
  setSaveState: (saveState: SaveState) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  content: "# Untitled note\n\nOpen a vault to start editing Markdown files.",
  baseHash: "",
  saveState: "saved",
  selection: null,
  setContent: (content) => set({ content, saveState: "dirty" }),
  setSelection: (selection) => set({ selection }),
  replaceRange: ({ end, replacement, start }) =>
    set((state) => ({
      content:
        state.content.slice(0, start) + replacement + state.content.slice(end),
      saveState: "dirty",
      selection: null,
    })),
  loadContent: ({ baseHash, content }) =>
    set({ baseHash, content, saveState: "saved", selection: null }),
  markSaved: (baseHash) => set({ baseHash, saveState: "saved" }),
  setSaveState: (saveState) => set({ saveState }),
}));
