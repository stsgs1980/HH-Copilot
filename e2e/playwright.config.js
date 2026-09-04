import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(__filename, "../..");
const extNm = path.join(rootDir, "extension/node_modules");
const { defineConfig } = await import(pathToFileURL(path.join(extNm, "@playwright/test/index.mjs")).href);

export default defineConfig({
  testDir: "./specs",
  timeout: 60000,
  use: { viewport: { width: 1400, height: 900 } },
  reporter: [["list"]],
});
