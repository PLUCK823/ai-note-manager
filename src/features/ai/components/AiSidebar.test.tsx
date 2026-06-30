import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEditorStore } from "../../editor/editorState";
import { AiSidebar } from "./AiSidebar";

const runAiActionMock = vi.fn();

vi.mock("../api", () => ({
  runAiAction: (input: unknown) => runAiActionMock(input),
}));

describe("AiSidebar", () => {
  beforeEach(() => {
    runAiActionMock.mockReset();
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
});
