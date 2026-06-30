import { useEffect, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { checkNoteStatus, readNote } from "../../notes/api";
import { useNotesStore } from "../../notes/hooks";
import { useVaultStore } from "../../vault/hooks";
import { useEditorStore } from "../editorState";

type DiskChange = {
  contentHash: string;
  key: string;
  modifiedAt: string;
};

type IgnoredChange = {
  contentHash: string;
  key: string;
};

const pollIntervalMs = 5000;

export function DiskChangeNotice() {
  const currentVault = useVaultStore((state) => state.currentVault);
  const activePath = useNotesStore((state) => state.activePath);
  const baseHash = useEditorStore((state) => state.baseHash);
  const loadContent = useEditorStore((state) => state.loadContent);
  const [diskChange, setDiskChange] = useState<DiskChange | null>(null);
  const [ignoredChange, setIgnoredChange] = useState<IgnoredChange | null>(
    null,
  );
  const activeKey = currentVault && activePath ? `${currentVault.id}:${activePath}` : null;
  const activeDiskChange =
    diskChange && diskChange.key === activeKey ? diskChange : null;

  useEffect(() => {
    if (!currentVault || !activePath || !baseHash) {
      return;
    }

    let isMounted = true;

    async function checkDiskStatus() {
      const status = await checkNoteStatus(
        currentVault!.id,
        activePath!,
        baseHash,
      );
      if (!isMounted) {
        return;
      }

      if (
        status.changed &&
        (ignoredChange?.key !== activeKey ||
          ignoredChange.contentHash !== status.contentHash)
      ) {
        setDiskChange({
          contentHash: status.contentHash,
          key: activeKey!,
          modifiedAt: status.modifiedAt,
        });
      } else if (!status.changed) {
        setDiskChange(null);
      }
    }

    void checkDiskStatus().catch(() => {});
    const timer = window.setInterval(() => {
      void checkDiskStatus().catch(() => {});
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [activeKey, activePath, baseHash, currentVault, ignoredChange]);

  async function reloadFromDisk() {
    if (!currentVault || !activePath) {
      return;
    }

    const note = await readNote(currentVault.id, activePath);
    loadContent({ content: note.content, baseHash: note.contentHash });
    setDiskChange(null);
    setIgnoredChange(null);
  }

  function keepEditing() {
    if (activeDiskChange) {
      setIgnoredChange({
        contentHash: activeDiskChange.contentHash,
        key: activeDiskChange.key,
      });
    }
    setDiskChange(null);
  }

  if (!activeDiskChange) {
    return null;
  }

  return (
    <section
      aria-label="External note change"
      className="disk-change-notice"
      role="status"
    >
      <div>
        <p className="eyebrow">Changed on disk</p>
        <p>
          The active note changed outside this app. Reload it or keep editing
          your local copy.
        </p>
      </div>
      <div className="disk-change-actions">
        <Button type="button" variant="ghost" onClick={keepEditing}>
          Keep editing
        </Button>
        <Button type="button" variant="primary" onClick={reloadFromDisk}>
          Reload from disk
        </Button>
      </div>
    </section>
  );
}
