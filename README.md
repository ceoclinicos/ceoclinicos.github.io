# CEO Clínicos – Sitio web (ceoclinicos.github.io)

Sitio estático para **https://ceoclinicos.github.io**. Incluye barra superior (equivalente al bottom bar de MainActivity) y página principal con botones de materias.

## Contenido compartido con la app (banco de preguntas y temas)

El **mismo repositorio** es la fuente única para la web y para la app:

- **Web:** carga `temas/temas.json` y, si quieres, los JSON de preguntas desde el mismo origen (ej. `temas/es/`, `questions/es/categories/`).
- **App (clinicos):** usa `ContentCacheHelper` con la URL Raw del repo (ej. `https://raw.githubusercontent.com/ceoclinicos/ceoclinicos.github.io/main/`) para descargar los mismos archivos.

Estructura del repo (igual que en la app y en CONTENT_SYNC_GITHUB.md):

```
ceoclinicos.github.io/
├── index.html, styles.css, app.js, content-paths.js, temas-data.js
├── version.json
├── manifest.json
├── temas/
│   ├── temas.json
│   ├── es/
│   │   ├── hipertension_arterial_questions.json
│   │   └── ...
│   ├── en/
│   └── pt/
└── questions/
    └── es/ (en, pt)/
        └── categories/
            ├── cardiologia_questions.json
            ├── true_false_general_questions.json
            └── ...
```

Las **rutas y “funciones”** son las mismas: en la web `content-paths.js` expone `ContentPaths.temasCatalog()`, `ContentPaths.temaQuestions(topicId, lang)`, `ContentPaths.categoryQuestions(category, lang)`, `ContentPaths.trueFalseQuestions(category, lang)` para construir las URLs a los JSON. La app usa `ContentCacheHelper.openPath(context, path)` con esas mismas rutas relativas. Así ambos comparten el banco de preguntas y las carpetas de temas.

**Para que la app use este mismo repo:** en el proyecto clinicos configura la URL base al repo (por ejemplo en `ContentCacheHelper.kt` o en el `Application`):

```kotlin
ContentCacheHelper.baseRawUrl = "https://raw.githubusercontent.com/ceoclinicos/ceoclinicos.github.io/main/"
```

Así la app descargará `temas/temas.json`, `temas/es/...`, `questions/...` desde el mismo sitio que la web.

## Cómo publicar en GitHub Pages

### 1. Repositorio con nombre exacto

- Entra en tu cuenta **ceoclinicos** en GitHub.
- Crea un repositorio nuevo **o** renombra el existente:
  - **Nombre del repositorio:** `ceoclinicos.github.io` (exactamente así).
- Si renombras: **Settings** → **Repository name** → `ceoclinicos.github.io` → **Rename**.

### 2. Subir el contenido de esta carpeta

Desde la carpeta del proyecto (donde está `website_clinicos`):

```bash
cd website_clinicos
git init
git add .
git commit -m "Sitio CEO Clínicos"
git branch -M main
git remote add origin https://github.com/ceoclinicos/ceoclinicos.github.io.git
git push -u origin main
```

Si el repo ya existe y solo quieres actualizar:

```bash
cd website_clinicos
git add .
git commit -m "Actualizar sitio"
git push
```

### 3. Activar GitHub Pages

- En el repo **ceoclinicos.github.io** → **Settings** → **Pages**.
- **Source:** Deploy from a branch.
- **Branch:** `main` (o `master`) → carpeta `/ (root)`.
- Guardar. En unos minutos el sitio estará en **https://ceoclinicos.github.io**.

---

## Imágenes (opcional)

La web usa **emojis** en la barra superior (🏠 📚 🧮 🩺 🤖 📄). No es obligatorio copiar iconos de la app.

Si quieres usar los **mismos iconos que la app**, copia estos drawables desde el proyecto Android a `website_clinicos/images/`:

| En la app (res/drawable o drawable-*) | Copiar como (en website_clinicos/images/) |
|--------------------------------------|-------------------------------------------|
| `btn_inicio` (png o xml)             | `btn_inicio.png`                          |
| `btn_estudiar`                       | `btn_estudiar.png`                        |
| `btn_calcular`                       | `btn_calcular.png`                        |
| `btn_asistente`                      | `btn_asistente.png`                       |
| `ia_btn`                             | `ia_btn.png`                              |
| `ic_diagnostico` (Generar Guía)      | `ic_diagnostico.png`                      |

**Cómo copiar:**

1. En Android Studio: **res** → clic derecho en **drawable** (o en cada `drawable-*`) → **Show in Explorer**.
2. Localiza los archivos (pueden ser `.png` o `.xml`; si es XML vectorial, exporta a PNG o usa el SVG si lo tienes).
3. Cópialos a `website_clinicos/images/` con los nombres de la tabla.
4. En `index.html` sustituye los `<span class="nav-icon">...</span>` por `<img src="images/btn_inicio.png" alt="Inicio" class="nav-icon">` (y así para cada ítem), y en CSS ajusta `.nav-icon` para tamaño de imagen si hace falta.

Si algún drawable es solo XML (vector), en **File → Export** puedes generar PNG, o usar una herramienta online para convertir XML vector a PNG.

---

## Estructura del sitio

- `index.html` – Página principal, barra superior y secciones (Inicio, Estudiar, Calcular, Diagnóstico, IA, Generar Guía).
- `styles.css` – Estilos y colores de la app (primary #2196F3).
- `app.js` – Dibuja el grid de materias y la navegación entre secciones.
- `temas-data.js` – Lista de materias (puedes sincronizarla con `app/src/main/assets/temas/temas.json` cuando actualices temas).

Las materias con guía (por ejemplo Hipertensión, Colecistitis) enlazan al PDF de Dropbox; el resto enlaza a `#` (pensado para que en el futuro enlacen a la app o a más contenido).
