import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultStore } from "../../vault/hooks";
import { useSearchStore } from "../hooks";
import { SearchResults } from "./SearchResults";

const searchNotesMock = vi.fn();

vi.mock("../api", () => ({
  searchNotes: (vaultId: string, query: string) => searchNotesMock(vaultId, query),
}));

function TestProvider({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("SearchResults", () => {
  beforeEach(() => {
    searchNotesMock.mockReset();
    useSearchStore.getState().setQuery("");
    useVaultStore.getState().setCurrentVault(null);
  });

  it("renders search results for the selected vault and query", async () => {
    useVaultStore.getState().setCurrentVault({
      id: "vault:/Users/test/notes",
      name: "notes",
      path: "/Users/test/notes",
      lastOpenedAt: null,
    });
    useSearchStore.getState().setQuery("tauri");
    searchNotesMock.mockResolvedValue([
      {
        path: "README.md",
        title: "README",
        snippet: "This note mentions tauri.",
      },
    ]);

    render(<SearchResults />, { wrapper: TestProvider });

    expect(await screen.findByText("README")).toBeInTheDocument();
    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByText(/mentions tauri/i)).toBeInTheDocument();
    expect(searchNotesMock).toHaveBeenCalledWith(
      "vault:/Users/test/notes",
      "tauri",
    );
  });
});
