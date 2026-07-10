import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";

import { remote } from "webdriverio";

/* global document, Event, fetch, HTMLElement, HTMLInputElement, InputEvent */

const appBinary = fileURLToPath(
  new URL("../src-tauri/target/debug/ai-note-manager", import.meta.url),
);
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const port = 4445;
const testHome = await mkdtemp(join(tmpdir(), "ai-note-manager-desktop-e2e-"));
const run = promisify(execFile);

const vaultDir = await seedRecentVault(testHome);

const vite = spawn(packageManager, ["frontend:dev", "--host", "127.0.0.1"], {
  stdio: ["ignore", "pipe", "pipe"],
});

const stderr = [];
let app = null;

try {
  await waitForUrl("http://127.0.0.1:1420");

  app = spawn(appBinary, [], {
    env: {
      ...process.env,
      AI_NOTE_MANAGER_DISABLE_EXTERNAL_AI: "true",
      HOME: testHome,
      TAURI_WEBDRIVER_PORT: String(port),
      WDIO_EMBEDDED_SERVER: "true",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  app.stderr.on("data", (chunk) => {
    stderr.push(chunk.toString());
  });

  await waitForWebDriver();

  const browser = await remote({
    hostname: "127.0.0.1",
    port,
    path: "/",
    capabilities: {
      browserName: "tauri",
    },
    logLevel: "error",
  });

  try {
    await browser.waitUntil(
      async () => {
        const bodyText = await bodyInnerText(browser);
        return /Open vault/i.test(bodyText);
      },
      { timeout: 10_000, timeoutMsg: "Timed out waiting for Open vault" },
    );
    assert.ok(browser.sessionId, "expected a WebDriver session");
    await browser.waitUntil(
      async () => {
        const bodyText = await bodyInnerText(browser);
        return (
          /Desktop E2E Vault/i.test(bodyText) &&
          /Desktop Smoke\.md/i.test(bodyText)
        );
      },
      { timeout: 10_000, timeoutMsg: "Timed out waiting for restored vault" },
    );
    const bodyText = await bodyInnerText(browser);
    assert.match(bodyText, /Open vault/i);
    assert.match(bodyText, /Desktop E2E Vault/i);
    assert.match(bodyText, /Desktop Smoke\.md/i);

    // Verify editor mode buttons are rendered
    await assertElementPresent(browser, '[aria-label="Editor view mode"]');
    await clickButton(browser, "Preview");
    await browser.waitUntil(
      async () => {
        const text = await bodyInnerText(browser);
        return /Preview/i.test(text) && !/Nothing to preview yet/i.test(text);
      },
      { timeout: 10_000, timeoutMsg: "Timed out switching to Preview mode" },
    );
    await clickButton(browser, "Edit");
    await browser.waitUntil(
      async () => /Edit/i.test(await bodyInnerText(browser)),
      { timeout: 10_000, timeoutMsg: "Timed out switching back to Edit mode" },
    );
    // Return to Split for the remaining tests
    await clickButton(browser, "Split");

    await clickButton(browser, "Hide file navigation");
    await assertElementPresent(browser, '[aria-label="Collapsed file navigation"]');
    await clickButton(browser, "Show file navigation");
    await assertElementPresent(browser, '[aria-label="Vault navigation"]');

    await clickButton(browser, "Move AI assistant to left");
    await clickButton(browser, "Hide AI assistant");
    await assertElementPresent(browser, '[aria-label="Collapsed AI assistant"]');
    await clickButton(browser, "Show AI assistant");
    await assertElementPresent(browser, '[aria-label="AI assistant"]');
    await assertElementPresent(browser, '[aria-label="Markdown editor"]');

    await clickButton(browser, "Desktop Smoke.md");
    await browser.waitUntil(
      async () => /Loaded through the real Tauri shell\./i.test(await bodyInnerText(browser)),
      { timeout: 10_000, timeoutMsg: "Timed out waiting for opened note content" },
    );

    const updatedContent =
      "# Desktop Smoke\n\nLoaded through the real Tauri shell.\n\n- Saved from desktop e2e\n";
    await replaceEditorContent(browser, updatedContent);
    await browser.waitUntil(
      async () => /Unsaved/i.test(await bodyInnerText(browser)),
      { timeout: 10_000, timeoutMsg: "Timed out waiting for dirty save state" },
    );
    await clickButton(browser, "Save note");
    await browser.waitUntil(
      async () => /Saved/i.test(await bodyInnerText(browser)),
      { timeout: 10_000, timeoutMsg: "Timed out waiting for saved state" },
    );
    assert.equal(
      await readFile(join(vaultDir, "Desktop Smoke.md"), "utf8"),
      updatedContent,
    );

    await setSearchQuery(browser, "Saved");
    await browser.waitUntil(
      async () => {
        const text = await searchResultsText(browser);
        return /Desktop Smoke/i.test(text) && /Saved from desktop e2e/i.test(text);
      },
      { timeout: 10_000, timeoutMsg: "Timed out waiting for search result" },
    );

    await clickButton(browser, "Rewrite");
    try {
      await browser.waitUntil(
        async () => {
          const text = await dialogText(browser, "Apply AI change");
          return /AI proposal/i.test(text) && /## Draft/i.test(text);
        },
        { timeout: 10_000, timeoutMsg: "Timed out waiting for AI apply dialog" },
      );
    } catch (error) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nAI preview: ${await aiPreviewText(browser)}\nBody: ${await bodyInnerText(browser)}`,
        { cause: error },
      );
    }
    await clickButton(browser, "Apply change");
    await browser.waitUntil(
      async () => {
        const text = await editorText(browser);
        return /^## Draft/.test(text) && /Saved from desktop e2e/i.test(text);
      },
      { timeout: 10_000, timeoutMsg: "Timed out waiting for applied AI editor content" },
    );
    await browser.waitUntil(
      async () => /Unsaved/i.test(await bodyInnerText(browser)),
      { timeout: 10_000, timeoutMsg: "Timed out waiting for AI dirty save state" },
    );
    await clickButton(browser, "Save note");
    await browser.waitUntil(
      async () => /Saved/i.test(await bodyInnerText(browser)),
      { timeout: 10_000, timeoutMsg: "Timed out waiting for saved AI content" },
    );
    assert.match(
      await readFile(join(vaultDir, "Desktop Smoke.md"), "utf8"),
      /^## Draft\n\n# Desktop Smoke\n\nLoaded through the real Tauri shell\./,
    );
  } finally {
    await browser.deleteSession();
  }
} finally {
  app?.kill("SIGTERM");
  vite.kill("SIGTERM");
  await rm(testHome, { force: true, recursive: true });
}

async function waitForWebDriver() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (app?.exitCode !== null) {
      throw new Error(
        `Tauri app exited before WebDriver was ready:\n${stderr.join("")}`,
      );
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`);
      const payload = await response.json();
      if (payload?.value?.ready === true) {
        return;
      }
    } catch {
      await delay(500);
    }
  }

  throw new Error(`Timed out waiting for embedded WebDriver on port ${port}`);
}

async function bodyInnerText(browser) {
  return browser.execute(() => document.body.innerText);
}

async function searchResultsText(browser) {
  return browser.execute(() => {
    const results = document.querySelector('[aria-label="Search results"]');
    return results?.textContent ?? "";
  });
}

async function assertElementPresent(browser, selector) {
  const present = await browser.execute((sel) => !!document.querySelector(sel), selector);
  assert.ok(present, `Expected element matching "${selector}" to be present`);
}

async function aiPreviewText(browser) {
  return browser.execute(() => {
    const preview = document.querySelector('[aria-label="AI result preview"]');
    return preview?.textContent ?? "";
  });
}

async function dialogText(browser, label) {
  return browser.execute((dialogLabel) => {
    const dialog = document.querySelector(`[role="dialog"][aria-label="${dialogLabel}"]`);
    return dialog?.textContent ?? "";
  }, label);
}

async function editorText(browser) {
  return browser.execute(() => {
    const editor = document.querySelector('[aria-label="Markdown editor"]');
    return editor?.textContent ?? "";
  });
}

async function clickButton(browser, name) {
  await browser.execute((buttonName) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const button = buttons.find(
      (candidate) =>
        candidate.textContent?.trim() === buttonName ||
        candidate.getAttribute("aria-label") === buttonName,
    );
    if (!button) {
      throw new Error(`Button not found: ${buttonName}`);
    }
    button.click();
  }, name);
}

