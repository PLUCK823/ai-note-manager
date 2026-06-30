import { create } from "zustand";

type AiStatus = "idle" | "running" | "failed" | "done";

type PendingChange = {
  end?: number;
  original: string;
  replacement: string;
  start?: number;
};

type AiState = {
  output: string;
  pendingChange: PendingChange | null;
  status: AiStatus;
  setRunning: () => void;
  setOutput: (output: string, pendingChange?: PendingChange | null) => void;
  setFailed: () => void;
  clearPendingChange: () => void;
};

export const useAiStore = create<AiState>((set) => ({
  output: "",
  pendingChange: null,
  status: "idle",
  setRunning: () => set({ pendingChange: null, status: "running" }),
  setOutput: (output, pendingChange = null) =>
    set({ output, pendingChange, status: "done" }),
  setFailed: () => set({ status: "failed" }),
  clearPendingChange: () => set({ pendingChange: null }),
}));
