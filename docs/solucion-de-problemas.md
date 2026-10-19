# Limitaciones y solución de problemas

> Volver al [README](../README.md)

## Limitaciones conocidas

- **Pocas consultoras con feed.** Solo Capgemini tiene un feed RSS activo y fiable (McKinsey, BCG, Deloitte, Accenture y PwC no ofrecen uno utilizable). Para cubrirlas, el workflow 03 (con Claude) es la vía.
- **Medios con paywall** (Expansión, Cinco Días, Financial Times…): se analiza solo titular y resumen.
- **Extracción de texto sencilla** (sin librería de lectura): en páginas muy dinámicas (JavaScript) puede quedar acceso parcial.
- **Calidad con Gemini gratuito.** Los modelos de la capa gratuita pueden extraer o clasificar peor que los de pago; la validación JSON descarta lo mal formado, pero revisa las primeras semanas lo que entra en `casos`.
- **Cuotas de la capa gratuita.** Con muchas fuentes activas es fácil quedarse corto de cuota diaria: los artículos no procesados se reintentan al día siguiente mientras sigan en la ventana de 7 días.
- **Fecha de los resultados del workflow 03:** si la búsqueda no da fecha de publicación, se usa la fecha de hallazgo.
- **Aviso legal y de buen uso.** Respeta los términos de uso de cada medio y la propiedad intelectual: este sistema extrae datos y resúmenes en palabras propias, pero conviene revisar siempre los borradores antes de publicarlos y verificar las cifras con la fuente original.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| No hay edición nueva en la web | Revisa el aviso de Telegram del workflow 04: «Sin edición hoy» (el 01 no guardó casos) o «No se pudo preparar la edición» (la IA no devolvió una edición válida tras reintentar, o falló la construcción de la web). Puedes relanzar el 04 a mano. |
| El 04 falla con «Service unavailable» o «quota» | Cuota o sobrecarga de Gemini: el modelo del editor (`modelos.editor.gemini`) tiene un límite diario. Cambia a otro modelo con cuota disponible. |
| El nodo «Construir web» no existe o falla | Falta actualizar el contenedor: `docker compose up -d` (activa *Execute Command* y monta `data/` y `web/`). |
| `web/index.html` no cambia | Se regenera cada día con las ediciones de `data/ediciones/`; recarga la pestaña. Con `node web/build.mjs --con-ejemplos` ves también las de ejemplo. |
| Un enlace de fuente da error 403 al descargar | Algunos medios bloquean las descargas automáticas: el caso se analiza solo con titular y resumen (confianza baja). Si es habitual, desactiva esa fuente en `config/fuentes.json`. |
| `Node does not have any credentials set` | Falta seleccionar la credencial en ese nodo. |
| `access to env vars denied` / expresiones con `$env` vacías | Comprueba que `docker-compose.yml` tiene `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` y que `.env` tiene `GOOGLE_SHEET_ID` y `TELEGRAM_CHAT_ID`. |
| `Falta el archivo … en /data/proyecto` | Los volúmenes del compose no se montaron: ejecuta `docker compose up -d` desde la carpeta del proyecto. |
| El nodo de Google Sheets no encuentra la hoja o columnas | Los nombres de pestaña y de columna deben coincidir con `plantilla_sheets/` y con `parametros.json` → `hojas`. |
| En el log: "N artículos omitidos por fallo de la API de IA" | Cuota agotada, sobrecarga o clave inválida (el detalle sale en el nodo **Validar extracción** como "Sin respuesta del modelo: …"). Se reintentan en la siguiente ejecución; si persiste, baja `max_articulos_por_ejecucion` o sube `pausa_entre_llamadas_ia_ms`. |
| "Sin respuesta del modelo … API key not valid" | La credencial de Gemini tiene una clave incorrecta o no está seleccionada en los nodos **IA · …**. |
| En el log o en un nodo: "You exceeded your current quota" | Cuota de la capa gratuita agotada para ese modelo (casi siempre la diaria, RPD). Los artículos afectados se reintentan al día siguiente. Mira los límites en AI Studio y usa modelos Flash-Lite para las tareas con muchas llamadas. |
| "Respuesta cortada por el límite de tokens" | Sube el `ia.max_tokens_*` correspondiente en `parametros.json`. |
| Una fuente aparece en `errores` del log | Revisa su feed; si el problema es del parser de n8n, desactívala (`activa: false`) y anota el motivo. |
| `fuentes_con_error` alto de golpe | Alguna fuente cambió de URL o bloquea peticiones automáticas. |
