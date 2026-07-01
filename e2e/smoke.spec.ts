import { expect, test } from "@playwright/test";

test("covers the core note workflow with mocked Tauri commands", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const vault = {
      id: "vault:/tmp/ai-note-manager-e2e",
      name: "ai-note-manager-e2e",
      path: "/tmp/ai-note-manager-e2e",
      lastOpenedAt: null,
    };
    let content = "# Launch Plan\n\nShip the MVP safely.";
    let contentHash = "hash-initial";
    const callbacks = new Map<number, (event: unknown) => void>();
    const eventListeners = new Map<string, number[]>();
    let nextListenerId = 1;

    window.__TAURI_INTERNALS__ = {
      invoke(command: string, args?: Record<string, unknown>) {
        if (command === "get_recent_vault") {
          return Promise.resolve(null);
        }
        if (command === "select_vault") {
          return Promise.resolve(vault);
        }
        if (command === "list_markdown_files") {
          return Promise.resolve([
            {
              name: "Launch Plan.md",
              path: "Launch Plan.md",
              kind: "file",
              children: [],
            },
          ]);
        }
        if (command === "start_vault_watcher") {
          return Promise.resolve();
        }
        if (command === "read_note") {
          return Promise.resolve({
            path: args?.path,
            content,
            modifiedAt: "2026-07-01T08:00:00Z",
            contentHash,
          });
        }
        if (command === "save_note") {
          content = String(args?.content ?? "");
          contentHash = "hash-saved";
          return Promise.resolve({
            path: args?.path,
            contentHash,
            conflict: false,
            snapshotPath: null,
          });
        }
        if (command === "search_notes") {
          return Promise.resolve([
            {
              path: "Launch Plan.md",
              title: "Launch Plan",
              snippet: "Ship the MVP safely.",
            },
          ]);
        }
        if (command === "run_ai_action") {
          window.setTimeout(() => {
            emitTauriEvent("ai:chunk", {
              requestId: "ai-1",
              chunk: "# Launch Plan\n\nShip the MVP with a verified checklist.",
            });
            emitTauriEvent("ai:done", {
              requestId: "ai-1",
            });
          }, 0);
          return Promise.resolve({ requestId: "ai-1" });
        }
        if (command === "cancel_ai_action") {
          return Promise.resolve();
        }
        if (command === "plugin:event|listen") {
          const eventName = String(args?.event);
          const handlerId = Number(args?.handler);
          eventListeners.set(eventName, [
            ...(eventListeners.get(eventName) ?? []),
            handlerId,
          ]);
          return Promise.resolve(handlerId);
        }
        if (command === "plugin:event|unlisten") {
          const eventName = String(args?.event);
          const eventId = Number(args?.eventId);
          eventListeners.set(
            eventName,
            (eventListeners.get(eventName) ?? []).filter((id) => id !== eventId),
          );
          return Promise.resolve();
        }
        return Promise.reject(new Error(`Unhandled command: ${command}`));
      },
      transformCallback(callback: (event: unknown) => void) {
        const id = nextListenerId;
        nextListenerId += 1;
        callbacks.set(id, callback);
        return id;
      },
      unregisterCallback(id: number) {
        callbacks.delete(id);
      },
    };
    window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener() {},
    };

    function emitTauriEvent(eventName: string, payload: unknown) {
      for (const callbackId of eventListeners.get(eventName) ?? []) {
        callbacks.get(callbackId)?.({
          event: eventName,
          id: callbackId,
          payload,
        });
      }
    }
  });

  await page.goto("/");

  await page.getByRole("button", { name: /open vault/i }).click();
  await expect(page.getByText("/tmp/ai-note-manager-e2e")).toBeVisible();
  await expect(page.getByLabel("Markdown file tree")).toContainText(
    "Launch Plan.md",
  );

  await page.getByRole("button", { name: "Launch Plan.md" }).click();
  await expect(page.getByRole("heading", { name: "Launch Plan" })).toBeVisible();

  await page.getByRole("textbox", { name: "Markdown editor" }).fill(
    "# Launch Plan\n\nShip the MVP safely.\n\n- Verify tests",
  );
  await expect(page.getByText("Unsaved")).toBeVisible();
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.getByLabel("Search notes").fill("MVP");
  await expect(page.getByLabel("Search results")).toContainText("Launch Plan");

  await page.getByRole("button", { name: "Rewrite" }).click();
  const applyDialog = page.getByRole("dialog", { name: "Apply AI change" });
  await expect(applyDialog).toBeVisible();
  await expect(
    applyDialog.getByText("Ship the MVP with a verified checklist."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply change" }).click();
  await expect(applyDialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Launch Plan" })).toBeVisible();
});
