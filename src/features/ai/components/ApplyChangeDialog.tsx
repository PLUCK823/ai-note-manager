import { Button } from "../../../shared/components/Button";
import { Dialog } from "../../../shared/components/Dialog";
import { useEditorStore } from "../../editor/editorState";
import { useAiStore } from "../aiState";

export function ApplyChangeDialog() {
  const pendingChange = useAiStore((state) => state.pendingChange);
  const clearPendingChange = useAiStore((state) => state.clearPendingChange);
  const replaceRange = useEditorStore((state) => state.replaceRange);
  const setContent = useEditorStore((state) => state.setContent);

  function applyChange() {
    if (!pendingChange) {
      return;
    }

    if (
      typeof pendingChange.start === "number" &&
      typeof pendingChange.end === "number"
    ) {
      replaceRange({
        start: pendingChange.start,
        end: pendingChange.end,
        replacement: pendingChange.replacement,
      });
    } else {
      setContent(pendingChange.replacement);
    }
    clearPendingChange();
  }

  return (
    <Dialog open={Boolean(pendingChange)} title="Apply AI change">
      <p>Review the proposed change before applying it to the editor.</p>
      <div className="change-preview-grid">
        <section>
          <p className="eyebrow">Current note</p>
          <pre>{pendingChange?.original}</pre>
        </section>
        <section>
          <p className="eyebrow">AI proposal</p>
          <pre>{pendingChange?.replacement}</pre>
        </section>
      </div>
      <div className="dialog-actions">
        <Button type="button" variant="ghost" onClick={clearPendingChange}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={applyChange}>
          Apply change
        </Button>
      </div>
    </Dialog>
  );
}
