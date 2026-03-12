import { build } from 'esbuild';

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.mjs',
  format: 'esm',
  packages: 'external',
  sourcemap: false,
});

console.log('✓ Server compiled to dist/server.mjs');
