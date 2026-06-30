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
  const writeTextMock = vi.fn();

  beforeEach(() => {
    runAiActionMock.mockReset();
    writeTextMock.mockReset();
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
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

  it("copies AI output to the clipboard", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "local-copy",
      output: "## Summary\n\nShip the MVP.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await screen.findByText("## Summary");
    fireEvent.click(screen.getByRole("button", { name: "Copy output" }));

    expect(writeTextMock).toHaveBeenCalledWith("## Summary\n\nShip the MVP.");
  });

  it("cancels a running AI action and ignores its eventual result", async () => {
    let resolveAction: (value: { requestId: string; output: string }) => void =
      () => {};
    runAiActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    expect(screen.getByText("Running AI action...")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel generation" }));
    resolveAction({
      requestId: "local-cancelled",
      output: "## Summary\n\nThis should not render.",
    });

    await waitFor(() => {
      expect(screen.queryByText("This should not render.")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Running AI action...")).not.toBeInTheDocument();
  });

  it("previews inserting AI output at the editor cursor before applying it", async () => {
    useEditorStore.getState().loadContent({
      content: "# Plan\n\nShip the MVP.",
      baseHash: "hash-insert",
    });
    useEditorStore.getState().setCursorPosition(8);
    runAiActionMock.mockResolvedValue({
      requestId: "local-insert",
      output: "## Summary\n\nShip the MVP.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await screen.findByText("## Summary");
    fireEvent.click(screen.getByRole("button", { name: "Insert at cursor" }));

    expect(screen.getByRole("dialog", { name: "Apply AI change" })).toBeInTheDocument();
    expect(useEditorStore.getState().content).toBe("# Plan\n\nShip the MVP.");

    fireEvent.click(screen.getByRole("button", { name: "Apply change" }));

    expect(useEditorStore.getState().content).toBe(
      "# Plan\n\n## Summary\n\nShip the MVP.\n\nShip the MVP.",
    );
  });

  it("previews appending AI output before applying it", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "local-append",
      output: "## Summary\n\nShip the MVP.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await screen.findByText("## Summary");
    fireEvent.click(screen.getByRole("button", { name: "Append to note" }));

    expect(screen.getByRole("dialog", { name: "Apply AI change" })).toBeInTheDocument();
    expect(useEditorStore.getState().content).toBe("# Plan\n\nShip the MVP.");

    fireEvent.click(screen.getByRole("button", { name: "Apply change" }));

    expect(useEditorStore.getState().content).toBe(
      "# Plan\n\nShip the MVP.\n\n## Summary\n\nShip the MVP.",
    );
  });

  it("runs improvement suggestions as a non-writing AI action", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "local-improvements",
      output: "## Improvements\n\n- Add concrete next steps.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Improvements" }));

    await waitFor(() => {
      expect(screen.getByText("## Improvements")).toBeInTheDocument();
    });
    expect(screen.getByText("- Add concrete next steps.")).toBeInTheDocument();
    expect(runAiActionMock).toHaveBeenCalledWith({
      action: "suggest_improvements",
      noteContent: "# Plan\n\nShip the MVP.",
    });
    expect(
      screen.queryByRole("dialog", { name: "Apply AI change" }),
    ).not.toBeInTheDocument();
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

  it("sends selected text for rewrite and applies the result only to that range", async () => {
    useEditorStore.getState().loadContent({
      content: "# Plan\n\nKeep this. Replace this.",
      baseHash: "hash-2",
    });
    useEditorStore.getState().setSelection({
      start: 19,
      end: 32,
      text: "Replace this.",
    });
    runAiActionMock.mockResolvedValue({
      requestId: "local-3",
      output: "Improve this.",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Rewrite" }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Apply AI change" })).toBeInTheDocument();
    });
    expect(runAiActionMock).toHaveBeenCalledWith({
      action: "rewrite_selection",
      noteContent: "# Plan\n\nKeep this. Replace this.",
      selectedText: "Replace this.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Apply change" }));

    expect(useEditorStore.getState().content).toBe(
      "# Plan\n\nKeep this. Improve this.",
    );
  });

  it.each([
    ["Compress", "compress_selection"],
    ["Expand", "expand_selection"],
  ] as const)(
    "sends selected text for %s and applies the result only to that range",
    async (buttonName, action) => {
      useEditorStore.getState().loadContent({
        content: "# Plan\n\nKeep this. Replace this.",
        baseHash: "hash-2",
      });
      useEditorStore.getState().setSelection({
        start: 19,
        end: 32,
        text: "Replace this.",
      });
      runAiActionMock.mockResolvedValue({
        requestId: "local-4",
        output: "Improve this.",
      });

      render(<AiSidebar />);

      fireEvent.click(screen.getByRole("button", { name: buttonName }));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Apply AI change" })).toBeInTheDocument();
      });
      expect(runAiActionMock).toHaveBeenCalledWith({
        action,
        noteContent: "# Plan\n\nKeep this. Replace this.",
        selectedText: "Replace this.",
      });

      fireEvent.click(screen.getByRole("button", { name: "Apply change" }));

      expect(useEditorStore.getState().content).toBe(
        "# Plan\n\nKeep this. Improve this.",
      );
    },
  );
});
