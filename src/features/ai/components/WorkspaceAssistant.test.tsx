import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "../../editor/editorState";
import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { WorkspaceAssistant } from "./WorkspaceAssistant";

const planWorkspaceChangesMock = vi.fn();
const applyWorkspacePlanMock = vi.fn();

vi.mock("../api", () => ({
  applyWorkspacePlan: (vaultId: string, operations: unknown[]) =>
    applyWorkspacePlanMock(vaultId, operations),
  planWorkspaceChanges: (input: unknown) => planWorkspaceChangesMock(input),
}));

function TestProvider({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("WorkspaceAssistant", () => {
  beforeEach(() => {
    planWorkspaceChangesMock.mockReset();
    applyWorkspacePlanMock.mockReset();
    useVaultStore.getState().setCurrentVault({
      id: "vault:/tmp/workspace",
      name: "workspace",
      path: "/tmp/workspace",
      lastOpenedAt: null,
    });
    useNotesStore.getState().setActivePath("Plan.md");
    useEditorStore.getState().setSelection(null);
  });

  it("plans first and applies only the confirmed workspace operations", async () => {
    planWorkspaceChangesMock.mockResolvedValue({
      summary: "Create the release notes.",
      operations: [
        {
          kind: "create",
          path: "Release.md",
          content: "# Release\n",
          query: null,
          reason: "The requested release note does not exist.",
        },
      ],
    });
    applyWorkspacePlanMock.mockResolvedValue({
      results: [
        {
          kind: "create",
          path: "Release.md",
          message: "Created file",
          content: null,
        },
      ],
    });

    render(<WorkspaceAssistant />, { wrapper: TestProvider });

    fireEvent.change(screen.getByLabelText("Workspace instruction"), {
      target: { value: "Create release notes from Plan.md" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));

    expect(
      await screen.findByText("Create the release notes."),
    ).toBeInTheDocument();
    expect(applyWorkspacePlanMock).not.toHaveBeenCalled();
    expect(planWorkspaceChangesMock).toHaveBeenCalledWith({
      vaultId: "vault:/tmp/workspace",
      instruction: "Create release notes from Plan.md",
      activePath: "Plan.md",
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Apply selected changes" }),
    );

    await waitFor(() => {
      expect(applyWorkspacePlanMock).toHaveBeenCalledWith(
        "vault:/tmp/workspace",
        [
          expect.objectContaining({
            kind: "create",
            path: "Release.md",
          }),
        ],
      );
    });
    expect(
      await screen.findByText("Created file: Release.md"),
    ).toBeInTheDocument();
  });
});
