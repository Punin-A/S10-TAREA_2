// Genera los dos archivos públicos importables en Postman. No incluye secretos.
import { mkdirSync, writeFileSync } from 'node:fs';

const root = new URL('../postman/', import.meta.url);
mkdirSync(root, { recursive: true });
const commonTests = [
  "pm.test('Respuesta sin contraseñas ni hashes', () => {",
  "  if (pm.response.code === 204) return;",
  "  const walk = value => { if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => { pm.expect(['password', 'passwordHash', 'password_hash']).not.to.include(key); walk(item); }); };",
  "  walk(pm.response.json());",
  '});',
];

function request(name, method, route, status, { token, body, tests = [], before = [] } = {}) {
  return {
    name,
    event: [
      ...(before.length ? [{ listen: 'prerequest', script: { type: 'text/javascript', exec: before } }] : []),
      { listen: 'test', script: { type: 'text/javascript', exec: [
        `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
        ...commonTests,
        ...(status >= 400 ? ["pm.test('Error claro', () => pm.expect(pm.response.json().error.message).to.be.a('string').and.not.empty);"] : []),
        ...tests,
      ] } },
    ],
    request: {
      method,
      auth: token ? { type: 'bearer', bearer: [{ key: 'token', value: `{{${token}}}`, type: 'string' }] } : { type: 'noauth' },
      header: body === undefined ? [] : [{ key: 'Content-Type', value: 'application/json' }],
      url: `{{baseUrl}}/api${route}`,
      ...(body === undefined ? {} : { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } }),
    },
  };
}

const product = { name: 'Producto Postman', description: 'Producto ficticio para verificar el CRUD.', category: 'Pruebas Postman', price: 15.5 };
const userA = { name: 'Usuario A Postman', email: '{{emailA}}', password: '{{passwordA}}' };
const userB = { name: 'Usuario B Postman', email: '{{emailB}}', password: '{{passwordB}}' };
const userTests = ["pm.test('Usuario creado con rol usuario', () => { const u = pm.response.json().user; pm.expect(u.id).to.be.a('number'); pm.expect(u.role).to.eql('usuario'); pm.expect(u.email).to.be.a('string'); });"];
const favoritePresent = ["pm.test('El favorito de A permanece', () => { const items = pm.response.json().favorites; pm.expect(items.map(p => String(p.id))).to.include(String(pm.environment.get('productId'))); });"];
const emptyFavorites = ["pm.test('Lista de favoritos vacía', () => pm.expect(pm.response.json().favorites).to.eql([]));"];
function login(name, email, password, token, role) {
  return request(name, 'POST', '/auth/login', 200, { body: { email, password }, tests: [
    `pm.test('JWT y rol correctos', () => { const data = pm.response.json(); pm.expect(data.token).to.be.a('string').and.not.empty; pm.expect(data.user.role).to.eql('${role}'); pm.expect(data.tokenType).to.eql('Bearer'); const payload = JSON.parse(atob(data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); pm.expect(payload.exp).to.be.above(payload.iat); pm.expect(payload.sub).to.eql(String(data.user.id)); pm.environment.set('${token}', data.token); });`,
  ] });
}

const phase1 = [
  request('01 - Catálogo público y cinco productos de ejemplo', 'GET', '/products', 200, {
    before: [
      "const run = pm.variables.replaceIn('{{$guid}}');",
      "pm.environment.set('emailA', 'a.' + run + '@example.test'); pm.environment.set('emailB', 'b.' + run + '@example.test');",
      "pm.environment.set('passwordA', 'Demo-A-' + run); pm.environment.set('passwordB', 'Demo-B-' + run);",
      "['tokenA', 'tokenB', 'adminToken', 'productId', 'userAId'].forEach(key => pm.environment.unset(key));",
    ],
    tests: ["pm.test('Catálogo inicial', () => { const products = pm.response.json().products; pm.expect(products.length).to.be.at.least(5); pm.environment.set('seedId', products[0].id); });"],
  }),
  request('02 - Registro correcto de A', 'POST', '/auth/register', 201, { body: userA, tests: [...userTests, "pm.environment.set('userAId', pm.response.json().user.id);"] }),
  request('03 - Correo duplicado', 'POST', '/auth/register', 409, { body: userA }),
  request('04 - Registro público rechaza rol administrador', 'POST', '/auth/register', 400, { body: { ...userB, role: 'administrador' } }),
  request('05 - Correo inválido', 'POST', '/auth/register', 400, { body: { ...userB, email: 'correo-invalido' } }),
  request('06 - Nombre vacío', 'POST', '/auth/register', 400, { body: { ...userB, name: '   ' } }),
  request('07 - Contraseña demasiado corta', 'POST', '/auth/register', 400, { body: { ...userB, password: 'corta' } }),
  request('08 - Credenciales incorrectas', 'POST', '/auth/login', 401, { body: { email: '{{emailA}}', password: 'Incorrecta-Postman-2026' } }),
  login('09 - Login correcto de A', '{{emailA}}', '{{passwordA}}', 'tokenA', 'usuario'),
  request('10 - Registro correcto de B', 'POST', '/auth/register', 201, { body: userB, tests: userTests }),
  login('11 - Login correcto de B', '{{emailB}}', '{{passwordB}}', 'tokenB', 'usuario'),
  login('12 - Login administrador inicializado localmente', '{{adminEmail}}', '{{adminPassword}}', 'adminToken', 'administrador'),
  request('13 - Favoritos sin token', 'GET', '/favorites', 401),
  request('14 - Favoritos con JWT firmado y vencido', 'GET', '/favorites', 401, { token: 'expiredToken' }),
  request('15 - Crear producto sin token', 'POST', '/products', 401, { body: product }),
  request('16 - Usuario no puede crear productos', 'POST', '/products', 403, { body: product, token: 'tokenA' }),
  request('17 - Usuario no puede actualizar productos', 'PUT', '/products/{{seedId}}', 403, { body: product, token: 'tokenA' }),
  request('18 - Usuario no puede eliminar productos', 'DELETE', '/products/{{seedId}}', 403, { token: 'tokenA' }),
  request('19 - Precio cero inválido', 'POST', '/products', 400, { body: { ...product, price: 0 }, token: 'adminToken' }),
  request('20 - Precio negativo inválido', 'POST', '/products', 400, { body: { ...product, price: -1 }, token: 'adminToken' }),
  request('21 - Precio de tipo texto inválido', 'POST', '/products', 400, { body: { ...product, price: '15.50' }, token: 'adminToken' }),
  request('22 - Nombre de producto vacío', 'POST', '/products', 400, { body: { ...product, name: ' ' }, token: 'adminToken' }),
  request('23 - Descripción vacía', 'POST', '/products', 400, { body: { ...product, description: '' }, token: 'adminToken' }),
  request('24 - Categoría vacía', 'POST', '/products', 400, { body: { ...product, category: '' }, token: 'adminToken' }),
  request('25 - Identificador inválido', 'GET', '/products/abc', 400),
  request('26 - Producto inexistente', 'GET', '/products/2147483647', 404),
  request('27 - Crear producto como administrador', 'POST', '/products', 201, { body: product, token: 'adminToken', tests: [
    "pm.test('Producto creado', () => { const p = pm.response.json().product; pm.expect(p.id).to.be.a('number'); pm.expect(p.price).to.eql(15.5); pm.environment.set('productId', p.id); });",
  ] }),
  request('28 - Consultar producto creado', 'GET', '/products/{{productId}}', 200, { tests: ["pm.test('ID correcto', () => pm.expect(String(pm.response.json().product.id)).to.eql(String(pm.environment.get('productId'))));"] }),
  request('29 - Filtrar por categoría', 'GET', '/products?category=Pruebas%20Postman', 200, { tests: [
    "pm.test('Todos coinciden con la categoría', () => { const products = pm.response.json().products; pm.expect(products.length).to.be.at.least(1); products.forEach(p => pm.expect(p.category).to.eql('Pruebas Postman')); pm.expect(products.map(p => String(p.id))).to.include(String(pm.environment.get('productId'))); });",
  ] }),
  request('30 - Actualizar producto como administrador', 'PUT', '/products/{{productId}}', 200, { body: { ...product, price: 29.99 }, token: 'adminToken', tests: ["pm.test('Precio actualizado', () => pm.expect(pm.response.json().product.price).to.eql(29.99));"] }),
  request('31 - A agrega un favorito', 'POST', '/favorites', 201, { body: { productId: '{{productId}}' }, token: 'tokenA', tests: ["pm.test('Producto favorito correcto', () => pm.expect(String(pm.response.json().product.id)).to.eql(String(pm.environment.get('productId'))));"] }),
  request('32 - Favorito duplicado devuelve 409', 'POST', '/favorites', 409, { body: { productId: '{{productId}}' }, token: 'tokenA' }),
  request('33 - Favorito de producto inexistente devuelve 404', 'POST', '/favorites', 404, { body: { productId: 2147483647 }, token: 'tokenA' }),
  request('34 - Rechazar userId enviado por el cliente', 'POST', '/favorites', 400, { body: { productId: '{{seedId}}', userId: '{{userAId}}' }, token: 'tokenB' }),
  request('35 - A consulta sus favoritos', 'GET', '/favorites', 200, { token: 'tokenA', tests: favoritePresent }),
  request('36 - B no ve los favoritos de A', 'GET', '/favorites', 200, { token: 'tokenB', tests: emptyFavorites }),
  request('37 - B no puede quitar el favorito de A', 'DELETE', '/favorites/{{productId}}', 404, { token: 'tokenB' }),
  request('38 - El favorito de A permanece tras el intento de B', 'GET', '/favorites', 200, { token: 'tokenA', tests: favoritePresent }),
  request('39 - B agrega el mismo producto a su propia lista', 'POST', '/favorites', 201, { body: { productId: '{{productId}}' }, token: 'tokenB' }),
  request('40 - B quita su propio favorito', 'DELETE', '/favorites/{{productId}}', 204, { token: 'tokenB' }),
  request('41 - B queda sin favoritos', 'GET', '/favorites', 200, { token: 'tokenB', tests: emptyFavorites }),
  request('42 - A conserva su favorito antes de reiniciar', 'GET', '/favorites', 200, { token: 'tokenA', tests: favoritePresent }),
];
const phase2 = [
  login('43 - Usuario A persiste después de reiniciar', '{{emailA}}', '{{passwordA}}', 'tokenA', 'usuario'),
  request('44 - Producto y actualización persisten después de reiniciar', 'GET', '/products/{{productId}}', 200, { tests: ["pm.test('Producto persistido con precio actualizado', () => { const p = pm.response.json().product; pm.expect(String(p.id)).to.eql(String(pm.environment.get('productId'))); pm.expect(p.price).to.eql(29.99); });"] }),
  request('45 - Favorito de A persiste después de reiniciar', 'GET', '/favorites', 200, { token: 'tokenA', tests: favoritePresent }),
  request('46 - A quita su favorito', 'DELETE', '/favorites/{{productId}}', 204, { token: 'tokenA' }),
  request('47 - A consulta la lista vacía', 'GET', '/favorites', 200, { token: 'tokenA', tests: emptyFavorites }),
  request('48 - A vuelve a agregar el favorito para verificar la cascada', 'POST', '/favorites', 201, { body: { productId: '{{productId}}' }, token: 'tokenA' }),
  login('49 - Login administrador después de reiniciar', '{{adminEmail}}', '{{adminPassword}}', 'adminToken', 'administrador'),
  request('50 - Administrador elimina el producto', 'DELETE', '/products/{{productId}}', 204, { token: 'adminToken' }),
  request('51 - Producto eliminado ya no existe', 'GET', '/products/{{productId}}', 404),
  request('52 - Favoritos se eliminan en cascada', 'GET', '/favorites', 200, { token: 'tokenA', tests: emptyFavorites }),
];

const collection = {
  info: {
    _postman_id: 'a5f9c1c0-d71d-42a9-9640-279fb19dcabc',
    name: 'Catálogo y favoritos - API REST',
    description: 'Ejecutar 01, detener e iniciar Node.js con la misma base de datos y ejecutar 02 sin borrar el entorno. npm run test:postman realiza el reinicio automáticamente. Preparar credenciales y JWT realmente vencido con npm run postman:local. El entorno público no contiene secretos.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [{ name: '01 - Antes del reinicio', item: phase1 }, { name: '02 - Después del reinicio', item: phase2 }],
};
const variables = {
  baseUrl: 'http://127.0.0.1:3000', adminEmail: 'admin@example.test', adminPassword: '', expiredToken: '',
  emailA: '', emailB: '', passwordA: '', passwordB: '', tokenA: '', tokenB: '', adminToken: '', productId: '', seedId: '', userAId: '',
};
const environment = {
  id: 'd8ab0675-bd91-4bcd-a055-b5b183292821',
  name: 'Catálogo - Ejemplo SIN secretos',
  values: Object.entries(variables).map(([key, value]) => ({ key, value, type: /password|token/i.test(key) ? 'secret' : 'default', enabled: true })),
  _postman_variable_scope: 'environment',
};
writeFileSync(new URL('catalogo.postman_collection.json', root), JSON.stringify(collection, null, 2) + '\n');
writeFileSync(new URL('ejemplo.postman_environment.json', root), JSON.stringify(environment, null, 2) + '\n');
console.log(`Colección generada: ${phase1.length + phase2.length} peticiones con aserciones.`);
