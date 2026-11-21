# Datos y aportes de los integrantes

La implementación y las pruebas están incluidas. Antes de la entrega académica, los integrantes deben completar sus nombres en el README y conservar un historial con contribuciones propias de ambos.

No basta con escribir dos nombres en un mensaje de commit. Tampoco se debe usar el correo de otra persona para atribuirle cambios que no realizó.

## Flujo sugerido

1. El primer integrante publica el repositorio como público y comparte su URL.
2. El segundo integrante lo clona, o hace un fork si no tiene acceso de escritura.
3. Cada integrante configura su propia identidad de Git. Para mantener el correo personal privado, puede usar su correo `noreply` proporcionado por GitHub.
4. Cada integrante realiza cambios propios verificables: por ejemplo, uno revisa y mejora la API y otro ejecuta los casos de Postman, incorpora evidencias observadas o mejora documentación y pruebas.
5. Cada uno crea sus commits y los sube. Si trabaja desde un fork, abre un pull request y se conservan sus commits al integrarlo.
6. Comprobar el historial con `git log --format="%h %an %s"` y los resultados de GitHub Actions.

## Publicación desde una terminal autenticada

Si el repositorio local todavía no tiene remoto:

```bash
gh auth login
gh repo create S10-TAREA_2 --public --source=. --remote=origin --push
```

Si ya se creó un repositorio vacío en GitHub, configurar su URL real y subir la rama:

```bash
git remote add origin https://github.com/TU_USUARIO/S10-TAREA_2.git
git push -u origin main
```

Si el remoto contiene un README inicial, primero integrar ese commit con `git pull --rebase origin main` y resolver cualquier conflicto conservando la documentación completa. No usar un push forzado para descartar un historial existente.

## Archivos que se deben entregar

- Código en `src/`, SQL en `sql/` y scripts en `scripts/`.
- `package.json` y `package-lock.json`.
- `.gitignore` y `.env.example`, con secretos vacíos.
- `postman/catalogo.postman_collection.json`.
- `postman/ejemplo.postman_environment.json`, sin tokens ni contraseñas.
- README con los nombres reales de ambos integrantes y documentación reproducible.
- Historial auténtico de contribuciones y enlace al repositorio público.

Los archivos locales privados y las bases de datos no forman parte de la entrega.
