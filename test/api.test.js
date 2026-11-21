import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { createTestContext } from '../scripts/lib/test-server.js';
import { openDatabase } from '../src/db/database.js';
import { seedDatabase } from '../scripts/seed.js';

test('API REST: autenticación, roles, catálogo, favoritos y persistencia real', async (t) => {
  const context = await createTestContext();
  t.after(() => context.cleanup());
  await context.start();
  const account = (suffix) => ({ name: `Usuario ${suffix}`, email: `${suffix}@example.test`, password: 'Clave-Ficticia-Segura-2026' });
  const productData = { name: 'Producto de prueba', description: 'Descripción ficticia.', category: 'Pruebas', price: 19.95 };
  async function request(method, route, { body, token, raw } = {}) {
    const response = await fetch(`${context.baseUrl}/api${route}`, {
      method,
      headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const data = response.status === 204 ? null : await response.json();
    const serialized = JSON.stringify(data);
    assert.doesNotMatch(serialized, /"(?:password|passwordHash|password_hash)"\s*:|JWT_SECRET|SQLITE|stack/i);
    return { status: response.status, data };
  }
  let a, b, adminToken, aToken, bToken, product, seedId;

  await t.test('El catálogo es público, tiene cinco ejemplos y filtra por categoría', async () => {
    const all = await request('GET', '/products');
    assert.equal(all.status, 200);
    assert.equal(all.data.products.length, 5);
    seedId = all.data.products[0].id;
    const filtered = await request('GET', '/products?category=Tecnolog%C3%ADa');
    assert.equal(filtered.status, 200);
    assert.equal(filtered.data.products.length, 2);
    const missingCategory = await request('GET', '/products?category=Ausente');
    assert.deepEqual(missingCategory.data.products, []);
  });

  await t.test('Registro, normalización del correo, duplicados y bloqueo del rol público', async () => {
    const ra = await request('POST', '/auth/register', { body: account('a') });
    const rb = await request('POST', '/auth/register', { body: account('b') });
    assert.equal(ra.status, 201); assert.equal(rb.status, 201);
    a = ra.data.user; b = rb.data.user;
    assert.equal(a.role, 'usuario');
    assert.equal((await request('POST', '/auth/register', { body: { ...account('a'), email: ' A@EXAMPLE.TEST ' } })).status, 409);
    assert.equal((await request('POST', '/auth/register', { body: { ...account('c'), role: 'administrador' } })).status, 400);
    assert.equal((await request('POST', '/auth/register', { body: { ...account('c'), email: 'no-es-correo' } })).status, 400);
    assert.equal((await request('POST', '/auth/register', { body: { ...account('c'), name: ' ' } })).status, 400);
    assert.equal((await request('POST', '/auth/register', { body: { ...account('c'), password: 'corta' } })).status, 400);
  });

  await t.test('Login con JWT firmado, vencimiento, credenciales incorrectas y hash almacenado', async () => {
    const la = await request('POST', '/auth/login', { body: { email: a.email, password: account('a').password } });
    const lb = await request('POST', '/auth/login', { body: { email: b.email, password: account('b').password } });
    const laAdmin = await request('POST', '/auth/login', { body: { email: context.admin.email, password: context.admin.password } });
    assert.equal(la.status, 200); assert.equal(lb.status, 200); assert.equal(laAdmin.status, 200);
    aToken = la.data.token; bToken = lb.data.token; adminToken = laAdmin.data.token;
    const payload = jwt.verify(aToken, context.jwtSecret, { algorithms: ['HS256'], issuer: 'catalogo-api', audience: 'catalogo-clientes' });
    assert.equal(payload.sub, String(a.id)); assert.equal(payload.exp - payload.iat, 3600);
    assert.equal((await request('POST', '/auth/login', { body: { email: a.email, password: 'Incorrecta-Segura-2026' } })).status, 401);
    assert.equal((await request('POST', '/auth/login', { body: { email: a.email, password: 'incorrecta' } })).status, 401);
    assert.equal((await request('POST', '/auth/login', { body: { email: 'ausente@example.test', password: account('a').password } })).status, 401);
    const db = openDatabase(context.databasePath);
    try {
      const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(a.id);
      assert.notEqual(row.password_hash, account('a').password);
      assert.equal(await bcrypt.compare(account('a').password, row.password_hash), true);
    } finally { db.close(); }
  });

  await t.test('401 sin token, token vencido auténtico, firma incorrecta, sin exp y algoritmo distinto', async () => {
    assert.equal((await request('GET', '/favorites')).status, 401);
    assert.equal((await request('POST', '/products', { body: productData })).status, 401);
    const options = { subject: String(a.id), issuer: 'catalogo-api', audience: 'catalogo-clientes' };
    const expired = jwt.sign({}, context.jwtSecret, { ...options, expiresIn: -10 });
    const forged = jwt.sign({}, 'otro-secreto-de-pruebas-que-no-es-el-correcto', { ...options, expiresIn: '1h' });
    const noExpiry = jwt.sign({}, context.jwtSecret, options);
    const algorithm = jwt.sign({}, context.jwtSecret, { ...options, algorithm: 'HS384', expiresIn: '1h' });
    for (const token of [expired, forged, noExpiry, algorithm]) {
      assert.equal((await request('GET', '/favorites', { token })).status, 401);
    }
  });

  await t.test('403 para todas las modificaciones con rol usuario', async () => {
    assert.equal((await request('POST', '/products', { body: productData, token: aToken })).status, 403);
    assert.equal((await request('PUT', `/products/${seedId}`, { body: productData, token: aToken })).status, 403);
    assert.equal((await request('DELETE', `/products/${seedId}`, { token: aToken })).status, 403);
  });

  await t.test('Validación de precio, texto, identificadores, filtros y JSON sin filtrar detalles internos', async () => {
    for (const price of [0, -1, '19.95', null, 1.001, 10000000]) {
      assert.equal((await request('POST', '/products', { body: { ...productData, price }, token: adminToken })).status, 400);
    }
    for (const field of ['name', 'description', 'category']) {
      assert.equal((await request('POST', '/products', { body: { ...productData, [field]: '   ' }, token: adminToken })).status, 400);
    }
    for (const id of ['abc', '0', '-1', '1.5', '9007199254740992']) {
      assert.equal((await request('GET', `/products/${id}`)).status, 400);
    }
    assert.equal((await request('POST', '/products', { raw: '{invalido', token: adminToken })).status, 400);
    assert.equal((await request('POST', '/products', { body: [], token: adminToken })).status, 400);
    assert.equal((await request('GET', '/products?category=')).status, 400);
    assert.equal((await request('GET', '/products?category=a&category=b')).status, 400);
    assert.equal((await request('GET', '/products?unknown=1')).status, 400);
    assert.equal((await request('GET', '/products/2147483647')).status, 404);
    assert.equal((await request('PUT', '/products/2147483647', { body: productData, token: adminToken })).status, 404);
    assert.equal((await request('DELETE', '/products/2147483647', { token: adminToken })).status, 404);
  });

  await t.test('Administrador crea, consulta y actualiza un producto', async () => {
    const created = await request('POST', '/products', { body: productData, token: adminToken });
    assert.equal(created.status, 201); product = created.data.product;
    const read = await request('GET', `/products/${product.id}`);
    assert.equal(read.status, 200); assert.equal(read.data.product.price, 19.95);
    const updated = await request('PUT', `/products/${product.id}`, { body: { ...productData, price: 29.99 }, token: adminToken });
    assert.equal(updated.status, 200); assert.equal(updated.data.product.price, 29.99);
  });

  await t.test('Favoritos: creación, duplicado 409, inexistente 404 e identidad no aceptada del cliente', async () => {
    const add = await request('POST', '/favorites', { body: { productId: product.id }, token: aToken });
    assert.equal(add.status, 201); assert.equal(add.data.product.id, product.id);
    assert.equal((await request('POST', '/favorites', { body: { productId: product.id }, token: aToken })).status, 409);
    assert.equal((await request('POST', '/favorites', { body: { productId: 2147483647 }, token: aToken })).status, 404);
    assert.equal((await request('POST', '/favorites', { body: { productId: seedId, userId: b.id }, token: aToken })).status, 400);
    assert.equal((await request('POST', '/favorites', { body: { productId: 'abc' }, token: aToken })).status, 400);
    assert.equal((await request('DELETE', '/favorites/abc', { token: aToken })).status, 400);
  });

  await t.test('Aislamiento: B no puede ver ni borrar el favorito de A, pero ambos pueden guardar el mismo producto', async () => {
    assert.deepEqual((await request('GET', '/favorites', { token: bToken })).data.favorites, []);
    assert.equal((await request('DELETE', `/favorites/${product.id}`, { token: bToken })).status, 404);
    const retained = await request('GET', '/favorites', { token: aToken });
    assert.equal(retained.status, 200); assert.equal(retained.data.favorites[0].id, product.id);
    assert.equal((await request('POST', '/favorites', { body: { productId: product.id }, token: bToken })).status, 201);
    assert.equal((await request('DELETE', `/favorites/${product.id}`, { token: bToken })).status, 204);
    assert.equal((await request('GET', '/favorites', { token: aToken })).data.favorites.length, 1);
  });

  await t.test('Reinicio de Node.js: usuarios, productos y favoritos permanecen en el mismo archivo', async () => {
    await context.stop();
    await context.start();
    assert.equal((await request('GET', `/products/${product.id}`)).data.product.price, 29.99);
    assert.equal((await request('GET', '/favorites', { token: aToken })).data.favorites[0].id, product.id);
    assert.equal((await request('POST', '/auth/login', { body: { email: a.email, password: account('a').password } })).status, 200);
  });

  await t.test('Eliminación de favoritos y cascada consistente al borrar el producto', async () => {
    assert.equal((await request('DELETE', `/favorites/${product.id}`, { token: aToken })).status, 204);
    assert.equal((await request('DELETE', `/favorites/${product.id}`, { token: aToken })).status, 404);
    assert.equal((await request('POST', '/favorites', { body: { productId: product.id }, token: aToken })).status, 201);
    assert.equal((await request('POST', '/favorites', { body: { productId: product.id }, token: bToken })).status, 201);
    assert.equal((await request('DELETE', `/products/${product.id}`, { token: adminToken })).status, 204);
    assert.equal((await request('GET', `/products/${product.id}`)).status, 404);
    assert.deepEqual((await request('GET', '/favorites', { token: aToken })).data.favorites, []);
    assert.deepEqual((await request('GET', '/favorites', { token: bToken })).data.favorites, []);
    const db = openDatabase(context.databasePath);
    try { assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []); } finally { db.close(); }
  });

  await t.test('Inicialización repetible sin duplicar productos ni cambiar la cuenta administrativa', async () => {
    const db = openDatabase(context.databasePath);
    try {
      await seedDatabase(db, context.admin);
      assert.equal(db.prepare('SELECT count(*) AS total FROM products').get().total, 5);
      assert.equal(db.prepare("SELECT count(*) AS total FROM users WHERE role = 'administrador'").get().total, 1);
    } finally { db.close(); }
    const file = await readFile(context.databasePath);
    assert.equal(file.subarray(0, 15).toString(), 'SQLite format 3');
  });
});
