# Pruebas

> Volver al [README](../README.md)

## Pruebas

```bash
node tests/unit_nodos_01.js        # filtros, deduplicación, normalización de URLs
node tests/unit_nodos_02.js        # casos de la semana, validación de tendencias
node tests/unit_web.js             # edición diaria: ensamblado, esquema, ejemplos y build de la web
node scripts/comprobar_sintaxis.js $(find workflows tests -name "*.json" -not -path "tests/esquema/*" -not -path "tests/resultados*")
node scripts/validar_esquema.js extraccion tests/esquema/extraccion_valida.json
```

Pruebas de extremo a extremo en el contenedor (requiere `docker compose up -d`), con la IA, las hojas y Telegram **simuladas** (RSS y descargas reales):
```bash
scripts/probar_workflow.sh tests/01_ingesta_diaria.test.json vigilancia-01-test salida.txt
node scripts/resumir_ejecucion.js salida.txt --json
```

Prueba de los nodos de Gemini contra un **servidor simulado** (sin clave ni coste): comprueba la forma de la petición, el espaciado de llamadas, el reintento tras un error de cuota y el comportamiento cuando la cuota se agota de forma sostenida:
```bash
scripts/pruebas/probar_gemini_mock.sh workflows/01_ingesta_diaria.json salida.txt 3-3
scripts/pruebas/probar_gemini_mock.sh workflows/01_ingesta_diaria.json salida.txt 4-40
```


> **Qué se ha probado y qué no.** Con la IA simulada (las pruebas llevan la marca "(simulado)" o "(mock Gemini)") se probaron los tres workflows y las dos variantes. **Con servicios reales** (17-oct-2026, versión Gemini): el workflow 01 se ejecutó entero (45 fuentes, 50 artículos, 17 casos guardados en Google Sheets) y el 02 también (informe, 5 borradores y 6 mensajes de Telegram recibidos). **No se han ejecutado nunca con servicios reales** la variante con Claude (nodo de Anthropic) ni el workflow 03 (búsqueda web): para ellos solo hay pruebas con IA simulada.

Los datos de ejemplo del paso a paso del informe semanal (ficticios) están en `tests/resultados_02/`.

**Web.** `node scripts/web/revisar_web.mjs [carpeta]` abre `web/index.html` en un Chrome o Edge real (sin dependencias, por CDP), lo prueba en escritorio y móvil —cabecera con distintos nombres, efectos de scroll, hover y toque, filtros, modo oscuro, `prefers-reduced-motion`, consola sin errores, sin scroll horizontal— y guarda capturas.

El workflow 04 se prueba como los demás con IA, hojas, escritura y Telegram simulados: `scripts/probar_workflow.sh tests/04_edicion_diaria.test.json vigilancia-04-test salida.txt` (también `.vacio.test.json` y la variante Claude).

**Qué cubre la edición diaria:** ensamblado (portada, destacadas, secciones, cifras), agrupación de historias, señales débiles por regla, copia de enlaces desde los casos, esquema de las ediciones de ejemplo, y construcción de `web/index.html` (autocontenido, sin recursos externos, con `noindex` y con error claro si una edición real no trae enlaces).
