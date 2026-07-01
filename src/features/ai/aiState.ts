import { create } from "zustand";

type AiStatus = "idle" | "running" | "failed" | "done";

type PendingChange = {
  end?: number;
  original: string;
  replacement: string;
  start?: number;
};

type StreamContext = {
  end?: number;
  original: string;
  start?: number;
  writing: boolean;
};

type AiState = {
  activeRequestId: number;
  backendRequestId: string | null;
  output: string;
  pendingChange: PendingChange | null;
  streamContext: StreamContext | null;
  status: AiStatus;
  appendChunk: (requestId: string, chunk: string) => void;
  cancelGeneration: () => string | null;
  completeStream: (requestId: string) => void;
  failStream: (requestId: string) => void;
  setPendingChange: (pendingChange: PendingChange) => void;
  setBackendRequestId: (requestId: string, activeRequestId: number) => void;
  setRunning: (streamContext?: StreamContext | null) => number;
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
  backendRequestId: null,
  output: "",
  pendingChange: null,
  streamContext: null,
  status: "idle",
  appendChunk: (requestId, chunk) =>
    set((state) =>
      state.backendRequestId !== requestId
        ? state
        : {
            output: `${state.output}${chunk}`,
            status: "running",
          },
    ),
  cancelGeneration: () => {
    const requestId = get().backendRequestId;
    set((state) => ({
      activeRequestId: state.activeRequestId + 1,
      backendRequestId: null,
      output: "",
      pendingChange: null,
      status: "idle",
      streamContext: null,
    }));
    return requestId;
  },
  completeStream: (requestId) =>
    set((state) => {
      if (state.backendRequestId !== requestId) {
        return state;
      }

      const pendingChange =
        state.streamContext?.writing && state.output
          ? {
              end: state.streamContext.end,
              original: state.streamContext.original,
              replacement: state.output,
              start: state.streamContext.start,
            }
          : null;

      return {
        backendRequestId: null,
        pendingChange,
        status: "done",
        streamContext: null,
      };
    }),
  failStream: (requestId) =>
    set((state) =>
      state.backendRequestId !== requestId
        ? state
        : {
            backendRequestId: null,
            pendingChange: null,
            status: "failed",
            streamContext: null,
          },
    ),
  setPendingChange: (pendingChange) => set({ pendingChange }),
  setBackendRequestId: (requestId, activeRequestId) =>
    set((state) =>
      state.activeRequestId !== activeRequestId
        ? state
        : { backendRequestId: requestId },
    ),
  setRunning: (streamContext = null) => {
    const activeRequestId = get().activeRequestId + 1;
    set({
      activeRequestId,
      backendRequestId: null,
      output: "",
      pendingChange: null,
      streamContext,
      status: "running",
    });
    return activeRequestId;
  },
  setOutput: (output, pendingChange = null, requestId) =>
    set((state) =>
      requestId !== undefined && requestId !== state.activeRequestId
        ? state
        : {
            backendRequestId: null,
            output,
            pendingChange,
            status: "done",
            streamContext: null,
          },
    ),
  setFailed: (requestId) =>
    set((state) =>
      requestId !== undefined && requestId !== state.activeRequestId
        ? state
        : { backendRequestId: null, status: "failed", streamContext: null },
    ),
  clearPendingChange: () => set({ pendingChange: null }),
}));
