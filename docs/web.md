# La web: edición diaria

> Volver al [README](../README.md)

Cada día el workflow **04** convierte los casos del día en una **edición** de la publicación y genera **un único archivo** `web/index.html`, estilo periódico, con todas las ediciones. Se abre con doble clic (`file://`), sin servidor ni internet: CSS y JS van dentro, no carga nada externo y no usa imágenes de terceros.

## Cómo funciona

```
hoja "casos" ──► 04 · editor jefe (IA) ──► data/ediciones/AAAA-MM-DD.json ──► node web/build.mjs ──► web/index.html
                  (elige portada, redacta                 (edición completa,            (plantilla + últimas N ediciones
                   titulares y análisis)                   validada)                      + nombre y opciones de parametros.json)
```

- **La IA no escribe URLs, medios, fechas ni puntuaciones.** El editor devuelve solo la selección (portada, destacadas, señales débiles), los textos y el análisis; n8n copia el resto de los casos por su `id` y calcula las cifras. Un enlace inventado es imposible.
- **Una noticia por historia.** Si varios medios cuentan lo mismo (el editor lo indica en `historias_repetidas` y, como red de seguridad, el código agrupa casos de la misma empresa con títulos muy parecidos), se publica una sola noticia con las demás como «También en: …».
- **Las señales débiles las decide el código**, no la IA: casos **muy novedosos** (novedad 4-5) que aún tienen **poca evidencia** (evidencia ≤ 3) o son solo un anuncio. Lo poco novedoso y poco probado se considera ruido y no se destaca. Cada señal muestra su motivo y una línea **«Qué vigilar»** que redacta el editor. Máximo 6 al día; si no hay ninguna, la sección no aparece.
- **Las cifras las calcula el código** (noticias, medios distintos, índice medio, madurez, tipo de afirmación).
- **Relevancia en tres niveles, con palabras:** *Muy relevante* (índice ≥ 75), *Relevante* (60-74) y *De interés* (< 60), con un indicador de barras. El índice 0-100 (mezcla de impacto, novedad, replicabilidad y evidencia) se ve al pasar el ratón; en el JSON se guardan `puntuacion_100` y `puntuacion` (1-5 = índice ÷ 20). La portada solo puede ser un caso *muy relevante* con evidencia sólida; si no hay ninguno, abre con el mejor y el análisis lo dice.
- **Tipo de afirmación** (hecho confirmado / afirmación de la empresa / opinión): lo decide el editor leyendo el resumen y la evidencia; en duda, «afirmación de la empresa».
- El workflow corre a las **07:40**, después del 01 (07:00) y, los lunes, del informe semanal (07:30). Si no hay casos nuevos, no hay edición y te avisa por Telegram.

## Generar y abrir la web

```bash
node web/build.mjs                 # genera web/index.html
node web/build.mjs --con-ejemplos  # mezcla las ediciones de ejemplo (solo para probar el diseño)
node web/build.mjs --sin-ejemplos  # falla si no hay ediciones reales
```

Por defecto usa las ediciones reales y, si todavía no hay ninguna, las 7 **de ejemplo** (ficticias, con un banner rojo "DATOS DE EJEMPLO"). Abre `web/index.html` con doble clic. El selector de la cabecera y el archivo permiten ver cualquier edición anterior.

Regenerar los ejemplos: `node scripts/web/generar_ejemplos.js`. Revisar la web en un navegador real (capturas, escritorio y móvil, efectos de scroll, consola): `node scripts/web/revisar_web.mjs [carpeta]`.

## Cambiar el nombre, el eslogan y otras opciones

Todo sale de [`config/parametros.json`](../config/parametros.json); tras cambiarlo, vuelve a ejecutar `node web/build.mjs`:

| Campo | Qué es |
|---|---|
| `publicacion.nombre` | Nombre completo (título, cabecera, pie, Telegram). |
| `publicacion.nombre_corto` | Versión corta (barra compacta al hacer scroll, notificaciones). |
| `publicacion.slug` | Identificador sin espacios ni tildes. |
| `publicacion.eslogan` | Frase bajo el nombre. |
| `publicacion.primera_edicion` | Fecha de la edición nº 1 (el número = días desde esa fecha + 1). |
| `web.ediciones_embebidas` | Cuántas ediciones lleva incrustadas el HTML (por defecto 90; límite de 5 MB). |
| `web.indexable` | `false` añade `noindex` y `robots.txt`. **Reduce la visibilidad, pero no hace la web privada.** |
| `web.destino` | `local` o `github_pages` (ver abajo). |
| `modelos.editor` | Modelo del editor jefe, por proveedor (Gemini gratis por defecto). |

Las ediciones completas viven en `data/ediciones/AAAA-MM-DD.json` (las reales no se suben a GitHub: están en `.gitignore`; solo los ejemplos).

