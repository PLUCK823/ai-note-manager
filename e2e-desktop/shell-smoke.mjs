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

/* global document, fetch */

const appBinary = fileURLToPath(
  new URL("../src-tauri/target/debug/ai-note-manager", import.meta.url),
);
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const port = 4445;
const testHome = await mkdtemp(join(tmpdir(), "ai-note-manager-desktop-e2e-"));
const run = promisify(execFile);

await seedRecentVault(testHome);

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
    const bodyText = await bodyInnerText(browser);
    assert.match(bodyText, /Open vault/i);
    assert.match(bodyText, /Desktop E2E Vault/i);
    assert.match(bodyText, /Desktop Smoke\.md/i);
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
