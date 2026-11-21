# Evidencias de verificación

Verificación local realizada el 20 de noviembre de 2026 (America/Guayaquil), con Node.js 24.19.0.

## Resultados observados

| Comprobación | Resultado |
| --- | --- |
| `npm test` | 13 pruebas correctas, 0 fallidas (12 escenarios y la prueba principal). |
| `npm run test:postman` | 52 peticiones, 151 aserciones correctas, 0 fallidas. |
| Reinicio real | Se detuvo el proceso Node.js y se inició otro con el mismo archivo SQLite. |
| Persistencia tras reinicio | Login de A correcto, producto con su precio actualizado y favorito de A conservados. |
| Aislamiento | B recibió lista vacía y 404 al intentar quitar el favorito de A; A conservó su favorito. |
| Integridad | Borrado de producto eliminó sus favoritos; `PRAGMA foreign_key_check` no encontró referencias inválidas. |
| Hash de contraseña | Se comprobó que la contraseña almacenada es un hash bcrypt verificable. |
| Dependencias de ejecución | `npm audit --omit=dev`: 0 vulnerabilidades conocidas. |

## Casos de Postman

| Requisito | Peticiones de la colección |
| --- | --- |
| Registro, login, duplicados y credenciales incorrectas | 02–12. |
| Registro no permite asignarse administrador | 04. |
| CRUD como administrador, consulta y filtro | 27–30 y 50–51. |
| Validación de precios, textos e identificadores | 05–07 y 19–26. |
| 401 sin token o con JWT realmente vencido | 13–15. |
| 403 con rol usuario | 16–18. |
| Favoritos: crear, consultar, quitar, 409 y 404 | 31–33, 35, 39–41 y 46–47. |
| Identidad solo del token y aislamiento A/B | 34–38 y 42. |
| Reiniciar y verificar persistencia | Entre carpetas 01 y 02; comprobaciones 43–45. |
| Eliminación en cascada | 48–52. |

## Reproducción

```bash
npm ci
npm run check
```

El runner automático escribe un resumen sin información sensible en `reports/postman-summary.json`. El resumen de referencia fue:

```json
{
  "result": "PASS",
  "requests": 52,
  "assertions": 151,
  "failures": 0,
  "restart": "Proceso detenido y proceso nuevo iniciado con el mismo archivo SQLite.",
  "persistence": [
    "usuario A e inicio de sesión",
    "producto actualizado",
    "favorito de A"
  ],
  "isolation": "B no ve ni puede quitar el favorito de A; A lo conserva.",
  "cascade": "Al eliminar el producto se elimina su favorito."
}
```

Estas evidencias documentan una ejecución automatizada real de la colección mediante Newman. La ejecución manual en la aplicación Postman se reproduce con los pasos del README; no se afirman capturas ni resultados manuales que no se hayan observado.
