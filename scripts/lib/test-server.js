import { fork } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from '../../src/db/database.js';
import { seedDatabase } from '../seed.js';

export async function createTestContext() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'catalogo-api-'));
  const databasePath = path.join(directory, 'test.sqlite');
  const admin = { name: 'Administrador Pruebas', email: 'admin@example.test', password: randomBytes(18).toString('base64url') };
  const jwtSecret = randomBytes(48).toString('hex');
  const db = openDatabase(databasePath);
  try { await seedDatabase(db, admin); } finally { db.close(); }
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  let child;
  return {
    directory, databasePath, admin, jwtSecret,
    baseUrl: `http://127.0.0.1:${port}`,
    async start() {
      child = fork(fileURLToPath(new URL('../../src/server.js', import.meta.url)), [], {
        env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATABASE_PATH: databasePath, JWT_SECRET: jwtSecret, JWT_EXPIRES_IN: '1h' },
        stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      });
      // El proceso hijo nunca recibe ni imprime las contraseñas de las peticiones.
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { child.kill(); reject(new Error('El servidor no inició en 15 segundos.')); }, 15000);
        child.once('error', (error) => { clearTimeout(timer); reject(error); });
        child.once('exit', () => { clearTimeout(timer); reject(new Error('El servidor terminó antes de iniciar.')); });
        child.once('message', (message) => {
          if (message.type === 'ready') { clearTimeout(timer); resolve(); }
        });
      });
    },
    async stop() {
      if (!child || child.exitCode !== null) return;
      const running = child;
      const stopped = once(running, 'exit');
      running.send('shutdown');
      const timer = setTimeout(() => running.kill(), 5000);
      try { await stopped; } finally { clearTimeout(timer); child = undefined; }
    },
    async cleanup() {
      await this.stop();
      await rm(directory, { recursive: true, force: true });
    },
  };
}
