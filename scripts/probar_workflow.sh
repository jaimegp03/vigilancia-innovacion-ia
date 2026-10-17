#!/usr/bin/env bash
# Importa un workflow en el contenedor de n8n, lo ejecuta por línea de comandos y guarda la salida completa.
# Uso: scripts/probar_workflow.sh <fichero.json> <id_workflow> <salida.txt>
# Variables opcionales: N8N_CONTENEDOR (nombre del contenedor; por defecto n8n-vigilancia-ia).
# Funciona en Linux, macOS y Git Bash de Windows.
set -e
CONTENEDOR="${N8N_CONTENEDOR:-n8n-vigilancia-ia}"
# En Git Bash (Windows) hay que traducir las rutas para docker cp; en el resto de sistemas se dejan igual.
ruta() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
export MSYS_NO_PATHCONV=1

docker cp "$(ruta "$1")" "$CONTENEDOR:/home/node/wf_prueba.json" >/dev/null
docker exec "$CONTENEDOR" n8n import:workflow --input=/home/node/wf_prueba.json 2>&1 | tail -1
# Puertos internos distintos para no chocar con el n8n que ya está en marcha dentro del contenedor.
docker exec -e N8N_RUNNERS_BROKER_PORT=5690 -e N8N_PORT=5691 "$CONTENEDOR" sh -c "n8n execute --id='$2' > /home/node/salida_prueba.txt 2>&1; echo salida=\$?"
docker cp "$CONTENEDOR:/home/node/salida_prueba.txt" "$(ruta "$3")"
