# Guía para grabar la demostración de la API

Duración prevista: entre 3 y 4 minutos. Se muestran autenticación JWT, roles, productos, favoritos, aislamiento y un reinicio real de Node.js. Al final se explica un aporte personal y la solución que mantiene separados los favoritos.

## Qué quedó preparado

- `npm run video` abre una demostración guiada en seis pantallas. Pulsar Enter ejecuta cada etapa y mantiene los resultados visibles mientras se explican.
- Las peticiones se envían por HTTP al código real de `src/`. Los códigos HTTP y los datos visibles provienen de sus respuestas; el programa se detiene si un resultado no coincide con lo esperado.
- Crea un administrador y usuarios A y B ficticios en una base SQLite nueva dentro de `data/video/`, independiente de `data/catalog.sqlite`.
- El servidor se inicia en un puerto libre y se cierra al terminar. No hay que ejecutar `npm start` aparte.
- Contraseñas, secretos y valores de JWT permanecen ocultos. Se muestran roles, vencimiento, identificadores, precios y favoritos.
- Cada ensayo comienza en una carpeta nueva; no hace falta limpiar datos. El archivo SQLite del ensayo permanece en `data/video/`.
- `npm run video:check` ejecuta lo mismo sin pausas para comprobar que funciona. La demostración contiene 23 peticiones verificadas, además de la preparación de las cuentas.

Para esta grabación se utiliza la terminal de VS Code. La colección de Postman del trabajo sigue en `postman/catalogo.postman_collection.json` y se ejecuta con `npm run test:postman`.

## Preparación antes de grabar

1. Abrir Visual Studio Code desde el menú Inicio de Windows.
2. En VS Code, elegir **Archivo > Abrir carpeta** (`File > Open Folder`), seleccionar `C:\desarrolloweb\S10-TAREA_2` y pulsar **Seleccionar carpeta**.
3. Elegir **Terminal > Nueva terminal** (`Terminal > New Terminal`). La terminal es el panel inferior donde se escriben comandos.
4. Hacer clic dentro del panel y escribir lo siguiente, pulsando Enter después de cada línea:

   ```powershell
   cd C:\desarrolloweb\S10-TAREA_2
   npm run video
   ```

5. Esperar a que aparezca **LISTO** y **Pulsa Enter para mostrar 1/6**. En este punto la preparación terminó y la demostración espera.
6. Agrandar el panel arrastrando su borde superior hacia arriba. El texto de la primera etapa debe caber y leerse con claridad. Si hace falta, ampliar VS Code con **Ver > Apariencia > Acercar** (`View > Appearance > Zoom In`).
7. Ensayar una vez: pulsar Enter, leer la explicación de esa pantalla y volver a pulsar Enter para avanzar. Al finalizar, pulsar Enter para cerrar el servidor.
8. Repetir `npm run video` para comenzar una grabación desde cero. No se necesita copiar tokens, escribir contraseñas ni importar archivos para esta modalidad.

No hay que escribir los comandos que aparecen como `POST`, `GET`, `PUT` o `DELETE`: la demostración los ejecuta. Son los métodos HTTP que indican crear, consultar, actualizar y eliminar.

## Cómo grabar pantalla y voz

En Windows 11 se puede utilizar Recortes:

1. Dejar VS Code mostrando la pantalla **LISTO**, antes de la primera etapa.
2. Pulsar **Windows + Mayús + R**. Mayús es la tecla Shift.
3. Arrastrar para seleccionar la zona de VS Code que contiene la terminal.
4. Activar el micrófono en la barra de grabación, si aparece desactivado. Hacer una prueba de cinco segundos y reproducirla para comprobar que la voz se escucha.
5. Pulsar **Iniciar**. Esperar la cuenta atrás y hacer clic otra vez dentro de la terminal.
6. Presentar el proyecto y seguir las seis etapas que se indican más abajo.
7. Al terminar de hablar, pulsar **Detener** en la barra de Recortes y guardar el archivo como `Demostracion_API.mp4`.
8. Reproducir el video y comprobar que se leen los resultados, se escucha la voz y dura menos de cinco minutos.

