import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultStore } from "../hooks";
import { VaultPicker } from "./VaultPicker";
import { VaultStatus } from "./VaultStatus";

const selectVaultMock = vi.fn();

vi.mock("../api", () => ({
  selectVault: () => selectVaultMock(),
}));

describe("VaultPicker", () => {
  beforeEach(() => {
    selectVaultMock.mockReset();
    useVaultStore.getState().setCurrentVault(null);
  });

  it("stores the selected vault and displays its path", async () => {
    selectVaultMock.mockResolvedValue({
      id: "vault:/Users/test/notes",
      name: "notes",
      path: "/Users/test/notes",
      lastOpenedAt: null,
    });

    render(
      <>
        <VaultPicker />
        <VaultStatus />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /open vault/i }));

    await waitFor(() => {
      expect(screen.getByText("/Users/test/notes")).toBeInTheDocument();
    });
    expect(useVaultStore.getState().currentVault?.id).toBe(
      "vault:/Users/test/notes",
    );
  });
});
