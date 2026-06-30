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
});
