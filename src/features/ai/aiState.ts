import { create } from "zustand";

type AiStatus = "idle" | "running" | "failed" | "done";

type PendingChange = {
  end?: number;
  original: string;
  replacement: string;
  start?: number;
};

type AiState = {
  activeRequestId: number;
  output: string;
  pendingChange: PendingChange | null;
  status: AiStatus;
  cancelGeneration: () => void;
  setPendingChange: (pendingChange: PendingChange) => void;
  setRunning: () => number;
  setOutput: (
    output: string,
    pendingChange?: PendingChange | null,
    requestId?: number,
  ) => void;
  setFailed: (requestId?: number) => void;
  clearPendingChange: () => void;
};

export const useAiStore = create<AiState>((set, get) => ({
  activeRequestId: 0,
  output: "",
  pendingChange: null,
  status: "idle",
  cancelGeneration: () =>
    set((state) => ({
      activeRequestId: state.activeRequestId + 1,
      output: "",
      pendingChange: null,
      status: "idle",
    })),
  setPendingChange: (pendingChange) => set({ pendingChange }),
  setRunning: () => {
    const activeRequestId = get().activeRequestId + 1;
    set({
      activeRequestId,
      output: "",
      pendingChange: null,
      status: "running",
    });
    return activeRequestId;
  },
  setOutput: (output, pendingChange = null, requestId) =>
    set((state) =>
      requestId !== undefined && requestId !== state.activeRequestId
        ? state
        : { output, pendingChange, status: "done" },
    ),
  setFailed: (requestId) =>
    set((state) =>
      requestId !== undefined && requestId !== state.activeRequestId
        ? state
        : { status: "failed" },
    ),
  clearPendingChange: () => set({ pendingChange: null }),
}));
