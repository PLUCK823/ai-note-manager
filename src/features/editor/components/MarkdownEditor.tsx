import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  type ViewUpdate,
} from "@codemirror/view";
import { useEffect, useRef } from "react";

import { useEditorStore } from "../editorState";

type MarkdownEditorProps = {
  onEditorReady?: (view: EditorView) => void;
};

export function MarkdownEditor({ onEditorReady }: MarkdownEditorProps = {}) {
  const content = useEditorStore((state) => state.content);
  const setContent = useEditorStore((state) => state.setContent);
  const setSelection = useEditorStore((state) => state.setSelection);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  const onEditorReadyRef = useRef(onEditorReady);
  const setContentRef = useRef(setContent);
  const setSelectionRef = useRef(setSelection);

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
    setContentRef.current = setContent;
    setSelectionRef.current = setSelection;
  }, [onEditorReady, setContent, setSelection]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === content) {
      contentRef.current = content;
      return;
    }

    contentRef.current = content;
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });
  }, [content]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    function updateSelection(state: EditorState) {
      const range = state.selection.main;
      const text = state.sliceDoc(range.from, range.to);
      setSelectionRef.current(
        text
          ? {
              start: range.from,
              end: range.to,
              text,
            }
          : null,
      );
    }

    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        const nextContent = update.state.doc.toString();
        contentRef.current = nextContent;
        setContentRef.current(nextContent);
      }

      if (update.selectionSet || update.docChanged) {
        updateSelection(update.state);
      }
    });

    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: contentRef.current,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          history(),
          drawSelection(),
          EditorState.allowMultipleSelections.of(true),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle),
          EditorView.lineWrapping,
          highlightActiveLine(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.contentAttributes.of({
            "aria-label": "Markdown editor",
          }),
          EditorView.theme({
            "&": {
              height: "100%",
            },
            ".cm-scroller": {
              fontFamily: '"SFMono-Regular", Consolas, monospace',
              fontSize: "0.95rem",
              lineHeight: "1.7",
            },
          }),
          updateListener,
        ],
      }),
    });

    viewRef.current = view;
    onEditorReadyRef.current?.(view);
    updateSelection(view.state);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <div
      aria-label="CodeMirror Markdown editor host"
      className="markdown-editor"
      ref={hostRef}
    />
  );
}
