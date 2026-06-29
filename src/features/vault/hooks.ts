import { create } from "zustand";

import type { VaultInfo } from "./types";

type VaultState = {
  currentVault: VaultInfo | null;
  setCurrentVault: (vault: VaultInfo | null) => void;
};

export const useVaultStore = create<VaultState>((set) => ({
  currentVault: null,
  setCurrentVault: (vault) => set({ currentVault: vault }),
}));
