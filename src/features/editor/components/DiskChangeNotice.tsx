import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { listenToEvent } from "../../../shared/lib/tauri";
import { checkNoteStatus, readNote, startVaultWatcher } from "../../notes/api";
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

type VaultFileEvent = {
  vaultId: string;
  path: string;
  kind: "created" | "modified" | "removed" | "renamed";
};

const vaultFileChangedEvent = "vault:file-changed";

export function DiskChangeNotice() {
  const queryClient = useQueryClient();
  const currentVault = useVaultStore((state) => state.currentVault);
  const activePath = useNotesStore((state) => state.activePath);
  const baseHash = useEditorStore((state) => state.baseHash);
  const loadContent = useEditorStore((state) => state.loadContent);
  const [diskChange, setDiskChange] = useState<DiskChange | null>(null);
  const [ignoredChange, setIgnoredChange] = useState<IgnoredChange | null>(
    null,
  );
  const activeKey =
    currentVault && activePath ? `${currentVault.id}:${activePath}` : null;
  const activeDiskChange =
    diskChange && diskChange.key === activeKey ? diskChange : null;

  useEffect(() => {
    if (!currentVault) {
      return;
    }

    void startVaultWatcher(currentVault.id).catch(() => {});
  }, [currentVault]);

  useEffect(() => {
    if (!currentVault) {
      return;
    }

    let isMounted = true;
    let unlisten: (() => void) | null = null;

    async function handleVaultFileEvent(event: VaultFileEvent) {
      if (event.vaultId !== currentVault!.id) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ["markdown-files", currentVault!.id],
      });

      if (!activePath || !baseHash || event.path !== activePath) {
        return;
      }

      const status = await checkNoteStatus(currentVault!.id, activePath, baseHash);
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

    void listenToEvent<VaultFileEvent>(vaultFileChangedEvent, (event) => {
      void handleVaultFileEvent(event).catch(() => {});
    })
      .then((removeListener) => {
        if (isMounted) {
          unlisten = removeListener;
        } else {
          removeListener();
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      unlisten?.();
    };
  }, [activeKey, activePath, baseHash, currentVault, ignoredChange, queryClient]);

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
