import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');
const DIST = 'dist';

// Read version from manifest.json — single source of truth
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const VERSION = manifest.version;

const contentOptions = {
  entryPoints: ['src/content/main.js'],
  bundle: true,
  outfile: `${DIST}/content.js`,
  format: 'iife',
  minify: isProd,
  sourcemap: false,
  target: 'chrome110',
  logLevel: 'info',
  treeShaking: false,
  drop: isProd ? ['console', 'debugger'] : [],
  define: { 'process.env.VERSION': JSON.stringify(VERSION) },
};

// Page-world script: runs in MAIN world (not isolated) to expose console helpers.
// No bundling needed — it's a standalone script with no imports.
const pageWorldOptions = {
  entryPoints: ['src/page-world.js'],
  bundle: false,
  outfile: `${DIST}/page-world.js`,
  format: 'iife',
  minify: isProd,
  sourcemap: false,
  target: 'chrome110',
  logLevel: 'info',
};

// Background service worker (MV3). Bundled as ESM so imports from src/
// are resolved and inlined. Manifest references dist/background/index.js
// with type:"module".
const backgroundOptions = {
  entryPoints: ['background/index.js'],
  bundle: true,
  outfile: `${DIST}/background/index.js`,
  format: 'esm',
  minify: isProd,
  sourcemap: false,
  target: 'chrome110',
  logLevel: 'info',
  define: { 'process.env.VERSION': JSON.stringify(VERSION) },
};

function copyStatic() {
  mkdirSync(DIST, { recursive: true });

  // manifest
  cpSync('manifest.json', `${DIST}/manifest.json`);

  // background
  if (existsSync('background')) {
    cpSync('background', `${DIST}/background`, { recursive: true });
  }

  // popup — inject version into HTML
  if (existsSync('popup')) {
    cpSync('popup', `${DIST}/popup`, { recursive: true });
    const popupPath = `${DIST}/popup/index.html`;
    const popup = readFileSync(popupPath, 'utf8');
    writeFileSync(popupPath, popup.replace(/\bv\d+\.\d+\.\d+\b/g, 'v' + VERSION));
  }

  // icons
  if (existsSync('icons')) {
    cpSync('icons', `${DIST}/icons`, { recursive: true });
  }

  // Sync package.json version with manifest.json
  const pkgPath = 'package.json';
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.version !== VERSION) {
    pkg.version = VERSION;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  console.log(`[dist] v${VERSION} — static files copied to ${DIST}/`);
}

// ═══════════════════════════════════════════════════════════
// Hot-Module Replacement (HMR) — dev-only WebSocket server
// ═══════════════════════════════════════════════════════════
// Flow: npm run watch → esbuild rebuilds → onEnd plugin →
//       ws://localhost:35729 sends "reload" → Chrome extension
//       calls chrome.runtime.reload() → zero clicks
//
// Requires: npm install ws   (optional — gracefully skipped if missing)
// ═══════════════════════════════════════════════════════════

const HMR_PORT = 35729;
let hmrWss = null;

async function startHMR() {
  try {
    const { WebSocketServer } = await import('ws');
    hmrWss = new WebSocketServer({ port: HMR_PORT });
    hmrWss.on('connection', (ws) => {
      console.log(`[hmr] Client connected (${hmrWss.clients.size} total)`);
      ws.on('close', () => {
        console.log(`[hmr] Client disconnected (${hmrWss.clients.size} remaining)`);
      });
    });
    hmrWss.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`[hmr] Port ${HMR_PORT} in use — hot-reload disabled`);
        hmrWss = null;
      } else {
        console.warn(`[hmr] Error: ${e.message}`);
      }
    });
    console.log(`[hmr] WebSocket server on ws://localhost:${HMR_PORT}`);
  } catch (_e) {
    console.log('[hmr] "ws" not installed — hot-reload disabled. Run: npm install ws');
    hmrWss = null;
  }
}

function notifyHMR() {
  if (!hmrWss) return;
  let sent = 0;
  for (const ws of hmrWss.clients) {
    if (ws.readyState === 1) { ws.send('reload'); sent++; }
  }
  if (sent > 0) console.log(`[hmr] → reload sent to ${sent} client(s)`);
}

// esbuild plugin: after each successful rebuild → copy static + notify HMR
const hmrPlugin = {
  name: 'hmr-notify',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length === 0) {
        copyStatic();
        notifyHMR();
      }
    });
  }
};

// ═══════════════════════════════════════════════════════════
// Build
// ═══════════════════════════════════════════════════════════

if (isWatch) {
  copyStatic();
  await startHMR();

  const contentCtx = await esbuild.context({
    ...contentOptions,
    plugins: [hmrPlugin],
  });

  const pageWorldCtx = await esbuild.context({
    ...pageWorldOptions,
    plugins: [hmrPlugin],
  });

  const backgroundCtx = await esbuild.context({
    ...backgroundOptions,
    plugins: [hmrPlugin],
  });

  await Promise.all([contentCtx.watch(), pageWorldCtx.watch(), backgroundCtx.watch()]);
  console.log(`[esbuild] Watching for changes... (hot-reload on ws://localhost:${HMR_PORT})`);
} else {
  rmSync(DIST, { recursive: true, force: true });
  copyStatic();
  await esbuild.build(contentOptions);
  await esbuild.build(pageWorldOptions);
  await esbuild.build(backgroundOptions);
  console.log(`[esbuild] v${VERSION} build complete -- dist/content.js + page-world.js + background/index.js (${isProd ? 'production' : 'development'})`);
  console.log(`[dist] Load ${DIST}/ as unpacked extension in Chrome`);
}
