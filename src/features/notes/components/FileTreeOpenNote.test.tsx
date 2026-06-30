import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarkdownEditor } from "../../editor/components/MarkdownEditor";
import { useEditorStore } from "../../editor/editorState";
import { useVaultStore } from "../../vault/hooks";
import { useNotesStore } from "../hooks";
import { FileTree } from "./FileTree";

const listMarkdownFilesMock = vi.fn();
const readNoteMock = vi.fn();

vi.mock("../api", () => ({
  listMarkdownFiles: (vaultId: string) => listMarkdownFilesMock(vaultId),
  readNote: (vaultId: string, path: string) => readNoteMock(vaultId, path),
}));

function TestProvider({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("FileTree opening notes", () => {
  beforeEach(() => {
    listMarkdownFilesMock.mockReset();
    readNoteMock.mockReset();
    useVaultStore.getState().setCurrentVault({
      id: "vault:/Users/test/notes",
      name: "notes",
      path: "/Users/test/notes",
      lastOpenedAt: null,
    });
    useNotesStore.getState().setActivePath(null);
    useEditorStore.getState().loadContent({
      content: "",
      baseHash: "",
    });
  });

  it("loads a clicked markdown file into the editor", async () => {
    listMarkdownFilesMock.mockResolvedValue([
      {
        name: "README.md",
        path: "README.md",
        kind: "file",
        children: [],
      },
    ]);
    readNoteMock.mockResolvedValue({
      path: "README.md",
      content: "# Loaded\n\nFrom disk",
      modifiedAt: "2026-06-29T00:00:00Z",
      contentHash: "hash-1",
    });

    render(
      <>
        <FileTree />
        <MarkdownEditor />
      </>,
      { wrapper: TestProvider },
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "README.md" }),
    );

    await waitFor(() => {
      expect(useEditorStore.getState().content).toBe("# Loaded\n\nFrom disk");
    });
    expect(screen.getByLabelText("Markdown editor")).toHaveTextContent(
      "From disk",
    );
    expect(useNotesStore.getState().activePath).toBe("README.md");
    expect(useEditorStore.getState().baseHash).toBe("hash-1");
  });
});
