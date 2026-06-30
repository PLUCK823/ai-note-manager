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
  cursorPosition: number;
  saveState: SaveState;
  selection: EditorSelection | null;
  setContent: (content: string) => void;
  setCursorPosition: (cursorPosition: number) => void;
  setSelection: (selection: EditorSelection | null) => void;
  replaceRange: (input: { start: number; end: number; replacement: string }) => void;
  loadContent: (input: { content: string; baseHash: string }) => void;
  markSaved: (baseHash: string) => void;
  setSaveState: (saveState: SaveState) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  content: "# Untitled note\n\nOpen a vault to start editing Markdown files.",
  baseHash: "",
  cursorPosition: 0,
  saveState: "saved",
  selection: null,
  setContent: (content) => set({ content, saveState: "dirty" }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setSelection: (selection) =>
    set((state) => ({
      cursorPosition: selection?.end ?? state.cursorPosition,
      selection,
    })),
  replaceRange: ({ end, replacement, start }) =>
    set((state) => ({
      content:
        state.content.slice(0, start) + replacement + state.content.slice(end),
      cursorPosition: start + replacement.length,
      saveState: "dirty",
      selection: null,
    })),
  loadContent: ({ baseHash, content }) =>
    set({
      baseHash,
      content,
      cursorPosition: 0,
      saveState: "saved",
      selection: null,
    }),
  markSaved: (baseHash) => set({ baseHash, saveState: "saved" }),
  setSaveState: (saveState) => set({ saveState }),
}));
