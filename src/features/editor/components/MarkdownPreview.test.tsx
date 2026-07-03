import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "../editorState";
import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { MarkdownPreview } from "./MarkdownPreview";

describe("MarkdownPreview", () => {
  beforeEach(() => {
    useVaultStore.getState().setCurrentVault(null);
    useNotesStore.getState().setActivePath(null);
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

  it("renders inline links with optional title text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-inline-link-title",
      content: [
        "# References",
        "",
        'Read the [release docs](https://example.com/docs "Release docs").',
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "release docs" });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).toHaveAttribute("title", "Release docs");
    expect(
      screen.queryByText('[release docs](https://example.com/docs "Release docs")'),
    ).not.toBeInTheDocument();
  });

  it("renders inline links with single-quoted title text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-inline-link-single-quoted-title",
      content: [
        "# References",
        "",
        "Read the [release notes](https://example.com/notes 'Release notes').",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "release notes" });
    expect(link).toHaveAttribute("href", "https://example.com/notes");
    expect(link).toHaveAttribute("title", "Release notes");
    expect(
      screen.queryByText("[release notes](https://example.com/notes 'Release notes')"),
    ).not.toBeInTheDocument();
  });

  it("renders inline links with parenthesized title text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-inline-link-parenthesized-title",
      content: [
        "# References",
        "",
        "Read the [release guide](https://example.com/guide (Release guide)).",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "release guide" });
    expect(link).toHaveAttribute("href", "https://example.com/guide");
    expect(link).toHaveAttribute("title", "Release guide");
    expect(
      screen.queryByText("[release guide](https://example.com/guide (Release guide))"),
    ).not.toBeInTheDocument();
  });

  it("renders hard line breaks in paragraphs", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-hard-line-breaks",
      content: [
        "# Release Notes",
        "",
        "Deploy checklist  ",
        "Confirm smoke test\\",
        "Publish notes",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const paragraph = screen.getByText((_, element) => {
      return element?.tagName === "P" && element.textContent === "Deploy checklistConfirm smoke testPublish notes";
    });
    expect(paragraph.querySelectorAll("br")).toHaveLength(2);
    expect(container).not.toHaveTextContent("Confirm smoke test\\");
  });

  it("renders tilde fenced code blocks", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-tilde-code",
      content: [
        "# Build Script",
        "",
        "~~~ts",
        "const target = 'desktop';",
        "~~~",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const codeBlock = container.querySelector("pre code");
    expect(codeBlock).toHaveTextContent("const target = 'desktop';");
    expect(screen.queryByText("~~~ts")).not.toBeInTheDocument();
  });

  it("renders fenced code blocks with spaced info strings", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-spaced-info-code",
      content: [
        "# Build Script",
        "",
        "``` ts",
        "const channel = 'stable';",
        "```",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const codeBlock = container.querySelector("pre code");
    expect(codeBlock).toHaveTextContent("const channel = 'stable';");
    expect(screen.queryByText("``` ts")).not.toBeInTheDocument();
  });

  it("renders fenced code blocks with longer fences", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-long-fence-code",
      content: [
        "# Build Script",
        "",
        "````md",
        "```",
        "const inside = true;",
        "```",
        "````",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const codeBlock = container.querySelector("pre code");
    expect(codeBlock).toHaveTextContent("const inside = true;");
    expect(codeBlock).toHaveTextContent("```");
    expect(screen.queryByText("````md")).not.toBeInTheDocument();
  });

  it("renders indented code blocks", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-indented-code",
      content: [
        "# Build Script",
        "",
        "    const port = 1420;",
        "    const host = '127.0.0.1';",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const codeBlock = container.querySelector("pre code");
    expect(codeBlock).toHaveTextContent("const port = 1420;");
    expect(codeBlock).toHaveTextContent("const host = '127.0.0.1';");
  });

  it("renders heading levels four through six", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-headings",
      content: [
        "#### Implementation Detail",
        "",
        "##### Verification Detail",
        "",
        "###### Trace Detail",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    expect(
      screen.getByRole("heading", {
        name: "Implementation Detail",
        level: 4,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Verification Detail", level: 5 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trace Detail", level: 6 }),
    ).toBeInTheDocument();
  });

  it("omits closing hash sequences from ATX heading text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-atx-closing-sequence",
      content: [
        "## Release Scope ##",
        "",
        "### Verification Notes ###   ",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    expect(
      screen.getByRole("heading", { name: "Release Scope", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Verification Notes", level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Release Scope ##", level: 2 }),
    ).not.toBeInTheDocument();
  });

  it("renders setext headings as level one and two headings", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-setext-headings",
      content: [
        "Release Plan",
        "============",
        "",
        "Verification Notes",
        "------------------",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    expect(
      screen.getByRole("heading", { name: "Release Plan", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Verification Notes", level: 2 }),
    ).toBeInTheDocument();
  });

  it("renders thematic breaks as separators", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-thematic-breaks",
      content: [
        "# Release Notes",
        "",
        "Ready for verification.",
        "",
        "---",
        "",
        "Implementation detail.",
        "",
        "***",
        "",
        "Audit trail.",
        "",
        "___",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    expect(
      screen.getByText("Ready for verification."),
    ).toBeInTheDocument();
    expect(screen.getByText("Implementation detail.")).toBeInTheDocument();
    expect(screen.getByText("Audit trail.")).toBeInTheDocument();
    expect(
      screen.getAllByRole("separator", { name: "Markdown thematic break" }),
    ).toHaveLength(3);
    expect(screen.queryByText("---")).not.toBeInTheDocument();
    expect(screen.queryByText("***")).not.toBeInTheDocument();
    expect(screen.queryByText("___")).not.toBeInTheDocument();
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

  it("renders pipe tables without outer pipes", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-table-without-outer-pipes",
      content: [
        "# Release Notes",
        "",
        "Area | Status",
        "--- | ---",
        "Editor | Ready",
        "Search | Watching",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const table = screen.getByRole("table", { name: "Markdown table" });
    expect(within(table).getByRole("columnheader", { name: "Area" }));
    expect(within(table).getByRole("columnheader", { name: "Status" }));
    expect(within(table).getByRole("cell", { name: "Editor" }));
    expect(within(table).getByRole("cell", { name: "Watching" }));
    expect(screen.queryByText("Area | Status")).not.toBeInTheDocument();
  });

  it("renders table column alignment markers", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-table-column-alignment",
      content: [
        "# Release Notes",
        "",
        "| Area | Owner | Status |",
        "| :--- | :---: | ---: |",
        "| Editor | Core | Ready |",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const table = screen.getByRole("table", { name: "Markdown table" });
    expect(within(table).getByRole("columnheader", { name: "Area" })).toHaveStyle({
      textAlign: "left",
    });
    expect(within(table).getByRole("columnheader", { name: "Owner" })).toHaveStyle({
      textAlign: "center",
    });
    expect(within(table).getByRole("columnheader", { name: "Status" })).toHaveStyle({
      textAlign: "right",
    });
    expect(within(table).getByRole("cell", { name: "Core" })).toHaveStyle({
      textAlign: "center",
    });
  });

  it("resolves local image paths from the active note without escaping the vault", () => {
    useVaultStore.getState().setCurrentVault({
      id: "vault:/Users/test/notes",
      lastOpenedAt: null,
      name: "notes",
      path: "/Users/test/notes",
    });
    useNotesStore.getState().setActivePath("projects/launch/Plan.md");
    useEditorStore.getState().loadContent({
      baseHash: "hash-local-image",
      content: [
        "# Visual Notes",
        "",
        "![Launch diagram](../assets/diagram.png)",
        "",
        "![Escaping diagram](../../../secrets.png)",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const image = screen.getByRole("img", { name: "Launch diagram" });
    expect(image).toHaveAttribute(
      "src",
      "asset://localhost/%2FUsers%2Ftest%2Fnotes%2Fprojects%2Fassets%2Fdiagram.png",
    );
    expect(
      screen.queryByRole("img", { name: "Escaping diagram" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("![Escaping diagram](../../../secrets.png)"),
    ).toBeInTheDocument();
  });

  it("renders markdown entity references in image alt text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-image-alt-entities",
      content: [
        "# Visual Notes",
        "",
        "![Launch &amp; preview &lt;draft&gt;](https://example.com/preview.png)",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const image = screen.getByRole("img", { name: "Launch & preview <draft>" });
    expect(image).toHaveAttribute("src", "https://example.com/preview.png");
    expect(
      screen.queryByRole("img", { name: "Launch &amp; preview &lt;draft&gt;" }),
    ).not.toBeInTheDocument();
  });

  it("renders reference-style images", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-reference-image",
      content: [
        "# Visual Notes",
        "",
        "![Preview diagram][preview-image]",
        "",
        "[preview-image]: https://example.com/preview.png",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const image = screen.getByRole("img", { name: "Preview diagram" });
    expect(image).toHaveAttribute("src", "https://example.com/preview.png");
    expect(
      screen.queryByText("[preview-image]: https://example.com/preview.png"),
    ).not.toBeInTheDocument();
  });

  it("renders collapsed reference-style images", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-collapsed-reference-image",
      content: [
        "# Visual Notes",
        "",
        "![Preview diagram][]",
        "",
        "[Preview diagram]: https://example.com/preview.png",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const image = screen.getByRole("img", { name: "Preview diagram" });
    expect(image).toHaveAttribute("src", "https://example.com/preview.png");
    expect(
      screen.queryByText("[Preview diagram]: https://example.com/preview.png"),
    ).not.toBeInTheDocument();
  });

  it("renders shortcut reference-style images", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-shortcut-reference-image",
      content: [
        "# Visual Notes",
        "",
        "![Preview diagram]",
        "",
        "[Preview diagram]: https://example.com/preview.png",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const image = screen.getByRole("img", { name: "Preview diagram" });
    expect(image).toHaveAttribute("src", "https://example.com/preview.png");
    expect(
      screen.queryByText("[Preview diagram]: https://example.com/preview.png"),
    ).not.toBeInTheDocument();
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

  it("renders inline code, bold, and italic text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-inline",
      content: [
        "# Inline",
        "",
        "Use `pnpm check` before **shipping** the *desktop workflow*.",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const code = container.querySelector("p code");
    const strong = container.querySelector("p strong");
    const emphasis = container.querySelector("p em");

    expect(code).toHaveTextContent("pnpm check");
    expect(strong).toHaveTextContent("shipping");
    expect(emphasis).toHaveTextContent("desktop workflow");
  });

  it("renders backslash-escaped punctuation as literal text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-backslash-escaped-punctuation",
      content: [
        "# Inline",
        "",
        "Show \\*literal asterisks\\* and \\[plain label\\](https://example.com).",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    expect(
      screen.getByText(
        "Show *literal asterisks* and [plain label](https://example.com).",
      ),
    ).toBeInTheDocument();
    expect(container.querySelector("p em")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "plain label" })).not.toBeInTheDocument();
  });

  it("renders escaped backslashes before markdown formatting markers", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-escaped-backslash-before-formatting",
      content: [
        "# Inline",
        "",
        "Show \\\\*emphasized after slash*.",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const paragraph = container.querySelector(".markdown-preview-body p");
    const emphasis = container.querySelector("p em");
    expect(paragraph).toHaveTextContent("Show \\emphasized after slash.");
    expect(emphasis).toHaveTextContent("emphasized after slash");
  });

  it("renders markdown entity references as text characters", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-markdown-entities",
      content: [
        "# Inline",
        "",
        "Use AT&amp;T &lt;release&gt; &#x2713; &#10003; &quot;quoted&quot;.",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    expect(
      screen.getByText('Use AT&T <release> ✓ ✓ "quoted".'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/&amp;|&lt;|&#x2713;|&#10003;|&quot;/)).not.toBeInTheDocument();
  });

  it("renders markdown entity references inside inline formatting", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-inline-markdown-entities",
      content: [
        "# Inline",
        "",
        "Review **AT&amp;T** with *owner &lt;team&gt;*, ~~old &quot;copy&quot;~~, and [Docs &amp; Help](https://example.com/docs).",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    expect(container.querySelector("p strong")).toHaveTextContent("AT&T");
    expect(container.querySelector("p em")).toHaveTextContent("owner <team>");
    expect(container.querySelector("p del")).toHaveTextContent('old "copy"');
    expect(screen.getByRole("link", { name: "Docs & Help" })).toHaveAttribute(
      "href",
      "https://example.com/docs",
    );
  });

  it("renders double-backtick inline code spans", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-double-backtick-inline-code",
      content: [
        "# Inline",
        "",
        "Use ``pnpm `check` command`` before release.",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const code = container.querySelector("p code");
    expect(code).toHaveTextContent("pnpm `check` command");
    expect(screen.queryByText("``pnpm `check` command``")).not.toBeInTheDocument();
  });

  it("renders underscore bold and italic text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-underscore-inline",
      content: [
        "# Inline",
        "",
        "Review __release notes__ before _vault restore_.",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const strong = container.querySelector("p strong");
    const emphasis = container.querySelector("p em");

    expect(strong).toHaveTextContent("release notes");
    expect(emphasis).toHaveTextContent("vault restore");
    expect(screen.queryByText("__release notes__")).not.toBeInTheDocument();
    expect(screen.queryByText("_vault restore_")).not.toBeInTheDocument();
  });

  it("renders strikethrough text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-strikethrough",
      content: [
        "# Inline",
        "",
        "Archive the ~~deprecated~~ checklist.",
      ].join("\n"),
    });

    const { container } = render(<MarkdownPreview />);

    const deletedText = container.querySelector("p del");
    expect(deletedText).toHaveTextContent("deprecated");
    expect(screen.queryByText("~~deprecated~~")).not.toBeInTheDocument();
  });

  it("renders http and https autolinks", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-autolinks",
      content: [
        "# References",
        "",
        "Read <https://example.com/spec> and <http://example.com/archive>.",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const secureLink = screen.getByRole("link", {
      name: "https://example.com/spec",
    });
    expect(secureLink).toHaveAttribute("href", "https://example.com/spec");

    const plainLink = screen.getByRole("link", {
      name: "http://example.com/archive",
    });
    expect(plainLink).toHaveAttribute("href", "http://example.com/archive");
    expect(screen.queryByText("<https://example.com/spec>")).not.toBeInTheDocument();
  });

  it("renders reference-style links", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-reference-links",
      content: [
        "# References",
        "",
        "Review the [release spec][release-spec] before packaging.",
        "",
        "[release-spec]: https://example.com/release",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "release spec" });
    expect(link).toHaveAttribute("href", "https://example.com/release");
    expect(
      screen.queryByText("[release-spec]: https://example.com/release"),
    ).not.toBeInTheDocument();
  });

  it("renders reference-style links with title text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-reference-link-title",
      content: [
        "# References",
        "",
        "Review the [release spec][release-spec] before packaging.",
        "",
        '[release-spec]: https://example.com/release "Release spec"',
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "release spec" });
    expect(link).toHaveAttribute("href", "https://example.com/release");
    expect(link).toHaveAttribute("title", "Release spec");
    expect(
      screen.queryByText('[release-spec]: https://example.com/release "Release spec"'),
    ).not.toBeInTheDocument();
  });

  it("renders reference-style links with single-quoted title text", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-reference-link-single-quoted-title",
      content: [
        "# References",
        "",
        "Review the [release notes][release-notes] before packaging.",
        "",
        "[release-notes]: https://example.com/notes 'Release notes'",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "release notes" });
    expect(link).toHaveAttribute("href", "https://example.com/notes");
    expect(link).toHaveAttribute("title", "Release notes");
    expect(
      screen.queryByText("[release-notes]: https://example.com/notes 'Release notes'"),
    ).not.toBeInTheDocument();
  });

  it("renders collapsed reference-style links", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-collapsed-reference-links",
      content: [
        "# References",
        "",
        "Review the [Release Spec][] before packaging.",
        "",
        "[Release Spec]: https://example.com/release",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "Release Spec" });
    expect(link).toHaveAttribute("href", "https://example.com/release");
    expect(
      screen.queryByText("[Release Spec]: https://example.com/release"),
    ).not.toBeInTheDocument();
  });

  it("renders shortcut reference-style links", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-shortcut-reference-links",
      content: [
        "# References",
        "",
        "Review [Release Spec] before packaging.",
        "",
        "[Release Spec]: https://example.com/release",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const link = screen.getByRole("link", { name: "Release Spec" });
    expect(link).toHaveAttribute("href", "https://example.com/release");
    expect(
      screen.queryByText("[Release Spec]: https://example.com/release"),
    ).not.toBeInTheDocument();
  });

  it("renders email autolinks as mailto links", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-email-autolinks",
      content: [
        "# Contacts",
        "",
        "Send release notes to <team@example.com>.",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const emailLink = screen.getByRole("link", { name: "team@example.com" });
    expect(emailLink).toHaveAttribute("href", "mailto:team@example.com");
    expect(screen.queryByText("<team@example.com>")).not.toBeInTheDocument();
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

  it("renders nested unordered lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-5",
      content: [
        "# Outline",
        "",
        "- Plan release",
        "  - Verify browser smoke",
        "  - Verify desktop smoke",
        "- Ship build",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const outerList = screen.getByRole("list", {
      name: "Markdown bullet list",
    });
    const parentItem = within(outerList).getByText("Plan release").closest("li");
    expect(parentItem).not.toBeNull();

    const nestedList = within(parentItem!).getByRole("list", {
      name: "Markdown nested bullet list",
    });
    expect(within(nestedList).getByText("Verify browser smoke")).toBeInTheDocument();
    expect(within(nestedList).getByText("Verify desktop smoke")).toBeInTheDocument();
    expect(within(outerList).getByText("Ship build")).toBeInTheDocument();
  });

  it("renders plus-marker unordered lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-plus-list",
      content: [
        "# Release Checks",
        "",
        "+ Confirm vault restore",
        "+ Confirm AI preview",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const unorderedList = screen.getByRole("list", {
      name: "Markdown bullet list",
    });
    expect(within(unorderedList).getByText("Confirm vault restore")).toBeInTheDocument();
    expect(within(unorderedList).getByText("Confirm AI preview")).toBeInTheDocument();
  });

  it("renders plus-marker task lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-plus-task-list",
      content: [
        "# Tasks",
        "",
        "+ [x] Restore vault",
        "+ [ ] Review AI preview",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const taskList = screen.getByRole("list", {
      name: "Markdown task list",
    });
    expect(within(taskList).getByLabelText("Restore vault")).toBeChecked();
    expect(within(taskList).getByLabelText("Review AI preview")).not.toBeChecked();
  });

  it("renders nested ordered lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-6",
      content: [
        "# Checklist",
        "",
        "1. Prepare release",
        "   1. Run browser smoke",
        "   2. Run desktop smoke",
        "2. Publish",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const outerList = screen.getByRole("list", {
      name: "Markdown numbered list",
    });
    const parentItem = within(outerList).getByText("Prepare release").closest("li");
    expect(parentItem).not.toBeNull();

    const nestedList = within(parentItem!).getByRole("list", {
      name: "Markdown nested numbered list",
    });
    expect(within(nestedList).getByText("Run browser smoke")).toBeInTheDocument();
    expect(within(nestedList).getByText("Run desktop smoke")).toBeInTheDocument();
    expect(within(outerList).getByText("Publish")).toBeInTheDocument();
  });

  it("preserves the starting number for ordered lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-ordered-start",
      content: [
        "# Release",
        "",
        "3. Verify desktop shell",
        "4. Publish build",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const orderedList = screen.getByRole("list", {
      name: "Markdown numbered list",
    });
    expect(orderedList).toHaveAttribute("start", "3");
    expect(within(orderedList).getByText("Verify desktop shell")).toBeInTheDocument();
    expect(within(orderedList).getByText("Publish build")).toBeInTheDocument();
  });

  it("renders parenthesized ordered lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-parenthesized-ordered-list",
      content: [
        "# Release",
        "",
        "3) Verify desktop shell",
        "4) Publish build",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const orderedList = screen.getByRole("list", {
      name: "Markdown numbered list",
    });
    expect(orderedList).toHaveAttribute("start", "3");
    expect(within(orderedList).getByText("Verify desktop shell")).toBeInTheDocument();
    expect(within(orderedList).getByText("Publish build")).toBeInTheDocument();
  });

  it("renders nested task lists", () => {
    useEditorStore.getState().loadContent({
      baseHash: "hash-7",
      content: [
        "# Tasks",
        "",
        "- [ ] Prepare release",
        "  - [x] Browser smoke passed",
        "  - [ ] Desktop smoke passed",
        "- [x] Publish notes",
      ].join("\n"),
    });

    render(<MarkdownPreview />);

    const outerList = screen.getByRole("list", {
      name: "Markdown task list",
    });
    const parentItem = within(outerList)
      .getByLabelText("Prepare release")
      .closest("li");
    expect(parentItem).not.toBeNull();

    const nestedList = within(parentItem!).getByRole("list", {
      name: "Markdown nested task list",
    });
    expect(within(nestedList).getByLabelText("Browser smoke passed")).toBeChecked();
    expect(
      within(nestedList).getByLabelText("Desktop smoke passed"),
    ).not.toBeChecked();
    expect(within(outerList).getByLabelText("Publish notes")).toBeChecked();
  });
});
