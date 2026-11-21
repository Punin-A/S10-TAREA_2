# API REST de catálogo de productos y favoritos

Trabajo sencillo con Node.js, Express, SQLite, JWT y roles. Permite consultar un catálogo público, administrar productos y guardar favoritos privados por usuario. No requiere instalar un servidor de base de datos.

## Integrantes

| Integrante | Identificación para la entrega |
| --- | --- |
| 1 | Punin-A — nombre académico pendiente de proporcionar |
| 2 | Nombre académico y usuario de GitHub pendientes de proporcionar |

Completar los nombres antes de la entrega. No se incluyen correos personales en este repositorio. El historial debe contener aportes reales de los dos integrantes; no se atribuyen commits a una persona que no los realizó. Véase [cómo registrar los aportes](docs/ENTREGA.md).

## Tecnologías y base de datos

- Node.js **24.15 o superior** y NPM; Express 5.
- SQLite mediante `node:sqlite`, incluido en Node.js, para persistir en `data/catalog.sqlite`.
- `bcryptjs` para hashes de contraseña (coste 12), `jsonwebtoken` para JWT HS256, `dotenv` para configuración y `helmet` para cabeceras HTTP.
- `node:test` y Newman para comprobar la API y ejecutar la colección exportada de Postman.

Se eligió SQLite porque ofrece una base SQL real en un archivo y permite ejecutar el trabajo localmente sin servicios adicionales. Las claves foráneas y las restricciones `UNIQUE`, `CHECK` y `PRIMARY KEY` mantienen los datos consistentes. Los precios se guardan como centavos enteros y se devuelven como números con hasta dos decimales.

## Instalación y ejecución

Desde la raíz del proyecto, con Node.js instalado:

```bash
npm ci
npm run setup
npm run db:init
npm start
```

La API queda en `http://127.0.0.1:3000/api`; se puede comprobar con `GET /api/health`.

`setup` crea un `.env` privado con un secreto JWT y una contraseña de administrador aleatorios. **Consulta ese archivo localmente para conocer la contraseña**. Si `.env` ya existe, el script lo conserva. También puedes copiar `.env.example` a `.env` y completar los secretos manualmente.

`db:init` crea el esquema, un administrador y cinco productos ficticios. Es repetible: conserva las cuentas existentes y solo agrega los productos cuando el catálogo está vacío. No cambia contraseñas ni eleva usuarios existentes a administrador; si `ADMIN_EMAIL` pertenece a un usuario normal, rechaza la inicialización.

Para desarrollar con reinicio automático:

```bash
npm run dev
```

Detener con `Ctrl+C`. Al volver a ejecutar `npm start` se utiliza el mismo archivo SQLite y se conservan los datos. No borres `data/` ni cambies `DATABASE_PATH` para demostrar persistencia.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP, de 1 a 65535; predeterminado 3000. |
| `HOST` | Dirección de escucha; predeterminada `127.0.0.1`. |
| `DATABASE_PATH` | Archivo SQLite persistente, por ejemplo `./data/catalog.sqlite`; las rutas relativas se resuelven desde el proyecto. |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 bytes; obligatorio. |
| `JWT_EXPIRES_IN` | Vencimiento: `30m`, `1h`, etc.; predeterminado `1h`. |
| `ADMIN_NAME` | Nombre ficticio del administrador que crea el script local. |
| `ADMIN_EMAIL` | Correo ficticio y único del administrador local. |
| `ADMIN_PASSWORD` | Contraseña del administrador para la inicialización; mínimo 12 caracteres y máximo 72 bytes UTF-8. |

`.env.example` contiene secretos vacíos y datos ficticios. `.env`, bases de datos, `node_modules`, reportes y entornos locales de Postman están excluidos de Git.

## Organización

```text
src/
  app.js                     Configuración de Express
  server.js                  Inicio y cierre de Node.js
  config/                    Variables de entorno
  db/                        Conexión SQLite y carga del esquema
  routes/                    Rutas de autenticación, productos y favoritos
  controllers/               Lógica de las peticiones
  repositories/              Consultas SQL parametrizadas
  middleware/                JWT, roles, validación y errores
  utils/                     Error HTTP
sql/schema.sql               Modelo de datos y restricciones
scripts/                     Configuración, inicialización y pruebas
test/api.test.js             Pruebas de integración HTTP
postman/                     Colección y entorno público sin secretos
docs/                        Evidencias y pasos de entrega
```

## Modelo de datos

| Tabla | Campos y restricciones principales |
| --- | --- |
| `users` | `id`, `name`, `email` único sin distinguir mayúsculas, `password_hash`, `role` (`usuario` o `administrador`), `created_at`. |
| `products` | `id`, `name`, `description`, `category`, `price_cents > 0`, `created_at`. |
| `favorites` | `user_id`, `product_id`, `created_at`; clave primaria compuesta para impedir duplicados. Ambas referencias tienen `ON DELETE CASCADE`. |

