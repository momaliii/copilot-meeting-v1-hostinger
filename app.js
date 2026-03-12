console.log('[app.js] Starting... Node ' + process.version + ' | CWD: ' + process.cwd());

import { register } from 'node:module';

try {
  register('tsx/esm', import.meta.url);
  console.log('[app.js] tsx/esm loader registered');
} catch (e) {
  console.error('[app.js] FATAL: Failed to register tsx/esm:', e);
  process.exit(1);
}

try {
  await import('./server.ts');
} catch (e) {
  console.error('[app.js] FATAL: Failed to import server.ts:', e);
  process.exit(1);
}
