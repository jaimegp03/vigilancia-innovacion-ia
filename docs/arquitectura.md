# Arquitectura y decisiones de diseño

> Volver al [README](../README.md)

## Qué hace cada workflow

| Workflow | Cuándo | Qué hace |
|---|---|---|
| [`01_ingesta_diaria`](../workflows/01_ingesta_diaria.json) | Todos los días, 07:00 | Lee los feeds RSS → filtra por fecha y palabras clave → deduplica → descarga el artículo → **IA de extracción** → **IA de clasificación y puntuación** → guarda en la hoja `casos` → registra la ejecución en `log_ejecuciones` → **aviso diario por Telegram** (casos nuevos y balance; si Telegram falla, la ejecución no se ve afectada). |
| [`02_informe_semanal`](../workflows/02_informe_semanal.json) | Lunes, 07:30 | Lee los casos de los últimos 7 días → **IA de tendencias** (una sola llamada) → hoja `tendencias` → para los 5 casos mejor puntuados, **IA de redes** (uno por caso) → hoja `borradores_redes` → resumen y borradores por **Telegram**. |
| [`04_edicion_diaria`](../workflows/04_edicion_diaria.json) | Todos los días, 07:40 | Casos del día → **IA editor jefe** (portada, destacadas, titulares, análisis) → n8n ensambla la edición con los datos reales de los casos → `data/ediciones/AAAA-MM-DD.json` → `node web/build.mjs` → `web/index.html` → aviso por Telegram. Detalles en [web.md](web.md). |
| [`03_descubrimiento_semanal`](../workflows/variante_claude/03_descubrimiento_semanal.json) *(opcional, solo con Claude)* | Miércoles, 09:00 | **Búsqueda web** con Claude por región × tipo de innovación, **fuera** de las fuentes de `fuentes.json`; lo encontrado pasa por la misma cola que el workflow 01. |

**Reparto de trabajo.** n8n hace todo lo que no necesita IA (programar, leer feeds, filtrar, deduplicar, descargar, guardar, notificar). El modelo de IA interviene solo en tareas con su prompt corto y salida en JSON estricto, validada contra [`schemas/caso.schema.json`](../schemas/caso.schema.json):

| Tarea | Prompt | Modelo con Gemini (por defecto) | Modelo con Claude |
|---|---|---|---|
| Extracción | [`prompts/extraccion.md`](../prompts/extraccion.md) | `gemini-3.5-flash-lite` | `claude-haiku-5-5` |
| Clasificación y puntuación | [`prompts/clasificacion.md`](../prompts/clasificacion.md) | `gemini-3.1-flash-lite` | `claude-sonnet-5-5` |
| Tendencias semanales | [`prompts/tendencias.md`](../prompts/tendencias.md) | `gemini-3.5-flash` | `claude-opus-5-5` |
| Borradores para redes | [`prompts/redes.md`](../prompts/redes.md) | `gemini-3.5-flash` | `claude-sonnet-5-5` |
| Editor jefe (edición diaria) | [`prompts/editor.md`](../prompts/editor.md) | `gemini-3.6-flash` | `claude-sonnet-5-5` |
| Búsqueda web (solo workflow 03) | [`prompts/busqueda.md`](../prompts/busqueda.md) | — | `claude-sonnet-5-5` |

