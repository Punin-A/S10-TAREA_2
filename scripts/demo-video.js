// Demostración interactiva: todas las respuestas proceden de la API real.
import assert from 'node:assert/strict';
import { createInterface } from 'node:readline/promises';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { createTestContext } from './lib/test-server.js';
import { projectRoot } from '../src/config/env.js';

const automatic = process.argv.includes('--auto');
if (!automatic && !process.stdin.isTTY) {
  console.error('Ejecuta npm run video en la terminal de VS Code. Para comprobar sin pausas: npm run video:check.');
  process.exit(1);
}
const keyboard = automatic ? null : createInterface({ input: process.stdin, output: process.stdout });
let context;
let requests = 0;
const steps = [];

function screen(title) {
  if (!automatic) console.clear();
  console.log(`\n${title}\n`);
}

async function next(title) {
  if (!automatic) await keyboard.question(`\nPulsa Enter para mostrar ${title}... `);
  screen(title);
}

function productView(product) {
  return { id: product.id, name: product.name, price: product.price };
}

function favoritesView(data) {
  return { favorites: data.favorites.map(productView) };
}

async function request(label, method, route, expected, { body, token, view } = {}) {
  const response = await fetch(`${context.baseUrl}/api${route}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  requests++;
  console.log(`${label}: ${method} /api${route} -> HTTP ${response.status}`);
  assert.equal(response.status, expected, `${label}: se esperaba HTTP ${expected}, se obtuvo ${response.status}.`);
  const visible = view ? view(data) : data?.error ? { message: data.error.message } : null;
  // Login devuelve JWT; solo se imprime la proyección pública seleccionada.
  if (visible) console.log(`  ${JSON.stringify(visible)}`);
  return data;
}

try {
  screen('VIDEO | API de productos y favoritos');
  console.log('Preparando administrador, usuarios A/B y una base SQLite separada...');
  context = await createTestContext({ directoryRoot: path.join(projectRoot, 'data', 'video'), retainDatabase: true });
  await context.start();
  const secretPassword = context.admin.password;
  const accounts = {
    A: { name: 'Usuario A Video', email: 'a@video.example.test', password: secretPassword },
    B: { name: 'Usuario B Video', email: 'b@video.example.test', password: secretPassword },
  };
  for (const account of Object.values(accounts)) {
    const response = await fetch(`${context.baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(account),
    });
    assert.equal(response.status, 201, 'No se pudo preparar una cuenta de demostración.');
  }
  console.log('LISTO. Peticiones HTTP reales; sin mostrar contraseñas ni tokens.');
  console.log('6 pantallas. Puedes explicar cada una antes de pulsar Enter.');
  console.log(`Servidor propio: ${context.baseUrl} | Base: ${path.relative(projectRoot, context.databasePath)}`);
  console.log('Puedes iniciar la grabación ahora. Ctrl+C cancela y cierra este servidor.');

  let cancelling = false;
  async function cancel() {
    if (cancelling) return;
    cancelling = true;
    keyboard?.close();
    await context.cleanup();
    process.exit(130);
  }
  process.on('SIGINT', cancel);
  keyboard?.on('SIGINT', cancel);

  await next('1/6 | AUTENTICACION JWT Y ROLES');
  const tokens = {};
  const logins = [
    ['Administrador', context.admin.email, secretPassword, 'administrador'],
    ['A', accounts.A.email, secretPassword, 'usuario'],
    ['B', accounts.B.email, secretPassword, 'usuario'],
  ];
  for (const [label, email, password, role] of logins) {
    const data = await request(`Login ${label}`, 'POST', '/auth/login', 200, {
      body: { email, password },
      view: (data) => ({ role: data.user.role, JWT: 'emitido (valor oculto)', expiresIn: data.expiresIn }),
    });
    assert.equal(data.user.role, role);
    tokens[label] = data.token;
  }
  const verified = jwt.verify(tokens.A, context.jwtSecret, { algorithms: ['HS256'], issuer: 'catalogo-api', audience: 'catalogo-clientes' });
  console.log(`JWT de A: firma verificada; usuario ${verified.sub}; dura ${verified.exp - verified.iat} segundos.`);
  await request('Sin token', 'GET', '/favorites', 401);
  const expired = jwt.sign({}, context.jwtSecret, { subject: verified.sub, expiresIn: -10, issuer: 'catalogo-api', audience: 'catalogo-clientes' });
  await request('JWT firmado pero vencido', 'GET', '/favorites', 401, { token: expired });
  const productData = { name: 'Producto del video', description: 'Ejemplo ficticio para la demostración.', category: 'Video', price: 10 };
  await request('A intenta crear un producto', 'POST', '/products', 403, { body: productData, token: tokens.A });
  steps.push('JWT y roles: login 200; sin token y vencido 401; usuario modifica catálogo 403.');

  await next('2/6 | ADMINISTRADOR CREA Y ACTUALIZA');
  const created = await request('Crear como administrador', 'POST', '/products', 201, {
    body: productData, token: tokens.Administrador, view: (data) => ({ product: productView(data.product) }),
  });
  const productId = created.product.id;
  assert.equal(created.product.price, 10);
  const updated = await request('Actualizar precio', 'PUT', `/products/${productId}`, 200, {
    body: { ...productData, price: 15.5 }, token: tokens.Administrador, view: (data) => ({ product: productView(data.product) }),
  });
  assert.equal(updated.product.price, 15.5);
  const read = await request('Consultar sin token (catálogo público)', 'GET', `/products/${productId}`, 200, {
    view: (data) => ({ product: productView(data.product) }),
  });
  assert.equal(read.product.price, 15.5);
  console.log('\nLa eliminación se muestra al final para comprobar antes la persistencia.');
  steps.push('Productos: creación 201 y actualización/consulta 200, precio 10 -> 15.50.');

  await next('3/6 | AGREGAR, CONSULTAR Y QUITAR FAVORITOS');
  await request('A agrega favorito', 'POST', '/favorites', 201, { body: { productId }, token: tokens.A });
  const first = await request('A consulta', 'GET', '/favorites', 200, { token: tokens.A, view: favoritesView });
  assert.deepEqual(first.favorites.map((product) => product.id), [productId]);
  await request('A quita su favorito', 'DELETE', `/favorites/${productId}`, 204, { token: tokens.A });
  const empty = await request('A consulta después de quitarlo', 'GET', '/favorites', 200, { token: tokens.A, view: favoritesView });
  assert.deepEqual(empty.favorites, []);
  console.log('\nLo agregamos otra vez para demostrar el aislamiento y el reinicio:');
  await request('A vuelve a agregarlo', 'POST', '/favorites', 201, { body: { productId }, token: tokens.A });
  steps.push('Favoritos propios: agregar 201, listar 200, quitar 204 y lista vacía.');

  await next('4/6 | AISLAMIENTO ENTRE A Y B');
  const bList = await request('B consulta sus favoritos', 'GET', '/favorites', 200, { token: tokens.B, view: favoritesView });
  assert.deepEqual(bList.favorites, []);
  await request('B intenta quitar el favorito de A', 'DELETE', `/favorites/${productId}`, 404, { token: tokens.B });
  const aList = await request('A conserva su favorito', 'GET', '/favorites', 200, { token: tokens.A, view: favoritesView });
  assert.deepEqual(aList.favorites.map((product) => product.id), [productId]);
  console.log('\nLa identidad se obtiene del JWT verificado, no de un userId del cliente.');
  steps.push('Aislamiento: B no ve el favorito de A; no puede borrarlo (404); A lo conserva.');

  await next('5/6 | PERSISTENCIA AL REINICIAR NODE.JS');
  const previousPid = context.pid;
  await context.stop();
  console.log(`Proceso Node.js ${previousPid}: DETENIDO.`);
  await context.start();
  assert.notEqual(context.pid, previousPid);
  console.log(`Proceso Node.js ${context.pid}: INICIADO. Mismo archivo SQLite.`);
  const again = await request('Login A después del reinicio', 'POST', '/auth/login', 200, {
    body: { email: accounts.A.email, password: secretPassword }, view: (data) => ({ role: data.user.role, JWT: 'emitido (valor oculto)' }),
  });
  const persisted = await request('Producto después del reinicio', 'GET', `/products/${productId}`, 200, {
    view: (data) => ({ product: productView(data.product) }),
  });
  assert.equal(persisted.product.price, 15.5);
  const persistedList = await request('Favorito después del reinicio', 'GET', '/favorites', 200, { token: again.token, view: favoritesView });
  assert.deepEqual(persistedList.favorites.map((product) => product.id), [productId]);
  steps.push('Persistencia: proceso Node.js nuevo, mismo SQLite; usuario, precio y favorito conservados.');

  await next('6/6 | ELIMINAR PRODUCTO Y EXPLICAR EL CODIGO');
  await request('Administrador elimina el producto', 'DELETE', `/products/${productId}`, 204, { token: tokens.Administrador });
  await request('Consultar producto eliminado', 'GET', `/products/${productId}`, 404);
  const afterDelete = await request('Favoritos eliminados en cascada', 'GET', '/favorites', 200, { token: tokens.A, view: favoritesView });
  assert.deepEqual(afterDelete.favorites, []);
  const controller = await readFile(new URL('../src/controllers/favorites.controller.js', import.meta.url), 'utf8');
  const repository = await readFile(new URL('../src/repositories/favorites.repository.js', import.meta.url), 'utf8');
  const controllerLine = controller.split('\n').find((line) => line.includes('favorites.remove(req.user.id, productId)'));
  const sqlLine = repository.split('\n').find((line) => line.includes('DELETE FROM favorites WHERE'));
  assert.ok(controllerLine && sqlLine);
  console.log('\nFragmentos reales del código que mantienen el aislamiento:');
  console.log('src/controllers/favorites.controller.js:');
  console.log(`  ${controllerLine.trim()}`);
  console.log('src/repositories/favorites.repository.js:');
  console.log(`  ${sqlLine.trim()}`);
  console.log('\nreq.user.id: usuario del token. WHERE exige dueño Y producto.');
  steps.push('Borrado: administrador 204; producto 404; favoritos en cascada y código de aislamiento comprobados.');

  const report = { result: 'PASS', requests, steps, database: path.relative(projectRoot, context.databasePath) };
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/video-demo-summary.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(`\nLISTO: ${requests} peticiones de la demostración verificadas; 6 etapas correctas.`);
  console.log('Puedes explicar tu aporte y la dificultad, y detener la grabación.');
  if (!automatic) await keyboard.question('\nPulsa Enter al terminar de explicar para cerrar el servidor... ');
} catch (error) {
  console.error(`\nLa demostración se detuvo: ${error.message}`);
  console.error('Revisa la conexión local y vuelve a ejecutar npm run video.');
  process.exitCode = 1;
} finally {
  keyboard?.close();
  await context?.cleanup();
  if (context) console.log('Servidor de la demostración cerrado. El archivo SQLite permanece en data/video/.');
}
