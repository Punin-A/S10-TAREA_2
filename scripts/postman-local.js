import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import { loadConfig } from '../src/config/env.js';
import { openDatabase } from '../src/db/database.js';

try {
  const config = loadConfig();
  if (!existsSync(config.databasePath)) throw new Error('Ejecuta npm run db:init primero.');
  const db = openDatabase(config.databasePath);
  let admin;
  try { admin = db.prepare("SELECT id FROM users WHERE email = ? AND role = 'administrador'").get(process.env.ADMIN_EMAIL); }
  finally { db.close(); }
  if (!admin || !process.env.ADMIN_PASSWORD) throw new Error('Configura e inicializa el administrador local.');
  const source = new URL('../postman/ejemplo.postman_environment.json', import.meta.url);
  const environment = JSON.parse(readFileSync(source, 'utf8'));
  environment.name = 'Catálogo - SOLO LOCAL (contiene secretos)';
  const values = {
    baseUrl: `http://${config.host}:${config.port}`,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    expiredToken: jwt.sign({}, config.jwtSecret, {
      subject: String(admin.id), algorithm: 'HS256', expiresIn: -10,
      issuer: config.jwtIssuer, audience: config.jwtAudience,
    }),
  };
  environment.values.forEach((item) => { if (Object.hasOwn(values, item.key)) item.value = values[item.key]; });
  writeFileSync(new URL('../postman/entorno.local.json', import.meta.url), JSON.stringify(environment, null, 2) + '\n', { mode: 0o600 });
  console.log('Creado postman/entorno.local.json, excluido de Git. Importarlo solo localmente; no compartir ni sincronizar sus valores.');
} catch (error) {
  console.error('No se pudo preparar Postman:', error.message);
  process.exitCode = 1;
}
