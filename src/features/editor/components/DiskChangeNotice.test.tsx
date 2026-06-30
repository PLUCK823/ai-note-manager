import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { useEditorStore } from "../editorState";
import { DiskChangeNotice } from "./DiskChangeNotice";

const checkNoteStatusMock = vi.fn();
const readNoteMock = vi.fn();

vi.mock("../../notes/api", () => ({
  checkNoteStatus: (vaultId: string, path: string, baseHash: string) =>
    checkNoteStatusMock(vaultId, path, baseHash),
  readNote: (vaultId: string, path: string) => readNoteMock(vaultId, path),
}));

describe("DiskChangeNotice", () => {
  beforeEach(() => {
    checkNoteStatusMock.mockReset();
    readNoteMock.mockReset();
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

  it("offers to reload when the active note changed on disk", async () => {
    checkNoteStatusMock
      .mockResolvedValueOnce({
        path: "README.md",
        contentHash: "hash-disk",
        modifiedAt: "later",
        changed: true,
      })
      .mockResolvedValue({
        path: "README.md",
        contentHash: "hash-disk",
        modifiedAt: "later",
        changed: false,
      });
    readNoteMock.mockResolvedValue({
      path: "README.md",
      content: "# Disk",
      contentHash: "hash-disk",
      modifiedAt: "later",
    });

    render(<DiskChangeNotice />);

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

    render(<DiskChangeNotice />);

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
