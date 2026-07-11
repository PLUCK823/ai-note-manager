import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAiStore } from "../aiState";
import { useEditorStore } from "../../editor/editorState";
import { AiSidebar } from "./AiSidebar";

const runAiActionMock = vi.fn();
const cancelAiActionMock = vi.fn();
const eventHandlers = new Map<string, Array<(payload: unknown) => void>>();

vi.mock("../api", () => ({
  runAiAction: async (input: unknown) => {
    const result = await runAiActionMock(input);
    if (result.output) {
      setTimeout(() => {
        emitTauriEvent("ai:chunk", {
          requestId: result.requestId,
          chunk: result.output,
        });
        emitTauriEvent("ai:done", { requestId: result.requestId });
      }, 0);
    }
    return { requestId: result.requestId };
  },
  cancelAiAction: (requestId: string) => cancelAiActionMock(requestId),
}));

vi.mock("../../../shared/lib/tauri", () => ({
  listenToEvent: (
    eventName: string,
    handler: (payload: unknown) => void,
  ) => {
    const handlers = eventHandlers.get(eventName) ?? [];
    handlers.push(handler);
    eventHandlers.set(eventName, handlers);
    return Promise.resolve(() => {
      eventHandlers.set(
        eventName,
        (eventHandlers.get(eventName) ?? []).filter(
          (currentHandler) => currentHandler !== handler,
        ),
      );
    });
  },
}));

vi.mock("./WorkspaceAssistant", () => ({
  WorkspaceAssistant: () => null,
}));

describe("AiSidebar", () => {
  const writeTextMock = vi.fn();

  beforeEach(() => {
    runAiActionMock.mockReset();
    cancelAiActionMock.mockReset();
    cancelAiActionMock.mockResolvedValue(undefined);
    eventHandlers.clear();
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

  it("renders streamed chunks before the AI action is done", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "stream-1",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(runAiActionMock).toHaveBeenCalled();
    });
    emitTauriEvent("ai:chunk", {
      requestId: "stream-1",
      chunk: "## Summary\n\n",
    });
    emitTauriEvent("ai:chunk", {
      requestId: "stream-1",
      chunk: "Ship the MVP.",
    });

    expect(await screen.findByText("## Summary")).toBeInTheDocument();
    expect(screen.getByText("Ship the MVP.")).toBeInTheDocument();
    expect(screen.getByText("Running AI action...")).toBeInTheDocument();

    emitTauriEvent("ai:done", { requestId: "stream-1" });

    await waitFor(() => {
      expect(screen.queryByText("Running AI action...")).not.toBeInTheDocument();
    });
  });

  it("accepts streamed chunks that arrive before the action response resolves", async () => {
    runAiActionMock.mockImplementation(async () => {
      emitTauriEvent("ai:chunk", {
        requestId: "early-stream",
        chunk: "## Draft\n\nShip the MVP with less race risk.",
      });
      emitTauriEvent("ai:done", { requestId: "early-stream" });
      return { requestId: "early-stream" };
    });

    render(<AiSidebar />);

    await waitFor(() => {
      expect(eventHandlers.get("ai:chunk")?.length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Rewrite" }));

    expect(
      await screen.findByRole("dialog", { name: "Apply AI change" }),
    ).toBeInTheDocument();
    expect(screen.getByText("## Draft")).toBeInTheDocument();
  });

  it("surfaces an AI error that arrives before the action response resolves", async () => {
    runAiActionMock.mockImplementation(async () => {
      emitTauriEvent("ai:error", {
        requestId: "early-error",
        message: "ai_request_failed",
      });
      return { requestId: "early-error" };
    });

    render(<AiSidebar />);

    await waitFor(() => {
      expect(eventHandlers.get("ai:error")?.length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    expect(await screen.findByText("AI request failed.")).toBeInTheDocument();
    expect(screen.queryByText("Running AI action...")).not.toBeInTheDocument();
  });

  it("cancels the active backend AI request", async () => {
    runAiActionMock.mockResolvedValue({
      requestId: "stream-cancel",
    });

    render(<AiSidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Summarize" }));

    await screen.findByText("Running AI action...");
    await waitFor(() => {
      expect(runAiActionMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel generation" }));

    expect(cancelAiActionMock).toHaveBeenCalledWith("stream-cancel");
    emitTauriEvent("ai:chunk", {
      requestId: "stream-cancel",
      chunk: "This should not render.",
    });
    expect(screen.queryByText("This should not render.")).not.toBeInTheDocument();
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

function emitTauriEvent(eventName: string, payload: unknown) {
  for (const handler of eventHandlers.get(eventName) ?? []) {
    handler(payload);
  }
}
