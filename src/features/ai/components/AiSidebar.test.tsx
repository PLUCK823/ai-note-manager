import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAiStore } from "../aiState";
import { useEditorStore } from "../../editor/editorState";
import { AiSidebar } from "./AiSidebar";

const runAiActionMock = vi.fn();

vi.mock("../api", () => ({
  runAiAction: (input: unknown) => runAiActionMock(input),
}));

describe("AiSidebar", () => {
  beforeEach(() => {
    runAiActionMock.mockReset();
    useAiStore.setState({ output: "", status: "idle", pendingChange: null });
    useEditorStore.getState().loadContent({
      content: "# Plan\n\nShip the MVP.",
      baseHash: "hash-1",
    });
  });

  it("runs summarize against the current note and renders the result", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "local-1",
      output: "## Summary\n\nShip the MVP.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(screen.getByText("## Summary")).toBeInTheDocument();
    });
    expect(screen.getByText("Ship the MVP.")).toBeInTheDocument();
    expect(runAiActionMock).toHaveBeenCalledWith({
      action: "summarize",
      noteContent: "# Plan\n\nShip the MVP.",
    });
  });

  it("previews rewrite output before applying it to the editor", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "local-2",
      output: "## Draft\n\nShip the MVP with clearer milestones.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Rewrite" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Apply AI change" })).toBeInTheDocument();
    });
    expect(useEditorStore.getState().content).toBe("# Plan\n\nShip the MVP.");

    fireEvent.click(screen.getByRole("button", { name: "Apply change" }));

    expect(useEditorStore.getState().content).toBe(
      "## Draft\n\nShip the MVP with clearer milestones.",
    );
  });
});
