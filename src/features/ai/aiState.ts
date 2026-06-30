import { create } from "zustand";

type AiStatus = "idle" | "running" | "failed" | "done";

type AiState = {
  output: string;
  status: AiStatus;
  setRunning: () => void;
  setOutput: (output: string) => void;
  setFailed: () => void;
};

export const useAiStore = create<AiState>((set) => ({
  output: "",
  status: "idle",
  setRunning: () => set({ status: "running" }),
  setOutput: (output) => set({ output, status: "done" }),
  setFailed: () => set({ status: "failed" }),
}));
