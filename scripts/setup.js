import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const target = new URL('.env', root);
if (existsSync(target)) {
  console.log('.env ya existe; se conserva sin modificaciones.');
} else {
  copyFileSync(new URL('.env.example', root), target);
  const content = readFileSync(target, 'utf8')
    .replace(/^JWT_SECRET=$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`)
    .replace(/^ADMIN_PASSWORD=$/m, `ADMIN_PASSWORD=${randomBytes(18).toString('base64url')}`);
  writeFileSync(target, content, { mode: 0o600 });
  console.log(`Configuración local creada en ${fileURLToPath(target)}. Las credenciales están en ese archivo privado.`);
}
