import { Save } from "lucide-react";

import { Button } from "../../../shared/components/Button";
import { saveNote } from "../../notes/api";
import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { useEditorStore } from "../editorState";

const labels = {
  saved: "Saved",
  saving: "Saving",
  dirty: "Unsaved",
  failed: "Save failed",
  conflict: "Conflict",
};

export function SaveStatus() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const activePath = useNotesStore((state) => state.activePath);
  const content = useEditorStore((state) => state.content);
  const baseHash = useEditorStore((state) => state.baseHash);
  const markSaved = useEditorStore((state) => state.markSaved);
  const setSaveState = useEditorStore((state) => state.setSaveState);
  const saveState = useEditorStore((state) => state.saveState);
  const canSave = Boolean(currentVault && activePath && saveState !== "saving");

  async function handleSave() {
    if (!currentVault || !activePath) {
      return;
    }

    setSaveState("saving");
    try {
      const result = await saveNote(currentVault.id, activePath, content, baseHash);
      if (result.conflict) {
        setSaveState("conflict");
        return;
      }

      markSaved(result.contentHash);
    } catch {
      setSaveState("failed");
    }
  }

  return (
    <span className="save-control">
      <span className={`save-status ${saveState}`}>{labels[saveState]}</span>
      <Button
        aria-label="Save note"
        className="icon-button"
        disabled={!canSave}
        type="button"
        variant="ghost"
        onClick={handleSave}
      >
        <Save size={15} aria-hidden="true" />
      </Button>
    </span>
  );
}
