import { useEditorStore } from "../editorState";

export function MarkdownEditor() {
  const content = useEditorStore((state) => state.content);
  const setContent = useEditorStore((state) => state.setContent);

  return (
    <textarea
      aria-label="Markdown editor"
      className="markdown-editor"
      spellCheck="false"
      value={content}
      onChange={(event) => setContent(event.currentTarget.value)}
    />
  );
}
