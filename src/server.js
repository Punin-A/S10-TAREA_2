import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { openDatabase } from './db/database.js';

let db;
try {
  const config = loadConfig();
  db = openDatabase(config.databasePath);
  const server = createApp(db, config).listen(config.port, config.host, () => {
    console.log(`API disponible en http://${config.host}:${config.port}/api`);
    process.send?.({ type: 'ready' });
  });
  server.on('error', () => {
    console.error('No se pudo iniciar el servidor. Revisa HOST y PORT.');
    db.close();
    process.exitCode = 1;
    process.disconnect?.();
  });
  let closing = false;
  function shutdown() {
    if (closing) return;
    closing = true;
    server.close(() => {
      db.close();
      process.disconnect?.();
    });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('message', (message) => { if (message === 'shutdown') shutdown(); });
} catch (error) {
  db?.close();
  console.error('No se pudo iniciar la API:', error.message);
  process.exitCode = 1;
}
