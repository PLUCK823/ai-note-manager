import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "../editorState";
import { MarkdownPreview } from "./MarkdownPreview";

describe("MarkdownPreview", () => {
  beforeEach(() => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-1",
      content: [
        "---",
        "tags: [mvp]",
        "---",
        "# Launch Plan",
        "",
        "Ship the [MVP](https://example.com) safely.",
        "",
        "- Pick vault",
        "- Save note",
        "",
        "1. Review",
        "2. Release",
        "",
        "```ts",
        "const ready = true;",
        "```",
      ].join("\n"),
    });
  });

  it("renders common markdown blocks without showing frontmatter", () => {
    render(<MarkdownPreview />);

    expect(
      screen.getByRole("heading", { name: "Launch Plan", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("tags: [mvp]")).not.toBeInTheDocument();

    const link = screen.getByRole("link", { name: "MVP" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(
      screen.getByText((content) => content.includes("Ship the")),
    ).toBeInTheDocument();

    const unorderedList = screen.getByRole("list", {
      name: "Markdown bullet list",
    });
    expect(within(unorderedList).getByText("Pick vault")).toBeInTheDocument();
    expect(within(unorderedList).getByText("Save note")).toBeInTheDocument();

    const orderedList = screen.getByRole("list", {
      name: "Markdown numbered list",
    });
    expect(within(orderedList).getByText("Review")).toBeInTheDocument();
    expect(within(orderedList).getByText("Release")).toBeInTheDocument();

    expect(screen.getByText("const ready = true;")).toBeInTheDocument();
  });

  it("renders tables, images, and task lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-2",
      content: [
        "# Release Notes",
        "",
        "| Area | Status |",
        "| --- | --- |",
        "| Editor | Ready |",
        "| Search | Watching |",
        "",
        "![Preview diagram](https://example.com/preview.png)",
        "",
        "- [x] Write smoke test",
        "- [ ] Package release",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const table = screen.getByRole("table", { name: "Markdown table" });
    expect(within(table).getByRole("columnheader", { name: "Area" }));
    expect(within(table).getByRole("columnheader", { name: "Status" }));
    expect(within(table).getByRole("cell", { name: "Editor" }));
    expect(within(table).getByRole("cell", { name: "Watching" }));

    const image = screen.getByRole("img", { name: "Preview diagram" });
    expect(image).toHaveAttribute("src", "https://example.com/preview.png");

    const taskList = screen.getByRole("list", {
      name: "Markdown task list",
    });
    expect(within(taskList).getByLabelText("Write smoke test")).toBeChecked();
    expect(
      within(taskList).getByLabelText("Package release"),
    ).not.toBeChecked();
  });

  it("renders blockquotes with inline markdown", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-3",
      content: [
        "# Research",
        "",
        "> Keep the [source](https://example.com/source) visible.",
        "> Quote the decision context.",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const quote = screen.getByRole("blockquote", {
      name: "Markdown blockquote",
    });
    expect(quote).toHaveTextContent(
      "Keep the source visible. Quote the decision context.",
    );
    expect(within(quote).getByRole("link", { name: "source" })).toHaveAttribute(
      "href",
      "https://example.com/source",
    );
  });

  it("renders footnote references and definitions", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-4",
      content: [
        "# Decision",
        "",
        "Ship the desktop smoke coverage first.[^priority]",
        "",
        "[^priority]: It protects the real Tauri shell workflow.",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const footnoteReference = screen.getByRole("link", { name: "priority" });
    expect(footnoteReference).toHaveAttribute("href", "#footnote-priority");
    expect(screen.queryByText(/^\[\^priority\]:/)).not.toBeInTheDocument();

    const footnotes = screen.getByRole("list", { name: "Markdown footnotes" });
    expect(within(footnotes).getByText("priority")).toBeInTheDocument();
    expect(
      within(footnotes).getByText("It protects the real Tauri shell workflow."),
    ).toBeInTheDocument();
  });
});
