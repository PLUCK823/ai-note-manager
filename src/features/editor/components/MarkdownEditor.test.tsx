import { fireEvent, render, screen } from "@testing-library/react";
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

  it("tracks selected markdown text in editor state", () => {
    render(<MarkdownEditor />);

    const editor = screen.getByLabelText("Markdown editor") as HTMLTextAreaElement;
    editor.setSelectionRange(19, 32);
    fireEvent.select(editor);

    expect(useEditorStore.getState().selection).toEqual({
      start: 19,
      end: 32,
      text: "Replace this.",
    });
  });
});