El acceso directo, la selección del área y los botones Iniciar y Detener están descritos en la [ayuda oficial de Microsoft](https://support.microsoft.com/es-es/windows/apps/use-snipping-tool-to-capture-screenshots). Si no aparece el acceso directo, abrir Recortes desde Inicio y elegir **Grabar > Nuevo**.

## Guion con acciones y tiempos

Los tiempos son orientativos. Si una explicación requiere unos segundos más, mantener la pantalla y continuar; el programa no avanza por sí solo. No leer todos los datos de la pantalla: señalar el resultado principal con el cursor y explicarlo.

### Presentación de 0 a 12 segundos

**Acción:** iniciar la grabación en la pantalla LISTO. Todavía no pulsar Enter.

**Mostrar:** el título de la demostración y que las cuentas y el servidor están preparados.

**Decir:**

> Voy a demostrar una API REST desarrollada con Node.js, Express y SQLite. Este programa envía peticiones reales al servidor y muestra los resultados de autenticación, productos y favoritos.

### Pantalla 1 de 12 a 45 segundos

**Acción:** hacer clic en la terminal y pulsar Enter una vez.

**Mostrar:** `1/6`, los tres logins con `HTTP 200`, los roles, `expiresIn: 1h`, los dos `401` y el `403`.

**Decir:**

> El administrador y los usuarios A y B inician sesión y reciben un JWT válido por una hora. El servidor verifica la firma y el vencimiento. Sin token, o con uno vencido, responde 401. Cuando A intenta crear un producto responde 403, porque solo el administrador puede modificar el catálogo.

**Código que respalda la explicación:** `src/controllers/auth.controller.js`, función `login`, emite el token mediante `jwt.sign`. `src/middleware/auth.js` lo comprueba con `jwt.verify` y exige el rol administrador. No es necesario abrir esos archivos durante la grabación.

### Pantalla 2 de 45 a 68 segundos

**Acción:** pulsar Enter una vez.

**Mostrar:** `2/6`, creación con `201`, precio inicial `10`, actualización con `200`, precio `15.5` y consulta pública con `200`.

**Decir:**

> Con el token del administrador creo un producto y recibo 201. Después actualizo su precio de diez a quince dólares con cincuenta centavos. La consulta devuelve 200 y muestra el cambio. La consulta del catálogo es pública. Dejo la eliminación para el final, después de verificar la persistencia.

`15.5` y `15.50` representan el mismo valor numérico. El identificador del producto aparece en la respuesta y en la ruta; no hay que escribirlo.

### Pantalla 3 de 68 a 94 segundos

**Acción:** pulsar Enter una vez.

**Mostrar:** `3/6`, favorito agregado con `201`, lista con el producto, eliminación con `204`, lista vacía `[]` y el favorito agregado nuevamente.

**Decir:**

> El usuario A agrega el producto a sus favoritos y recibe 201. Al consultar, el producto aparece en su lista. Después lo quita con una respuesta 204 y la lista queda vacía. Lo agrego nuevamente para comprobar el aislamiento y la persistencia en las siguientes etapas.

### Pantalla 4 de 94 a 122 segundos

**Acción:** pulsar Enter una vez.

**Mostrar:** `4/6`, B recibe `favorites: []`, su intento de borrado recibe `404`, y A conserva el producto.

**Decir:**

> Ahora utilizo el token de B. Su lista está vacía y no puede quitar el favorito de A: recibe 404. Al consultar de nuevo como A, el favorito permanece. Esto demuestra que cada usuario solo puede acceder a sus propios favoritos. La identidad se obtiene del token verificado.

El 404 indica que ese favorito no existe **para B**. No implica que el producto haya desaparecido del catálogo.

### Pantalla 5 de 122 a 153 segundos

**Acción:** pulsar Enter una vez y esperar a que aparezcan las tres consultas posteriores al reinicio.

**Mostrar:** `5/6`, proceso Node.js detenido, proceso nuevo iniciado y los resultados de login, producto y favorito.

**Decir:**

> Aquí se detiene realmente el proceso de Node.js y se inicia otro, utilizando el mismo archivo SQLite. Los números de proceso son diferentes. Después del reinicio, A todavía puede iniciar sesión, el producto conserva el precio actualizado y su favorito sigue guardado. Así se comprueba la persistencia de la base de datos.

Los números de proceso cambian en cada ejecución. El script muestra los valores reales y verifica que sean distintos.

### Pantalla 6 de 153 a 195 segundos

**Acción:** pulsar Enter una vez. Mantener esta pantalla hasta terminar la explicación y detener la grabación.

**Mostrar:** `6/6`, eliminación del producto con `204`, consulta posterior con `404`, lista de favoritos vacía y los fragmentos de código.

**Decir:**

> Finalmente, el administrador elimina el producto y recibe 204. Al consultarlo devuelve 404 y también desaparece de los favoritos, porque la base de datos usa eliminación en cascada.
>
> Una dificultad técnica importante era impedir que un usuario borrara el favorito de otro. La solución utiliza `req.user.id`, obtenido del token, y una consulta SQL que exige tanto el usuario como el producto. Por eso el intento de B no elimina el favorito de A.

El programa muestra fragmentos leídos directamente de `src/controllers/favorites.controller.js` y `src/repositories/favorites.repository.js`. En particular:

```js
favorites.remove(req.user.id, productId)
```

```sql
DELETE FROM favorites WHERE user_id = ? AND product_id = ?
```

**Aporte personal:** después de realizar el ensayo y revisar los resultados, se puede cerrar con esta frase si describe lo que realmente se hizo:

> Mi aporte fue revisar el funcionamiento de la API y comprobar la autenticación, los permisos, el aislamiento y la persistencia mediante estas pruebas. Con esta demostración verifico que las operaciones responden según lo esperado.

Si tu aporte real fue otro, reemplazar esa frase por la actividad concreta realizada. No atribuirse implementación, errores anteriores o contribuciones de otro integrante que no se hayan realizado.

**Final:** detener la grabación. Luego volver a la terminal y pulsar Enter para cerrar el servidor. El resultado final correcto es **23 peticiones de la demostración verificadas; 6 etapas correctas**.

## Significado de los resultados

| Resultado | Cómo explicarlo |
| --- | --- |
| 200 | La consulta, el login o la actualización se realizaron correctamente. |
| 201 | Se creó un registro, como producto o favorito. |
| 204 | La eliminación se realizó correctamente y no devuelve cuerpo. |
| 401 | Falta un token válido o el token está vencido. |
| 403 | El usuario está autenticado, pero no tiene permiso para esa operación. |
| 404 | El recurso solicitado no existe para ese usuario o fue eliminado. |
| `[]` | Una lista vacía; por ejemplo, ese usuario no tiene favoritos. |
| PID o número de proceso | Identificador de una ejecución de Node.js; cambia al iniciar un proceso nuevo. |

## Si surge un problema

- **No se reconoce `npm`:** cerrar y abrir VS Code para que detecte Node.js instalado; comprobar `node --version`. El proyecto requiere Node.js 24.15 o superior.
- **No encuentra `package.json`:** ejecutar primero `cd C:\desarrolloweb\S10-TAREA_2`.
- **No encuentra las dependencias:** ejecutar `npm ci` y después `npm run video`.
- **Parece detenido en “Pulsa Enter”:** está esperando la explicación. Hacer clic en la terminal y pulsar Enter una vez.
- **La pantalla no cambia al pulsar Enter:** comprobar que el foco está en la terminal y no en Recortes ni en un archivo del editor.
- **El texto es pequeño:** agrandar la terminal antes de grabar y hacer una prueba corta de legibilidad.
- **Se interrumpe una ejecución:** pulsar Ctrl+C y ejecutar otra vez `npm run video`. Se crea una sesión limpia.
- **Una petición falla:** no afirmar que pasó. Revisar el mensaje y ensayar con `npm run video:check` antes de grabar.
- **Se cierra la terminal durante el ensayo:** volver a abrir una terminal y ejecutar `npm run video`; cada sesión usa un puerto libre.

## Comprobación antes de entregar el video

- Dura menos de cinco minutos y la voz se entiende.
- Se distinguen los roles y los resultados 401 y 403.
- Se ven creación, actualización y eliminación de un producto como administrador.
- Se ven agregar, consultar y quitar favoritos.
- B no ve ni puede quitar el favorito de A, y A lo conserva.
- Se ve un proceso detenido y otro iniciado, con datos conservados.
- Se explica el aporte real y la dificultad técnica de aislamiento con su solución.
- No se muestran `.env`, contraseñas ni valores de JWT.
