import { useEditorStore } from "../editorState";

const labels = {
  saved: "Saved",
  saving: "Saving",
  dirty: "Unsaved",
  failed: "Save failed",
  conflict: "Conflict",
};

export function SaveStatus() {
  const saveState = useEditorStore((state) => state.saveState);

  return (
    <span className={`save-status ${saveState}`}>{labels[saveState]}</span>
  );
}
