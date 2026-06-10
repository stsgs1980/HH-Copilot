import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');
const DIST = 'dist';

// Read version from manifest.json — single source of truth
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const VERSION = manifest.version;

const buildOptions = {
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
  // Inject VERSION constant into all JS modules at build time
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

if (isWatch) {
  copyStatic();
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[esbuild] Watching for changes...');
} else {
  rmSync(DIST, { recursive: true, force: true });
  copyStatic();
  await esbuild.build(buildOptions);
  console.log(`[esbuild] v${VERSION} build complete -- dist/content.js (${isProd ? 'production' : 'development'})`);
  console.log(`[dist] Load ${DIST}/ as unpacked extension in Chrome`);
}