Los modelos de Gemini son los de la capa gratuita según la documentación de Google consultada al preparar el proyecto; **comprueba en Google AI Studio que siguen disponibles** y cámbialos en `config/parametros.json` si hace falta (ver [Otras configuraciones útiles](configuracion.md#otras-configuraciones-útiles)).

Los prompts piden datos y resúmenes **con palabras propias**; nunca copiar párrafos del artículo. El texto de los artículos no se guarda: solo los datos extraídos, el resumen propio y el enlace.

## Estructura

```
docker-compose.yml        n8n en local con volumen persistente
.env.example              variables de entorno (sin claves)
config/
  fuentes.json            fuentes RSS (nombre, tipo, región, idioma, feed_url, dominio, acceso, activa, nota)
  parametros.json         fase, sector, ventanas, palabras clave, modelos por proveedor, hojas, límites
  descubrimiento.json     consultas del workflow 03 (regiones × tipos de innovación)
schemas/caso.schema.json  esquema del caso, de las tendencias y de los borradores
prompts/                  un prompt por tarea de IA
workflows/                workflows de n8n con Gemini, listos para importar
workflows/variante_claude/  los mismos con Claude (incluye el 03)
workflows/utilidades/     workflow de un solo uso para dar formato a las hojas de Google Sheets
plantilla_sheets/         cabeceras CSV de las 5 hojas de Google Sheets
tests/                    versiones de prueba (IA simulada), pruebas unitarias y resultados paso a paso
scripts/                  generadores de los workflows, validadores y utilidades
```

## Cómo funciona por dentro (para modificar)

Los nodos de código de n8n están en `scripts/nodos_01/`, `nodos_02/`, `nodos_03/` (y utilidades en `nodos_comun/`); los workflows se **generan** a partir de ellos:
```bash
node scripts/generar_workflow_01.js
node scripts/generar_workflow_02.js
node scripts/generar_workflow_03.js
```
Esto reescribe `workflows/` (Gemini), `workflows/variante_claude/` y los `tests/**/*.test.json`. Si prefieres editar solo en la interfaz de n8n, funciona igual; pero entonces los generadores ya no reflejarían tu versión.

Decisiones de diseño relevantes:
- **Lotes y concurrencia.** Los feeds RSS se procesan de uno en uno; las descargas de artículos van en lotes de 5 con 1,5 s de pausa; las llamadas a Gemini van de una en una con una pausa por tarea (4,5 s en extracción y clasificación, 13 s en tendencias y borradores, según los RPM de cada modelo; las de Claude, secuenciales).
- **Gemini por llamada HTTP.** Con Gemini, el nodo de IA es un nodo HTTP Request a la API REST de Google (con la credencial de Gemini): así se pueden espaciar las llamadas y pedir JSON puro (`responseMimeType`). Con Claude se usa el nodo nativo de Anthropic.
- **Validación y reintento.** Cada respuesta de IA se valida contra el esquema. Si la extracción falla, se reintenta **una vez** indicando el fallo; si vuelve a fallar, el artículo va a la hoja `descartados` con el motivo. Una clasificación inválida va directamente a `descartados`. Un fallo de la API (sin respuesta) no cuenta como artículo inválido: se omite y se reintenta otro día.
- **No se repite trabajo.** Se deduplica por URL normalizada (sin `utm_*`, `www`, fragmento ni barra final) contra las hojas `casos` **y** `descartados`: un artículo rechazado no se vuelve a pagar al día siguiente.
- **Acceso parcial.** Si la descarga falla, hay paywall o el texto es muy corto (< 800 caracteres), se usa solo titular y resumen del feed y el caso queda marcado `acceso: parcial` y con confianza baja.
- **Un feed que falla no para el resto.** Los errores se registran en `log_ejecuciones`, que se escribe siempre, aunque no se guarde ningún caso.
- **Los borradores nunca se publican solos.** Quedan en `borradores_redes` con estado `pendiente_revision` (o `revisar_formato` si algo no cuadra, por ejemplo falta la URL de la fuente).
- **Sin temperatura.** Los nodos no fijan `temperature`: algunos modelos recientes no la admiten y la validación JSON cubre la variabilidad.

## Diseño de la edición diaria (workflow 04)

- **Reparto IA / código.** La IA hace lo que requiere lenguaje: elegir portada y destacadas, redactar titulares, entradillas, impacto prudente, «qué vigilar», tres claves y el análisis. El código hace lo que debe ser objetivo y reproducible: copiar enlaces, medios, fechas y puntuaciones de los casos, agrupar la misma historia, decidir las señales débiles, calcular las cifras, validar y escribir los archivos.
- **Validación en capas.** La salida del editor se valida contra `schemas/edicion.schema.json` (`editor_salida`), se podan los campos no pedidos, se descartan ids inventados y se reintenta una vez; la edición ensamblada se valida de nuevo (`edicion`) y toda noticia real debe tener un enlace http(s). Si algo no cuadra, se avisa por Telegram y no se publica nada a medias.
- **Agrupación de historias.** El editor indica los casos que cuentan lo mismo y, como red de seguridad, el código une los de la misma empresa con títulos muy parecidos; queda una noticia con «otras fuentes».
- **Señales débiles.** Novedad ≥ 4 con evidencia ≤ 3 o solo un anuncio; lo poco novedoso y poco probado no se destaca. Máximo 6.
- **Relevancia.** Índice 0-100 (impacto 35 %, novedad 25 %, replicabilidad 20 %, evidencia 20 %) mostrado en tres niveles: ≥ 75 *muy relevante*, 60-74 *relevante*, < 60 *de interés*.
- **Un solo archivo.** `web/build.mjs` incrusta las últimas N ediciones en `web/plantilla.html` (sin red, sin CDN) y, si supera 5 MB, deja fuera las más antiguas. Los datos se escapan al incrustarlos.
- **Publicación opcional y bloqueada por defecto.** Los nodos de GitHub Pages están desactivados y un bloqueo impide publicar cualquier edición de ejemplo.
