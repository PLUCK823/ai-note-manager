import { deriveMarkdownTitle } from "../markdown";
import { useEditorStore } from "../editorState";

export function MarkdownPreview() {
  const content = useEditorStore((state) => state.content);

  return (
    <section className="preview-surface" aria-label="Markdown preview">
      <p className="eyebrow">Preview</p>
      <h2>{deriveMarkdownTitle(content)}</h2>
      <p>{content.replace(/^#\s.+\n*/, "").trim()}</p>
    </section>
  );
}
