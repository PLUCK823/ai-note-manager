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
  onScrollerReady?: (element: HTMLElement | null) => void;
};

export function MarkdownEditor({
  onEditorReady,
  onScrollerReady,
}: MarkdownEditorProps = {}) {
  const content = useEditorStore((state) => state.content);
  const setContent = useEditorStore((state) => state.setContent);
  const setCursorPosition = useEditorStore((state) => state.setCursorPosition);
  const setSelection = useEditorStore((state) => state.setSelection);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const contentRef = useRef(content);
  const onEditorReadyRef = useRef(onEditorReady);
  const onScrollerReadyRef = useRef(onScrollerReady);
  const setContentRef = useRef(setContent);
  const setCursorPositionRef = useRef(setCursorPosition);
  const setSelectionRef = useRef(setSelection);

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
    onScrollerReadyRef.current = onScrollerReady;
    setContentRef.current = setContent;
    setCursorPositionRef.current = setCursorPosition;
    setSelectionRef.current = setSelection;
  }, [onEditorReady, onScrollerReady, setContent, setCursorPosition, setSelection]);

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
      setCursorPositionRef.current(range.head);
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
    onScrollerReadyRef.current?.(view.scrollDOM);
    updateSelection(view.state);

    return () => {
      onScrollerReadyRef.current?.(null);
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
