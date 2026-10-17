#!/usr/bin/env bash
# Prueba de extremo a extremo de los nodos HTTP de Gemini contra un servidor simulado (sin clave real ni coste).
# Requiere el contenedor de n8n en marcha (docker compose up -d).
# Uso: scripts/pruebas/probar_gemini_mock.sh <workflow.json> <salida.txt> [desde-hasta]
#   desde-hasta: qué peticiones al mock reciben un 429 (por defecto "3-3"; "4-40" = cuota agotada de forma sostenida).
# Variables opcionales: N8N_CONTENEDOR (por defecto n8n-vigilancia-ia).
set -e
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
CONTENEDOR="${N8N_CONTENEDOR:-n8n-vigilancia-ia}"
WF="$1"; SALIDA="$2"; CAIDAS="${3:-3-3}"
TMP="$(dirname "$SALIDA")/g_prueba.json"
ruta() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
export MSYS_NO_PATHCONV=1

# Credencial de prueba (clave falsa) y servidor simulado dentro del contenedor
echo '[{"id":"mockgem","name":"Gemini MOCK","type":"googlePalmApi","data":{"host":"http://127.0.0.1:8099","apiKey":"CLAVE_DE_PRUEBA"}}]' > "$TMP.cred"
docker cp "$(ruta "$TMP.cred")" "$CONTENEDOR:/home/node/cred.json"
docker cp "$(ruta "$RAIZ/scripts/pruebas/mock_gemini.js")" "$CONTENEDOR:/home/node/mock_gemini.js"
docker exec "$CONTENEDOR" n8n import:credentials --input=/home/node/cred.json 2>&1 | tail -1
docker exec "$CONTENEDOR" sh -c 'pkill -f mock_gemini.js; sleep 1' || true
docker exec -d "$CONTENEDOR" node /home/node/mock_gemini.js 8099 "$CAIDAS"
sleep 2

node "$RAIZ/scripts/pruebas/preparar_prueba_gemini.js" "$WF" "$(ruta "$TMP")" vigilancia-gemini-mock
"$RAIZ/scripts/probar_workflow.sh" "$TMP" vigilancia-gemini-mock "$SALIDA" | tail -1
docker exec "$CONTENEDOR" wget -qO- http://127.0.0.1:8099/log > "$SALIDA.mock.json"
