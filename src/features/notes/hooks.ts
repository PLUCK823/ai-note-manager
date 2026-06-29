import { create } from "zustand";

type NotesState = {
  activePath: string | null;
  setActivePath: (path: string | null) => void;
};

export const useNotesStore = create<NotesState>((set) => ({
  activePath: null,
  setActivePath: (path) => set({ activePath: path }),
}));