Un usuario puede guardar muchos productos; un producto puede pertenecer a los favoritos de muchos usuarios. Eliminar un producto elimina automáticamente todos sus favoritos en la misma operación SQL. Dos usuarios sí pueden guardar el mismo producto. Los nombres de producto pueden repetirse: el identificador distingue cada producto; los duplicados prohibidos son el correo y la pareja usuario-producto.

Los ejemplos son teclado, ratón, cuaderno, lámpara y botella, distribuidos en cuatro categorías. No se incorporan personas ni credenciales reales a la base de ejemplo.

## Rutas de la API

Las rutas usan el prefijo `/api`. Al no disponerse de la imagen mencionada en el enunciado, se adoptaron las siguientes rutas REST para cubrir las operaciones solicitadas.

| Método | Ruta | Acceso | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | Público | 200, estado del servidor. |
| POST | `/auth/register` | Público | 201, usuario creado siempre con rol `usuario`. |
| POST | `/auth/login` | Público | 200, JWT con vencimiento y datos públicos del usuario. |
| GET | `/products` | Público | 200, catálogo. |
| GET | `/products?category=Hogar` | Público | 200, catálogo filtrado por categoría exacta. |
| GET | `/products/:id` | Público | 200, un producto. |
| POST | `/products` | Administrador | 201, producto creado. |
| PUT | `/products/:id` | Administrador | 200, reemplazo de los cuatro campos del producto. |
| DELETE | `/products/:id` | Administrador | 204, producto y favoritos asociados eliminados. |
| GET | `/favorites` | Usuario autenticado, incluido administrador | 200, sus propios favoritos. |
| POST | `/favorites` | Usuario autenticado | 201, favorito creado. |
| DELETE | `/favorites/:productId` | Usuario autenticado | 204, su propio favorito eliminado. |

En el último endpoint se envía el **identificador del producto**, no un identificador de favorito. Si ese producto solo está en los favoritos de otra persona, devuelve 404 y conserva el favorito ajeno.

Las peticiones con cuerpo deben usar `Content-Type: application/json`. Las rutas protegidas requieren `Authorization: Bearer <token>`, obtenido del login. El servidor comprueba firma, algoritmo, emisor, audiencia, expiración y sujeto del JWT. Consulta el rol actual en la base de datos. Nunca acepta un `userId` del cliente para gestionar favoritos.

### Registro y login

```json
{
  "name": "Usuario de ejemplo",
  "email": "usuario@example.test",
  "password": "Una-Clave-Ficticia-2026"
}
```

Para iniciar sesión enviar únicamente `email` y `password`. La respuesta de registro es `{ "user": { "id", "name", "email", "role", "createdAt" } }`; la de login incluye además `token`, `tokenType: "Bearer"` y `expiresIn`. Los nombres entre comillas en esa descripción representan los campos, no un JSON literal. No se devuelven contraseñas ni hashes.

El registro público **rechaza** campos adicionales como `role`; no permite crear administradores. Los correos se recortan y convierten a minúsculas. Las contraseñas no se recortan y, al registrarse, deben tener de 12 caracteres a 72 bytes UTF-8. En el login, una contraseña no vacía pero incorrecta produce 401, aunque tenga menos de 12 caracteres.

### Crear o actualizar un producto

```json
{
  "name": "Cuaderno",
  "description": "Cuaderno ficticio de 100 hojas.",
  "category": "Papelería",
  "price": 3.75
}
```

Los cuatro campos son obligatorios también en `PUT`. `name`: 1–150 caracteres; `description`: 1–2000; `category`: 1–80, una vez recortados. `price` debe ser un número mayor que cero, máximo 9999999.99, con hasta dos decimales. No se admiten precios como texto ni campos adicionales.

Las consultas devuelven `{ "products": [...] }` o `{ "product": {...} }`. Un filtro sin coincidencias devuelve una lista vacía y 200. Una categoría con espacios debe codificarse en la URL, por ejemplo `Pruebas%20Postman`.

### Agregar un favorito

```json
{ "productId": 1 }
```

La respuesta contiene `{ "product": {...} }`; el listado devuelve `{ "favorites": [...] }` con los datos de producto y `favoritedAt`. `productId` admite un entero positivo o su representación decimal como texto; los identificadores deben ser enteros positivos seguros. No se admite `userId` ni otro campo adicional.

## Criterio de estados HTTP y errores

