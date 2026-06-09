import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

const buildOptions = {
  entryPoints: ['src/content/main.js'],
  bundle: true,
  outfile: 'content.js',
  format: 'iife',
  minify: isProd,
  sourcemap: !isProd,
  target: 'chrome110',
  logLevel: 'info',
  treeShaking: false,
  drop: isProd ? ['console', 'debugger'] : [],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[esbuild] Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log(`[esbuild] Build complete -- content.js (${isProd ? 'production' : 'development'})`);
}
