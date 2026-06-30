import type { EditorView } from "@codemirror/view";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "../editorState";
import { MarkdownEditor } from "./MarkdownEditor";

describe("MarkdownEditor", () => {
  beforeEach(() => {
    useEditorStore.getState().loadContent({
      content: "# Plan\n\nKeep this. Replace this.",
      baseHash: "hash-1",
    });
  });

  it("renders a CodeMirror markdown editor", () => {
    const { container } = render(<MarkdownEditor />);

    expect(screen.getByLabelText("Markdown editor")).toHaveClass("cm-content");
    expect(container.querySelector(".cm-editor")).toBeInTheDocument();
    expect(container.querySelector("textarea.markdown-editor")).not.toBeInTheDocument();
  });

  it("tracks selected markdown text in editor state", () => {
    let editorView: EditorView | null = null;
    render(<MarkdownEditor onEditorReady={(view) => (editorView = view)} />);

    act(() => {
      editorView?.dispatch({
        selection: {
          anchor: 19,
          head: 32,
        },
      });
    });

    expect(useEditorStore.getState().selection).toEqual({
      start: 19,
      end: 32,
      text: "Replace this.",
    });
  });
});
