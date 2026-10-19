# Vigilancia continua de innovación con IA

[![CI](https://github.com/jaimegp03/vigilancia-innovacion-ia/actions/workflows/ci.yml/badge.svg)](https://github.com/jaimegp03/vigilancia-innovacion-ia/actions/workflows/ci.yml)
[![Licencia: MIT](https://img.shields.io/badge/licencia-MIT-blue.svg)](LICENSE)
![n8n](https://img.shields.io/badge/n8n-2.43-ff6d5a)
![Coste](https://img.shields.io/badge/coste-0%20%E2%82%AC%20(Gemini%20gratis)-brightgreen)

Sistema en **n8n** que cada día lee revistas y medios de IA e innovación, descarta lo irrelevante y lo ya visto, extrae **casos concretos** de empresas que usan IA, los clasifica y puntúa, y cada semana genera un **informe de tendencias** y **borradores para redes sociales** que llegan por **Telegram** para revisarlos. Nada se publica solo.

> **English summary.** n8n workflows that monitor ~67 RSS sources across 7 regions daily, extract and score real-world enterprise AI use cases with an LLM (Gemini free tier by default, Claude optional), store them in Google Sheets, publish a daily newspaper-style web edition (a single self-contained HTML file) and send a weekly trends report plus social-media drafts via Telegram. Config-driven (sources, prompts, models, sector focus), Spanish-first, runs locally with Docker. Documentation is mainly in Spanish.

> 👋 **¿No eres técnico?** Empieza por la [**Guía sencilla**](docs/guia-sencilla.md).

## Cómo funciona

```mermaid
flowchart LR
    A[67 feeds RSS] --> B[Filtrar y deduplicar]
    B --> C[Descargar artículo]
    C --> D[IA: extraer caso]
    D --> E[IA: clasificar y puntuar]
    E --> F[(Google Sheets)]
    F --> G[IA: tendencias semanales]
    G --> H[IA: 5 borradores para redes]
    H --> I[Telegram]
    H --> F
    F --> W[Editor jefe IA]
    W --> X[Web diaria tipo periódico]
```

| Workflow | Cuándo | Qué hace |
|---|---|---|
| [`01_ingesta_diaria`](workflows/01_ingesta_diaria.json) | Diario, 07:00 | Lee feeds → filtra → deduplica → descarga → extrae y puntúa con IA → guarda en la hoja `casos` → **aviso por Telegram** con los casos del día. |
| [`02_informe_semanal`](workflows/02_informe_semanal.json) | Lunes, 07:30 | Tendencias de la semana + 5 borradores (LinkedIn y X) → hojas y Telegram. |
| [`04_edicion_diaria`](workflows/04_edicion_diaria.json) | Diario, 07:40 | Los casos del día → **editor jefe (IA)** → edición en JSON → genera `web/index.html`, una web tipo periódico con archivo de ediciones → aviso por Telegram. |
| [`03_descubrimiento_semanal`](workflows/variante_claude/03_descubrimiento_semanal.json) | Miércoles *(opcional, solo con Claude)* | Búsqueda web de casos fuera de las fuentes fijas. |

Detalles de diseño en [docs/arquitectura.md](docs/arquitectura.md).

## Calidad de la información

La web diaria está diseñada para que cada dato sea comprobable y cada límite, visible:

- **Enlace real a cada noticia** y medio y fecha de la fuente. La IA nunca escribe URLs, medios, fechas ni puntuaciones: las copia el sistema del caso original.
- **Una noticia por historia:** si varios medios cuentan lo mismo, se agrupan con todas sus fuentes («También en: …»).
- **Relevancia en tres niveles con palabras** (*Muy relevante*, *Relevante*, *De interés*), calculada a partir de impacto, novedad, replicabilidad y evidencia, con el índice 0-100 al pasar el ratón.
- **Etiquetas de rigor:** *hecho confirmado* (verificado por un tercero), *afirmación de la empresa* y *opinión*; las notas de prensa se marcan como *comunicado*.
- **Señales débiles bien definidas:** lo muy novedoso con poca evidencia, con una línea «qué vigilar». Las decide el código, no la IA.
- **Textos prudentes y transparencia:** «según la empresa…», apartado de **Metodología**, cobertura (fuentes, regiones y medios) y modelo de IA usado a la vista.
- **Cifras calculadas por código**, no escritas por la IA.

Más detalle en [docs/web.md](docs/web.md). Historial de cambios en [CHANGELOG.md](CHANGELOG.md).

## Características

- **Web diaria tipo periódico:** un único `index.html` autocontenido (sin servidores ni internet) con portada, cifras, sectores, señales débiles y archivo. Ver [docs/web.md](docs/web.md).
- **Gratis por defecto:** Google Gemini (capa gratuita). Variante de pago con Claude en [`workflows/variante_claude/`](workflows/variante_claude/).
- **Todo por configuración:** fuentes ([`config/fuentes.json`](config/fuentes.json)), modelos, pesos y límites ([`config/parametros.json`](config/parametros.json)), prompts ([`prompts/`](prompts/)). Cambiarlos no exige reimportar nada.
- **Salida JSON validada** contra un [esquema](schemas/caso.schema.json) con reintento y registro de descartes.
- **Preparado para modo sectorial** (banca, salud, automoción…) cambiando solo la configuración.
- **Almacenamiento aislado** para pasar de Google Sheets a Postgres.
- **Respetuoso con las fuentes:** resúmenes con palabras propias; no se guarda el texto de los artículos.
- **Probado:** pruebas unitarias, workflows con IA simulada y ejecuciones reales verificadas.

## Inicio rápido

Requisitos: Docker y, para modificar o probar, Node.js 20+.

```bash
cp .env.example .env     # rellena N8N_ENCRYPTION_KEY, GOOGLE_SHEET_ID y TELEGRAM_CHAT_ID
docker compose up -d     # n8n en http://localhost:5678
```

Después crea las credenciales (Gemini, Google Sheets, Telegram) e importa los workflows. Guía completa paso a paso: **[docs/instalacion.md](docs/instalacion.md)**.

## Documentación

| Documento | Contenido |
|---|---|
| [Guía sencilla](docs/guia-sencilla.md) | Para quien no es técnico: qué hace, rutina semanal, glosario. |
| [Instalación](docs/instalacion.md) | Credenciales, hojas de Google, importación y activación, elección de IA. |
| [La web](docs/web.md) | Edición diaria, cómo generarla y abrirla, nombre y eslogan, publicación opcional en GitHub Pages. |
| [Configuración](docs/configuracion.md) | Modo sectorial, fuentes, modelos, formato de hojas y mensajes, Postgres. |
| [Arquitectura](docs/arquitectura.md) | Qué hace cada pieza y por qué se diseñó así. |
| [Pruebas](docs/pruebas.md) | Cómo ejecutar los tests y qué se ha verificado. |
| [Problemas frecuentes](docs/solucion-de-problemas.md) | Limitaciones conocidas y errores habituales. |

## Estructura del repositorio

```
config/              fuentes, parámetros y consultas de descubrimiento
prompts/             un prompt por tarea de IA
schemas/             esquemas JSON: casos, tendencias, borradores y ediciones
workflows/           workflows de n8n listos para importar (Gemini)
  variante_claude/   los mismos con Claude (incluye el 03)
  utilidades/        formato de las hojas de Google Sheets (un solo uso)
plantilla_sheets/    cabeceras CSV de las 5 hojas
web/                 plantilla y generador de la web diaria (build.mjs)
data/ediciones/      ediciones diarias en JSON (en git, solo las de ejemplo)
scripts/             generadores de workflows, nodos de código y utilidades
tests/               pruebas unitarias y workflows de prueba con IA simulada
docs/                documentación
```

Los workflows se **generan** desde `scripts/` (`npm run generar`); consulta [CONTRIBUTING.md](CONTRIBUTING.md) antes de modificarlos.

## Seguridad y privacidad

El repositorio no contiene claves: las credenciales viven solo en tu n8n y el `.env` está ignorado por git. Ver [SECURITY.md](SECURITY.md). En la capa gratuita de Gemini, Google puede usar los datos enviados para mejorar sus productos (aquí solo se envían artículos públicos).

## Aviso

Respeta los términos de uso de cada medio. Revisa siempre los borradores y verifica las cifras con la fuente original antes de publicar.

## Licencia

[MIT](LICENSE).
