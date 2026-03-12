process.env.NODE_ENV = process.env.NODE_ENV || 'production';
import('./dist/server.mjs').catch(function(err) {
  console.error('[app] Failed to start server:', err);
  process.exit(1);
});
