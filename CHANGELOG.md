# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [1.2.0] · 2026-10-19

### Añadido
- **Mejoras de calidad en la web diaria:** bloque «Lo esencial de hoy» (tres frases), cobertura en la cabecera (fuentes, regiones, medios y hora de generación), apartado de **Metodología**, botones de imprimir/PDF y descargar la edición.
- **Enlace real y visible a cada noticia** («Leer la noticia original en <dominio>»), con medio y fecha, y etiqueta *Comunicado* para notas de prensa.
- **Una noticia por historia:** las noticias repetidas en varios medios se agrupan con todas sus fuentes.
- **Señales débiles redefinidas** (novedad alta con poca evidencia) con una línea «Qué vigilar» y regla aplicada por el código.
- **Relevancia en tres niveles con palabras** (*Muy relevante*, *Relevante*, *De interés*) en lugar de puntos y números; el índice 0-100 se ve al pasar el ratón.
- **22 fuentes sectoriales nuevas** (banca, salud, energía, industria, logística, construcción, agricultura, sector público, educación, retail, turismo, aeroespacial y defensa, RR. HH., legal, marketing y ciberseguridad): 67 fuentes activas en 7 regiones.
- **4 sectores nuevos:** aeroespacial y defensa, ciencia e I+D, deporte y ocio, servicios profesionales.
- `scripts/web/revisar_web.mjs`: revisión automática de la web en un navegador real (escritorio y móvil, efectos de scroll, consola, capturas).
- `web.silencioso` y `web.fecha_edicion_forzada` para reconstruir ediciones pasadas sin aviso por Telegram.

### Cambiado
- El editor jefe redacta textos más prudentes («según la empresa…»), distingue hecho confirmado de afirmación de la empresa y prefiere para la portada un caso real de una organización antes que un avance científico o un lanzamiento.
- `build.mjs` deja fuera las ediciones más antiguas si el HTML pasa de 5 MB, en lugar de fallar.
- El validador de la edición poda campos no pedidos por la IA antes de validar.
- Modelos por defecto de Gemini según la cuota gratuita disponible: editor `gemini-3.6-flash`; tendencias y redes `gemini-3.5-flash`.

## [1.1.0] · 2026-10-19

### Añadido
- **Web diaria «Tecnoticias e Innovación IA»:** workflow 04 (edición diaria), editor jefe de IA, esquema de edición, `web/build.mjs` y plantilla de un único `index.html` autocontenido (portada, escena fija con capítulos, cifras con gráficos propios, lista por sectores con vista previa, señales débiles, archivo con buscador y filtros, modo claro/oscuro, accesible y responsive).
- 7 ediciones de ejemplo ficticias con banner «DATOS DE EJEMPLO».
- Publicación opcional en GitHub Pages (desactivada) con bloqueo de datos de ejemplo.
- Documentación en [docs/web.md](docs/web.md).

### Cambiado
- Informe semanal los lunes a las 07:30 (antes 08:00) para entrar en la misma ventana que el 01.
- `docker-compose.yml` activa el nodo *Execute Command* y monta `data/`, `web/` y `scripts/`.

## [1.0.0] · 2026-10-17

### Añadido
- Workflows 01 (ingesta diaria), 02 (informe semanal) y 03 (descubrimiento semanal, solo con Claude), con IA gratuita (Gemini) por defecto y variante con Claude.
- Esquema JSON de casos, prompts por tarea, 45 fuentes verificadas, hojas de Google Sheets con formato, mensajes de Telegram, pruebas unitarias y de extremo a extremo con IA simulada, integración continua y documentación en español.
- Aviso diario por Telegram con el resumen de la ingesta.