| Estado | Criterio |
| --- | --- |
| 200 | Consultas, login y actualización correctos. |
| 201 | Registro, creación de producto o favorito. |
| 204 | Eliminación correcta, sin cuerpo. |
| 400 | JSON inválido, campos obligatorios ausentes o vacíos, tipos, correo, precio o identificadores inválidos, campos y filtros no permitidos. Se usa 400 de manera uniforme en lugar de 422. |
| 401 | Credenciales incorrectas, falta de token, JWT inválido o vencido. |
| 403 | Usuario autenticado sin rol administrador intenta modificar el catálogo. |
| 404 | Producto, favorito propio o ruta inexistentes. |
| 409 | Correo duplicado o producto ya guardado por el mismo usuario. |
| 413 | Cuerpo mayor de 16 KB. |
| 500 | Fallo inesperado; mensaje genérico sin SQL, trazas ni secretos. |

Ejemplo de error:

```json
{
  "error": {
    "message": "Datos inválidos.",
    "details": [{ "field": "price", "message": "Debe ser un número mayor que cero, máximo 9999999.99 y con hasta dos decimales." }]
  }
}
```

## Pruebas automáticas

```bash
npm test
npm run test:postman
# O ejecutar ambas:
npm run check
```

No hace falta iniciar la API ni configurar `.env` para estas pruebas. Crean una base temporal, credenciales ficticias aleatorias y un servidor en un puerto libre; al finalizar lo detienen y eliminan únicamente sus archivos temporales. No modifican el catálogo local.

- `npm test`: 12 escenarios de integración (13 resultados contando la prueba principal), con peticiones HTTP reales, verificación del hash, firma JWT, roles, validaciones, restricciones, aislamiento, cascada y reinicio de Node.js.
- `npm run test:postman`: ejecuta **la colección exportada**, con 52 peticiones y 151 aserciones. Detiene Node.js entre las dos carpetas y crea un proceso nuevo con el mismo archivo SQLite. Comprueba usuario, producto actualizado y favorito persistidos. Genera `reports/postman-summary.json` sin tokens ni contraseñas.

Los resultados comprobados están en [docs/EVIDENCIAS.md](docs/EVIDENCIAS.md). GitHub Actions repite las pruebas en cada push y pull request.

### Ejecutar la colección en Postman

1. Ejecutar `npm run setup`, `npm run db:init` y `npm run postman:local`.
2. Importar `postman/catalogo.postman_collection.json` y el entorno generado `postman/entorno.local.json`. El archivo público `postman/ejemplo.postman_environment.json` se entrega sin secretos; para usarlo manualmente hay que completar sus valores locales.
3. Seleccionar ese entorno e iniciar la API con `npm start`.
4. En Collection Runner ejecutar **solo** la carpeta `01 - Antes del reinicio`, en orden y con una iteración. Permitir conservar los valores de variables al terminar. Crea cuentas A y B ficticias con correos distintos en cada ejecución y guarda sus tokens e identificadores en el entorno local.
5. Detener la API con `Ctrl+C` y volver a ejecutar `npm start`, sin volver a ejecutar `setup`, cambiar el secreto ni borrar la base. No volver a ejecutar la carpeta 01.
6. Ejecutar `02 - Después del reinicio` con el mismo entorno y sus variables conservadas. Comprueba la persistencia y completa la eliminación de favoritos y productos.
7. Revisar los resultados de cada petición en Postman. No publicar el entorno local ni exportar tokens o contraseñas. Eliminar sus valores al terminar si se va a compartir un entorno.

`postman:local` genera un JWT **firmado correctamente y ya vencido** usando el secreto local, sin exponer ese secreto en Postman. No existe una ruta de la API para emitir tokens vencidos. Repetir `postman:local` si cambia el administrador, el secreto o el puerto. Si pasa más de una hora entre carpetas, el login de A y del administrador renueva los tokens que usa la segunda fase.

Las pruebas del runner crean cuentas de demostración. La carpeta 02 elimina el producto de prueba; las cuentas ficticias permanecen al ejecutar manualmente sobre la base local. El runner automático usa una base temporal desechable.

### Dependencias de las pruebas

Se comprobó `npm audit --omit=dev` sin vulnerabilidades conocidas en las dependencias de ejecución. Newman 6.2.3 presenta avisos conocidos en dependencias transitivas de desarrollo (19 en la comprobación de esta entrega); se utiliza únicamente con la colección local incluida y no forma parte del servidor en ejecución. No aplicar `npm audit fix --force` indiscriminadamente: propone cambiar Newman por una versión anterior incompatible. Para instalar únicamente el servidor se puede usar `npm ci --omit=dev`.

## Repositorio y entrega

Entregar el código, `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, el SQL, la colección, el entorno público y este README. No publicar `.env`, `data/`, `node_modules/`, credenciales, tokens vigentes ni entornos locales. Las instrucciones para completar los datos de integrantes y registrar sus aportes reales están en [docs/ENTREGA.md](docs/ENTREGA.md).

Referencias oficiales: [Express](https://expressjs.com/en/5x/api/), [SQLite en Node.js](https://nodejs.org/api/sqlite.html) y [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).
