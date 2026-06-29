import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { useEditorStore } from "../editorState";
import { SaveStatus } from "./SaveStatus";

const saveNoteMock = vi.fn();

vi.mock("../../notes/api", () => ({
  saveNote: (
    vaultId: string,
    path: string,
    content: string,
    baseVersion: string,
  ) => saveNoteMock(vaultId, path, content, baseVersion),
}));

describe("SaveStatus", () => {
  beforeEach(() => {
    saveNoteMock.mockReset();
    useVaultStore.getState().setCurrentVault({
      id: "vault:/Users/test/notes",
      name: "notes",
      path: "/Users/test/notes",
      lastOpenedAt: null,
    });
    useNotesStore.getState().setActivePath("README.md");
    useEditorStore.getState().loadContent({
      content: "# Loaded",
      baseHash: "hash-1",
    });
  });

  it("saves the active note and updates the clean base hash", async () => {
    saveNoteMock.mockResolvedValue({
      path: "README.md",
      contentHash: "hash-2",
      conflict: false,
    });
    useEditorStore.getState().setContent("# Updated");

    render(<SaveStatus />);

    fireEvent.click(screen.getByRole("button", { name: /save note/i }));

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
    expect(saveNoteMock).toHaveBeenCalledWith(
      "vault:/Users/test/notes",
      "README.md",
      "# Updated",
      "hash-1",
    );
    expect(useEditorStore.getState().baseHash).toBe("hash-2");
  });
});