async function replaceEditorContent(browser, content) {
  await browser.execute((nextContent) => {
    const editor = document.querySelector('[aria-label="Markdown editor"]');
    if (!(editor instanceof HTMLElement)) {
      throw new Error("Markdown editor not found");
    }
    editor.focus();
    document.execCommand("selectAll");
    document.execCommand("insertText", false, nextContent);
  }, content);
}

async function setSearchQuery(browser, query) {
  await browser.execute((value) => {
    const input = document.querySelector('[aria-label="Search notes"]');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Search input not found");
    }
    input.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, query);
}

async function seedRecentVault(home) {
  const vaultDir = join(home, "Desktop E2E Vault");
  await mkdir(vaultDir, { recursive: true });
  await writeFile(
    join(vaultDir, "Desktop Smoke.md"),
    "# Desktop Smoke\n\nLoaded through the real Tauri shell.\n",
  );

  const appDataDir = join(
    home,
    "Library",
    "Application Support",
    "com.pluck823.ainotemanager",
  );
  await mkdir(appDataDir, { recursive: true });

  const migration = await readFile(
    new URL(
      "../src-tauri/src/infrastructure/db/migrations/001_init.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const vaultPath = sqlString(vaultDir);
  await run("sqlite3", [
    join(appDataDir, "metadata.sqlite3"),
    `${migration}
INSERT INTO vaults (id, path, name, created_at, updated_at, last_opened_at)
VALUES ('vault:desktop-e2e', ${vaultPath}, 'Desktop E2E Vault', datetime('now'), datetime('now'), datetime('now'));
`,
  ]);

  return vaultDir;
}

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function waitForUrl(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    if (vite.exitCode !== null) {
      throw new Error(`Vite dev server exited before ${url} was ready`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the dev server starts accepting HTTP requests.
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}
