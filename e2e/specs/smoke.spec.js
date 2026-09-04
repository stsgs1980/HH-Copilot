import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(__filename, "../../..");
const extNm = path.join(rootDir, "extension/node_modules");

const { expect, test } = await import(pathToFileURL(path.join(extNm, "@playwright/test/index.mjs")).href);
const { chromium } = await import(pathToFileURL(path.join(extNm, "playwright-core/index.mjs")).href);

const DIST = path.join(rootDir, "extension/dist");
const MOCK = path.join(rootDir, "e2e/fixtures/hh-mock.html");
const MOCK_HTML = readFileSync(MOCK, "utf8");

test("panel injects into hh.ru page", async () => {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });

  const sw = context.serviceWorkers()[0] || (await context.waitForEvent("serviceworker"));
  expect(sw).toBeTruthy();

  const page = await context.newPage();

  // Перехват: hh.ru -> mock HTML (content script сматчится по URL)
  await page.route("https://hh.ru/**", (route) =>
    route.fulfill({ body: MOCK_HTML, contentType: "text/html; charset=utf-8" }),
  );

  await page.goto("https://hh.ru/applicant/resumes");

  // createPanel() вызывается безусловно на main.js:70
  const host = page.locator("#hh-ar-sidebar");
  await expect(host).toBeVisible({ timeout: 15000 });

  // FAB создается через createFab() — кликаем чтобы открыть сайдбар
  const fab = page.locator("#hh-ar-fab");
  await expect(fab).toBeVisible({ timeout: 5000 });
  await fab.click();

  // Сайдбар: transform: translateX(0) после toggleSidebar()
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(rootDir, "e2e/screenshots/panel-injected.png"),
    fullPage: true,
  });
  await context.close();
});
