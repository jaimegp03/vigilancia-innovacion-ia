# Cómo contribuir

¡Gracias por el interés! Este proyecto es pequeño y las aportaciones sencillas son bienvenidas (nuevas fuentes RSS, mejoras de prompts, correcciones de documentación).

## Antes de empezar

- Node.js 20 o superior. No hay dependencias que instalar.
- **Los workflows de `workflows/` están generados.** No edites los `.json` a mano: modifica los nodos en `scripts/nodos_*/` o los generadores `scripts/generar_workflow_*.js` y regenera:
  ```bash
  npm run generar
  ```
- Comprueba que todo pasa:
  ```bash
  npm test
  node scripts/comprobar_sintaxis.js $(find workflows tests -name "*.json" -not -path "tests/esquema/*" -not -path "tests/resultados*")
  ```
  La integración continua (GitHub Actions) ejecuta lo mismo y además verifica que los workflows generados coinciden con el código fuente.

## Añadir una fuente

Sigue [`docs/configuracion.md`](docs/configuracion.md#añadir-una-fuente): comprueba el feed con `scripts/validar_feeds.sh` y no inventes URLs.

## Reglas

- Nada de secretos ni datos personales en archivos, tests o capturas.
- Los prompts no deben pedir copiar párrafos de los artículos: resúmenes con palabras propias.
- No incluyas texto de artículos reales en los tests; usa datos ficticios.
- Documentación principal en español; el inglés es complementario.

## Pull requests

Describe qué cambia y por qué, y menciona cómo lo probaste. Un cambio por PR.
