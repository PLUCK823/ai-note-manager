import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { useEditorStore } from "../editorState";
import { DiskChangeNotice } from "./DiskChangeNotice";

const checkNoteStatusMock = vi.fn();
const readNoteMock = vi.fn();
const startVaultWatcherMock = vi.fn();
const listenToEventMock = vi.fn();
const unlistenMock = vi.fn();
let vaultEventHandler:
  | ((payload: { vaultId: string; path: string; kind: string }) => void)
  | null = null;

vi.mock("../../notes/api", () => ({
  checkNoteStatus: (vaultId: string, path: string, baseHash: string) =>
    checkNoteStatusMock(vaultId, path, baseHash),
  readNote: (vaultId: string, path: string) => readNoteMock(vaultId, path),
  startVaultWatcher: (vaultId: string) => startVaultWatcherMock(vaultId),
}));

vi.mock("../../../shared/lib/tauri", () => ({
  listenToEvent: (
    eventName: string,
    handler: (payload: { vaultId: string; path: string; kind: string }) => void,
  ) => listenToEventMock(eventName, handler),
}));

describe("DiskChangeNotice", () => {
  beforeEach(() => {
    checkNoteStatusMock.mockReset();
    readNoteMock.mockReset();
    startVaultWatcherMock.mockReset();
    startVaultWatcherMock.mockResolvedValue(undefined);
    listenToEventMock.mockReset();
    unlistenMock.mockReset();
    vaultEventHandler = null;
    listenToEventMock.mockImplementation((_eventName, handler) => {
      vaultEventHandler = handler;
      return Promise.resolve(unlistenMock);
    });
    useVaultStore.getState().setCurrentVault({
      id: "vault:/Users/test/notes",
      name: "notes",
      path: "/Users/test/notes",
      lastOpenedAt: null,
    });
    useNotesStore.getState().setActivePath("README.md");
    useEditorStore.getState().loadContent({
      content: "# Local",
      baseHash: "hash-local",
    });
  });

  it("starts a native vault watcher and offers to reload after an active note event", async () => {
    checkNoteStatusMock.mockResolvedValue({
      path: "README.md",
      contentHash: "hash-disk",
      modifiedAt: "later",
      changed: true,
    });
    readNoteMock.mockResolvedValue({
      path: "README.md",
      content: "# Disk",
      contentHash: "hash-disk",
      modifiedAt: "later",
    });

    renderWithClient(<DiskChangeNotice />);

    await waitFor(() => {
      expect(startVaultWatcherMock).toHaveBeenCalledWith(
        "vault:/Users/test/notes",
      );
      expect(listenToEventMock).toHaveBeenCalledWith(
        "vault:file-changed",
        expect.any(Function),
      );
    });
    expect(checkNoteStatusMock).not.toHaveBeenCalled();

    vaultEventHandler?.({
      vaultId: "vault:/Users/test/notes",
      path: "README.md",
      kind: "modified",
    });

    expect(
      await screen.findByRole("status", { name: "External note change" }),
    ).toBeInTheDocument();
    expect(checkNoteStatusMock).toHaveBeenCalledWith(
      "vault:/Users/test/notes",
      "README.md",
      "hash-local",
    );

    fireEvent.click(screen.getByRole("button", { name: "Reload from disk" }));

    await waitFor(() => {
      expect(useEditorStore.getState().content).toBe("# Disk");
    });
    expect(useEditorStore.getState().baseHash).toBe("hash-disk");
    expect(
      screen.queryByRole("status", { name: "External note change" }),
    ).not.toBeInTheDocument();
  });

  it("can keep the local editor state and dismiss the current disk version", async () => {
    checkNoteStatusMock.mockResolvedValue({
      path: "README.md",
      contentHash: "hash-disk",
      modifiedAt: "later",
      changed: true,
    });

    renderWithClient(<DiskChangeNotice />);

    await waitFor(() => {
      expect(vaultEventHandler).not.toBeNull();
    });
    vaultEventHandler?.({
      vaultId: "vault:/Users/test/notes",
      path: "README.md",
      kind: "modified",
    });

    expect(
      await screen.findByRole("status", { name: "External note change" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));

    expect(useEditorStore.getState().content).toBe("# Local");
    expect(
      screen.queryByRole("status", { name: "External note change" }),
    ).not.toBeInTheDocument();
  });
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(ui, {
    wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    },
  });
}
