/**
 * scripts/build-dev.mjs
 * Сборка в dist-dev/ с manifest.dev.json (content_scripts на localhost:8080).
 * Оригинальный manifest.json не модифицируется.
 */
import { execSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT = path.resolve(__dirname, "../extension");
const DIST = "dist-dev";

// 1. Очистить dist-dev/
rmSync(path.join(EXT, DIST), { recursive: true, force: true });

// 2. Подменить manifest.json на dev-вариант
const origManifest = path.join(EXT, "manifest.json");
const devManifest = path.join(EXT, "manifest.dev.json");
cpSync(origManifest, origManifest + ".bak");

try {
  cpSync(devManifest, origManifest);

  // 3. Сборка с DIST=dist-dev
  execSync("node esbuild.config.mjs", {
    cwd: EXT,
    stdio: "inherit",
    env: { ...process.env, DIST },
  });

  console.log(`[build:dev] ./${DIST}/ ready — load in chrome://extensions`);
} finally {
  // 4. Восстановить оригинальный manifest.json
  cpSync(origManifest + ".bak", origManifest);
  rmSync(origManifest + ".bak", { force: true });
}
