# Configuración y personalización

> Volver al [README](../README.md)

## Cómo cambiar a modo sectorial

Todo se hace en [`config/parametros.json`](../config/parametros.json):

1. `"fase": 2` y `"sector_foco": "banca_seguros"` (en lugar de `null`). Valores válidos: `banca_seguros`, `automocion`, `turismo_hosteleria`, `construccion_inmobiliario`, `gran_consumo_alimentacion`, `retail_comercio`, `salud_farma`, `energia_utilities`, `industria_manufactura`, `logistica_transporte`, `telecomunicaciones`, `educacion`, `sector_publico`, `medios_marketing`, `agricultura`, `tecnologia_software`, `otros`.
2. Opcional: añade a `palabras_clave_incluir` términos del sector (por ejemplo "seguros", "banca", "fintech") para afinar el filtro previo.

Qué cambia:
- **Clasificación:** el modelo puntúa `relevancia_sector` (0–5) de cada caso respecto al sector foco.
- **Informe semanal:** solo entran los casos del sector foco o con `relevancia_sector` ≥ `relevancia_sector_minima` (3 por defecto); los prompts de tendencias reciben el sector foco.
- **Workflow 03 (Claude):** las consultas de búsqueda incluyen el sector.
- **Workflow 01:** sigue guardando casos de todos los sectores (así no pierdes información si cambias de foco después); el filtrado sectorial se aplica en el informe.

Para mejores resultados, añade también fuentes especializadas del sector (siguiente apartado).

## Cómo añadir una fuente

1. **Comprueba que el feed funciona** (no inventes URLs):
   ```bash
   echo "Nombre|https://sitio.com/feed" > /tmp/f.txt
   bash scripts/validar_feeds.sh /tmp/f.txt
   ```
   Debe devolver `200` y un número de artículos mayor que cero con fechas recientes.
2. Añade una entrada a `config/fuentes.json`:
   ```json
   {
     "nombre": "Mi revista",
     "tipo": "revista",
     "region": "España",
     "idioma": "es",
     "feed_url": "https://sitio.com/feed",
     "dominio": "sitio.com",
     "acceso": "abierto",
     "activa": true,
     "nota": "",
     "verificado": "2026-10-16"
   }
   ```
   - `tipo`: `revista`, `medio_economico`, `consultora` o `nota_prensa`.
   - `acceso`: `abierto`, `paywall_parcial` o `sin_feed`.
   - `dominio`: dónde se publican los artículos (lo usa el workflow 03 para buscar *fuera* de tus fuentes).
   - Si no funciona, déjala con `"activa": false` y explica el motivo en `nota`.
3. **Pruébala dentro de n8n** antes de fiarte: que `curl` funcione no garantiza que el nodo RSS Read lo haga (a Gartner y Rest of World les pasa). Ejecuta el workflow 01 y mira `fuentes_con_error` y `errores` en `log_ejecuciones`.

Las fuentes verificadas y descartadas, con el motivo de cada descarte, están en `config/fuentes.json` (campo `nota`).

## Otras configuraciones útiles

- **Cambiar el modelo de una tarea:** `config/parametros.json` → `modelos.<tarea>.<proveedor>` (tareas: `extraccion`, `clasificacion`, `tendencias`, `redes`, `busqueda`). Es el único sitio. Los nombres de modelo de Gemini se ven en Google AI Studio; los de Claude, en la consola de Anthropic.
- **Palabras clave:** `palabras_clave_incluir` (en titular o resumen) y `palabras_clave_excluir` (solo en el titular). `siglas_sensibles_mayusculas` (IA, AI, LLM) solo coincide con esa capitalización exacta.
- **Pesos de la puntuación:** `pesos_puntuacion`. La puntuación total (0–100) la calcula n8n, no el modelo.
- **Ritmo y límites:** `procesamiento` (lote de descargas, pausa entre descargas y `pausas_ia_ms`: pausa entre llamadas a la IA por tarea), `max_articulos_por_ejecucion`, `max_casos_tendencias`, `n_posts_semanales`, `ia.max_tokens_*`.
- **Horarios:** nodos **Programador diario/semanal** de cada workflow.
- **Consultas del workflow 03:** `config/descubrimiento.json` (regiones, tipos de innovación, plantillas, cuántas consultas por ejecución y cuántas búsquedas por consulta).

## Formato de las hojas y de los mensajes

**Hojas de Google Sheets.** Las hojas se pueden decorar con un workflow de un solo uso, [`workflows/utilidades/formato_hojas.json`](../workflows/utilidades/formato_hojas.json): reordena las columnas (primero lo que se lee, al final lo técnico), oculta las columnas técnicas (ids, URL normalizada, modelos, JSON) y aplica cabecera azul con filtros, filas alternas, anchos, texto ajustado, colores de pestaña y formato condicional (degradado en la puntuación; colores para confianza, estado de los borradores, etapa de descarte y errores del log). Los **nombres de columna no cambian** (n8n asigna los datos por nombre) y no se borran datos. Las filas nuevas heredan el formato.

- Impórtalo, asígnale la credencial **Google Sheets OAuth2 API** (necesita el permiso `spreadsheets`; la cuenta de servicio de los workflows no se usa aquí) y pulsa **Execute workflow** una vez. Es idempotente: puedes repetirlo cuando quieras.
- Si añades columnas propias, se conservan al final.
- Las cabeceras de [`plantilla_sheets/`](../plantilla_sheets/) ya están en el orden recomendado.

**Mensajes de Telegram.** El informe llega en un mensaje con secciones (resumen, tendencias con su fuerza, casos destacados con barra de puntuación y enlace, aviso de borradores y enlace a la hoja) y después **un mensaje por borrador**. Cada borrador empieza con un apartado **"En palabras sencillas"** (qué dice la noticia, en lenguaje cotidiano, y **por qué importa**) y sigue con los textos de LinkedIn y X en citas fáciles de copiar, la imagen sugerida y lo que hay que revisar antes de publicar. En el informe, cada caso destacado lleva además una línea sencilla de una frase. Esas explicaciones las escribe la IA en la misma llamada que los borradores (campos `explicacion_sencilla` y `por_que_importa` de `prompts/redes.md`) y también se guardan en la hoja `borradores_redes`. Todo el formato está en `scripts/nodos_02/mensajes_telegram.js`. Si el informe no cabe en los 4096 caracteres de Telegram, se quitan detalles opcionales por bloques (nunca se corta a la mitad).

## Pasar de Google Sheets a Postgres

El almacenamiento está aislado en nodos marcados con una nota "Bloque de almacenamiento":
- Workflows 01 y 03: **Leer hoja casos**, **Leer hoja descartados**, **Guardar caso**, **Guardar descartado**, **Guardar log**.
- Workflow 02: **Leer hoja casos**, **Guardar tendencias**, **Guardar borradores**.

Sustitúyelos por nodos de Postgres con tablas de las mismas columnas que `plantilla_sheets/*.csv`. Los nodos **Formatear fila…** y **Resumen de ejecución** ya producen filas planas con esos nombres, así que el resto del flujo no cambia. Las lecturas deben devolver una fila por ítem con al menos la columna `url_normalizada` (workflows 01 y 03) y las columnas de `casos` (workflow 02).