Para reconstruir la edición de un día pasado, pon `web.fecha_edicion_forzada` en `"AAAA-MM-DD"`, ejecuta el workflow 04 a mano y vuelve a dejarlo en `null`. En ese modo entran los casos ingeridos ese día **y** los publicados ese día.

**Fuentes:** `config/fuentes.json` incluye feeds sectoriales (banca, salud, energía, industria, logística, construcción, agricultura, sector público, educación, retail, turismo, aeroespacial y defensa, RR. HH. y legal). Antes de fiarte de un feed nuevo, pruébalo en n8n: que `curl` funcione no garantiza que el nodo RSS Read lo haga.

**Reconstrucciones sin aviso:** con `web.silencioso = true` el workflow 04 no envía el mensaje de Telegram (útil al rehacer ediciones pasadas).

**Cuota de Gemini:** el editor usa un modelo Flash completo (20 peticiones al día en la capa gratuita, por modelo). Si se agota, cambia `modelos.editor.gemini` por otro modelo con cuota disponible; el workflow ya reintenta una vez y avisa por Telegram si no puede.

## Ejecución en Docker

El nodo **Construir web** usa el nodo *Execute Command* de n8n, desactivado por defecto: `docker-compose.yml` lo activa con `NODES_EXCLUDE=[]`, y monta `data/` y `web/` con escritura (más `scripts/` en solo lectura, porque `build.mjs` reutiliza el validador). Tras actualizar el compose: `docker compose up -d`.

## Destino: local o GitHub Pages

**Local (por defecto):** no se publica nada. El workflow termina con el aviso de Telegram.

**GitHub Pages:** usa un repositorio **solo para la web** (`web.repo`, distinto del repositorio del proyecto) y publica únicamente `index.html`, `.nojekyll` y `robots.txt`; nunca `data/`, `config/`, `prompts/` ni `workflows/`.

> ⚠️ **GitHub Pages es público en las cuentas gratuitas:** cualquiera con el enlace verá la web. `noindex` evita que los buscadores la indexen, pero no la hace privada. Aunque cada edición solo contiene resúmenes propios con enlace a la fuente, piensa si quieres que sea pública.

Para activarlo, paso a paso:

1. Crea el repositorio de la web (vacío) y activa *Settings → Pages → Deploy from a branch → `main` / root*.
2. En n8n crea una credencial **GitHub API** (token con permiso de escritura solo en ese repositorio). El token nunca va en archivos.
3. En `config/parametros.json`: `web.destino = "github_pages"`, `web.propietario`, `web.repo`, `web.rama`.
4. En el workflow 04, **activa** los nodos grises (*Leer web generada → Comprobar bloqueo → Preparar archivos a publicar → Obtener sha actual → Subir archivo a GitHub*) y asigna la credencial GitHub a los dos nodos HTTP.
5. Ejecútalo a mano una vez y comprueba la URL pública (`https://<propietario>.github.io/<repo>/`).

**Bloqueo de seguridad:** el nodo *Comprobar bloqueo* se niega a continuar si la web generada incrusta alguna edición con `"es_ejemplo": true`, si `web.destino` no es `github_pages` o si faltan `propietario`/`repo`. Los datos de ejemplo nunca se publican.

Para volver a local: `web.destino = "local"` y desactiva de nuevo esos nodos.

## Qué transmite la página (calidad y transparencia)

- **Lo esencial de hoy:** tres frases para quien solo tiene 30 segundos.
- **Enlace real a cada noticia**, siempre visible («Leer la noticia original en <dominio> ↗»), con medio y fecha de la fuente; las fuentes que son comunicados de empresa llevan la etiqueta *Comunicado*.
- **Cobertura en la cabecera:** fuentes monitorizadas, regiones, noticias y medios de la edición y cuándo se generó (salen de `config/fuentes.json` y de la edición).
- **Metodología** (al final de la página): qué se publica, de dónde sale, cómo se puntúa (con los pesos de `pesos_puntuacion`), qué significa cada etiqueta, qué hace la IA y qué no, y las limitaciones. Si pones `publicacion.contacto` en `parametros.json`, aparece un correo para avisar de errores.
- **Imprimir / PDF** y **Descargar** la edición en JSON.

## Diseño

Periódico serio y legible: titulares en serif, texto en sans, rejilla de columnas, modo claro y oscuro (botón *Tema*; respeta el del sistema), responsive y accesible (contraste, foco visible, navegación por teclado, `prefers-reduced-motion`).

- **Escena fija «Lo más importante de hoy»:** capítulos numerados (activo / pasado / pendiente) que cambian con el scroll. En móvil se apilan como una lista normal.
- **Lista por sectores con vista previa:** al pasar el ratón por una noticia se expande y el panel lateral muestra su detalle; en móvil, por toque.
- **Cifras del día, señales débiles, «Qué significa hoy» y archivo** con buscador y filtros por sector, tipo de innovación y nota mínima.

Cada noticia lleva medio, fecha y enlace a la fuente. Pie: «Resúmenes generados con IA a partir de fuentes enlazadas; verifica en la fuente original.»
