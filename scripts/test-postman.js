import newman from 'newman';
import jwt from 'jsonwebtoken';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createTestContext } from './lib/test-server.js';

const collection = JSON.parse(await readFile(new URL('../postman/catalogo.postman_collection.json', import.meta.url), 'utf8'));
const environment = JSON.parse(await readFile(new URL('../postman/ejemplo.postman_environment.json', import.meta.url), 'utf8'));
const context = await createTestContext();
const values = {
  baseUrl: context.baseUrl,
  adminEmail: context.admin.email,
  adminPassword: context.admin.password,
  expiredToken: jwt.sign({}, context.jwtSecret, { subject: '1', algorithm: 'HS256', expiresIn: -10, issuer: 'catalogo-api', audience: 'catalogo-clientes' }),
};
environment.values.forEach((item) => { if (Object.hasOwn(values, item.key)) item.value = values[item.key]; });

function run(folder, activeEnvironment) {
  return new Promise((resolve, reject) => {
    newman.run({ collection, environment: activeEnvironment, folder, reporters: [], timeoutRequest: 5000 }, (error, summary) => {
      if (error) return reject(new Error('No se pudo ejecutar la colección de Postman.'));
      if (summary.run.failures.length) {
        summary.run.failures.forEach((failure) => console.error(`Falló: ${failure.source.name} (${failure.error.name})`));
        return reject(new Error(`${summary.run.failures.length} aserciones de Postman fallaron.`));
      }
      resolve(summary);
    });
  });
}

try {
  await context.start();
  const before = await run('01 - Antes del reinicio', environment);
  console.log(`Antes del reinicio: ${before.run.stats.requests.total} peticiones correctas.`);
  await context.stop();
  console.log('Proceso Node.js detenido; iniciando un proceso nuevo con el mismo archivo SQLite.');
  await context.start();
  const after = await run('02 - Después del reinicio', before.environment.toJSON());
  const requests = before.run.stats.requests.total + after.run.stats.requests.total;
  const assertions = before.run.stats.assertions.total + after.run.stats.assertions.total;
  console.log(`Postman: ${requests} peticiones y ${assertions} aserciones correctas; persistencia comprobada.`);
  const report = {
    result: 'PASS', requests, assertions, failures: 0,
    restart: 'Proceso detenido y proceso nuevo iniciado con el mismo archivo SQLite.',
    persistence: ['usuario A e inicio de sesión', 'producto actualizado', 'favorito de A'],
    isolation: 'B no ve ni puede quitar el favorito de A; A lo conserva.',
    cascade: 'Al eliminar el producto se elimina su favorito.',
  };
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/postman-summary.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await context.cleanup();
}
