/**
 * VERSION -- convenience reference (NOT the single source of truth)
 *
 * The ACTUAL source of truth is manifest.json -- esbuild reads it and injects
 * `process.env.VERSION` into all modules at build time (see esbuild.config.mjs).
 * This file is NOT imported by any module. Update manifest.json, then run: npm run build.
 */
export const VERSION = '1.9.49.0';
