import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT debe ser un entero entre 1 y 65535.');
  }
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) {
    throw new Error('Configura JWT_SECRET con al menos 32 bytes en .env.');
  }
  const expiresIn = env.JWT_EXPIRES_IN || '1h';
  if (!/^[1-9]\d{0,5}(s|m|h|d)$/.test(expiresIn)) {
    throw new Error('JWT_EXPIRES_IN debe usar un valor positivo como 30m o 1h.');
  }
  if (!env.DATABASE_PATH || env.DATABASE_PATH === ':memory:') {
    throw new Error('DATABASE_PATH debe indicar un archivo persistente.');
  }
  return {
    port,
    host: env.HOST || '127.0.0.1',
    databasePath: path.resolve(projectRoot, env.DATABASE_PATH),
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: expiresIn,
    jwtIssuer: 'catalogo-api',
    jwtAudience: 'catalogo-clientes',
  };
}
