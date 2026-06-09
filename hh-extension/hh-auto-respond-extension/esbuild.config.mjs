import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, rmSync, existsSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');
const DIST = 'dist';

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
};

function copyStatic() {
  mkdirSync(DIST, { recursive: true });

  // manifest
  cpSync('manifest.json', `${DIST}/manifest.json`);

  // background
  if (existsSync('background')) {
    cpSync('background', `${DIST}/background`, { recursive: true });
  }

  // popup
  if (existsSync('popup')) {
    cpSync('popup', `${DIST}/popup`, { recursive: true });
  }

  // icons
  if (existsSync('icons')) {
    cpSync('icons', `${DIST}/icons`, { recursive: true });
  }

  console.log(`[dist] Static files copied to ${DIST}/`);
}

if (isWatch) {
  copyStatic();
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[esbuild] Watching for changes...');
} else {
  // Clean dist before build
  rmSync(DIST, { recursive: true, force: true });
  copyStatic();
  await esbuild.build(buildOptions);
  console.log(`[esbuild] Build complete -- dist/content.js (${isProd ? 'production' : 'development'})`);
  console.log(`[dist] Load ${DIST}/ as unpacked extension in Chrome`);
}
