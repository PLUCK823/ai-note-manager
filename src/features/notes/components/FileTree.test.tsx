import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultStore } from "../../vault/hooks";
import { useNotesStore } from "../hooks";
import type { FileTreeNode } from "../types";
import { FileTree } from "./FileTree";

const listMarkdownFilesMock = vi.fn();
const createNoteMock = vi.fn();
const createFolderMock = vi.fn();

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
  createNote: (vaultId: string, parentPath: string, title: string) =>
    createNoteMock(vaultId, parentPath, title),
  createFolder: (vaultId: string, parentPath: string, name: string) =>
    createFolderMock(vaultId, parentPath, name),
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
    createNoteMock.mockReset();
    createFolderMock.mockReset();
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
      expect(
        screen.getByRole("button", { name: "README.md" }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "projects" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();
    expect(listMarkdownFilesMock).toHaveBeenCalledWith(
      "vault:/Users/test/notes",
    );
  });

  it("shows the selected vault as the explorer root with file operation controls", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([]);

    render(<FileTree />, { wrapper: TestProvider });

    expect(
      await screen.findByRole("button", { name: "notes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New file" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New folder" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Refresh file tree" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse all folders" }),
    ).toBeInTheDocument();
  });

  it("creates a Markdown file at the selected vault root", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([]);
    createNoteMock.mockResolvedValue({ path: "Daily.md", title: "Daily" });

    render(<FileTree />, { wrapper: TestProvider });

    fireEvent.click(await screen.findByRole("button", { name: "New file" }));
    fireEvent.change(screen.getByLabelText("New file name"), {
      target: { value: "Daily" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create file" }));

    await waitFor(() => {
      expect(createNoteMock).toHaveBeenCalledWith(
        "vault:/Users/test/notes",
        "",
        "Daily",
      );
    });
  });

  it("creates a folder at the selected vault root", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([]);
    createFolderMock.mockResolvedValue({
      name: "Projects",
      path: "Projects",
      kind: "folder",
      children: [],
    });

    render(<FileTree />, { wrapper: TestProvider });

    fireEvent.click(await screen.findByRole("button", { name: "New folder" }));
    fireEvent.change(screen.getByLabelText("New folder name"), {
      target: { value: "Projects" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create folder" }));

    await waitFor(() => {
      expect(createFolderMock).toHaveBeenCalledWith(
        "vault:/Users/test/notes",
        "",
        "Projects",
      );
    });
  });

  it("collapses the root contents and refreshes the selected vault tree", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([fileNode("README.md")]);

    render(<FileTree />, { wrapper: TestProvider });

    const root = await screen.findByRole("button", { name: "notes" });
    expect(
      screen.getByRole("button", { name: "README.md" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse all folders" }),
    );
    expect(root).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("button", { name: "README.md" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh file tree" }));
    await waitFor(() => {
      expect(listMarkdownFilesMock).toHaveBeenCalledTimes(2);
    });
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
    expect(
      screen.queryByRole("button", { name: "Plan.md" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "README.md" }),
    ).toBeInTheDocument();
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

    expect(
      screen.getByRole("button", { name: "Notes.md" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plan.md" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "research" }));

    expect(
      screen.queryByRole("button", { name: "Notes.md" }),
    ).not.toBeInTheDocument();
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

    expect(
      await screen.findByRole("button", { name: "Notes.md" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("uses default folder expansion after switching vaults", async () => {
    useVaultStore.getState().setCurrentVault(testVault);
    listMarkdownFilesMock.mockResolvedValue([
      folderNode("projects", [fileNode("Plan.md", "projects/Plan.md")]),
    ]);

    render(<FileTree />, { wrapper: TestProvider });

    const projects = await screen.findByRole("button", { name: "projects" });
    fireEvent.click(projects);
    expect(projects).toHaveAttribute("aria-expanded", "false");

    act(() => {
      useVaultStore.getState().setCurrentVault({
        ...testVault,
        id: "vault:/Users/test/second-notes",
        name: "second-notes",
        path: "/Users/test/second-notes",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "projects" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    });
  });
});
