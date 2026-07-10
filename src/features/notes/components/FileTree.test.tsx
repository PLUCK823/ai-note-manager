import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultStore } from "../../vault/hooks";
import { useNotesStore } from "../hooks";
import type { FileTreeNode } from "../types";
import { FileTree } from "./FileTree";

const listMarkdownFilesMock = vi.fn();

const testVault = {
  id: "vault:/Users/test/notes",
  name: "notes",
  path: "/Users/test/notes",
  lastOpenedAt: null,
};

function fileNode(name: string, path = name): FileTreeNode {
  return { name, path, kind: "file", children: [] };
}

function folderNode(
  name: string,
  children: FileTreeNode[],
  path = name,
): FileTreeNode {
  return { name, path, kind: "folder", children };
}

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
    useNotesStore.getState().setActivePath(null);
  });

  it("renders markdown files from the selected vault", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
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

  it("collapses and expands a top-level folder without hiding sibling files", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([
      fileNode("README.md"),
      folderNode("projects", [fileNode("Plan.md", "projects/Plan.md")]),
    ]);

    render(<FileTree />, { wrapper: TestProvider });

    const projects = await screen.findByRole("button", { name: "projects" });
    expect(projects).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();

    fireEvent.click(projects);

    expect(projects).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Plan.md" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "README.md" })).toBeInTheDocument();
  });

  it("only toggles the selected nested folder", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([
      folderNode("projects", [
        folderNode(
          "research",
          [fileNode("Notes.md", "projects/research/Notes.md")],
          "projects/research",
        ),
        folderNode(
          "delivery",
          [fileNode("Plan.md", "projects/delivery/Plan.md")],
          "projects/delivery",
        ),
      ]),
    ]);

    render(<FileTree />, { wrapper: TestProvider });

    const projects = await screen.findByRole("button", { name: "projects" });
    await waitFor(() => {
      expect(projects).toHaveAttribute("aria-expanded", "true");
    });
    fireEvent.click(screen.getByRole("button", { name: "delivery" }));
    fireEvent.click(screen.getByRole("button", { name: "research" }));

    expect(screen.getByRole("button", { name: "Notes.md" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "research" }));

    expect(screen.queryByRole("button", { name: "Notes.md" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();
  });

  it("expands active file ancestors and marks the active row", async () => {
    useNotesStore.getState().setActivePath("projects/research/Notes.md");
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([
      folderNode("projects", [
        folderNode(
          "research",
          [fileNode("Notes.md", "projects/research/Notes.md")],
          "projects/research",
        ),
      ]),
    ]);

    render(<FileTree />, { wrapper: TestProvider });

    expect(await screen.findByRole("button", { name: "Notes.md" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
