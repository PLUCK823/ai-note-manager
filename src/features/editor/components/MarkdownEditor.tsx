import { useEditorStore } from "../editorState";

export function MarkdownEditor() {
  const content = useEditorStore((state) => state.content);
  const setContent = useEditorStore((state) => state.setContent);
  const setSelection = useEditorStore((state) => state.setSelection);

  function updateSelection(element: HTMLTextAreaElement) {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const text = element.value.slice(start, end);
    setSelection(
      text
        ? {
            start,
            end,
            text,
          }
        : null,
    );
  }

  return (
    <textarea
      aria-label="Markdown editor"
      className="markdown-editor"
      spellCheck="false"
      value={content}
      onChange={(event) => setContent(event.currentTarget.value)}
      onClick={(event) => updateSelection(event.currentTarget)}
      onKeyUp={(event) => updateSelection(event.currentTarget)}
      onSelect={(event) => updateSelection(event.currentTarget)}
    />
  );
}
