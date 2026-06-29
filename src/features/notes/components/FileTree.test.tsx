import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultStore } from "../../vault/hooks";
import { FileTree } from "./FileTree";

const listMarkdownFilesMock = vi.fn();

vi.mock("../api", () => ({
  listMarkdownFiles: (vaultId: string) => listMarkdownFilesMock(vaultId),
}));

function TestProvider({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("FileTree", () => {
  beforeEach(() => {
    listMarkdownFilesMock.mockReset();
    useVaultStore.getState().setCurrentVault(null);
  });

  it("renders markdown files from the selected vault", async () => {
    useVaultStore.getState().setCurrentVault({
      id: "vault:/Users/test/notes",
      name: "notes",
      path: "/Users/test/notes",
      lastOpenedAt: null,
    });
    listMarkdownFilesMock.mockResolvedValue([
      {
        name: "README.md",
        path: "README.md",
        kind: "file",
        children: [],
      },
      {
        name: "projects",
        path: "projects",
        kind: "folder",
        children: [
          {
            name: "Plan.md",
            path: "projects/Plan.md",
            kind: "file",
            children: [],
          },
        ],
      },
    ]);

    render(<FileTree />, { wrapper: TestProvider });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "README.md" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "projects" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();
    expect(listMarkdownFilesMock).toHaveBeenCalledWith("vault:/Users/test/notes");
  });
});
