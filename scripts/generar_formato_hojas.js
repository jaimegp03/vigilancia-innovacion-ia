// Genera workflows/utilidades/formato_hojas.json: un workflow de UN SOLO USO (disparador manual) que reordena las columnas de las
// 5 hojas de Google Sheets en el orden de lectura recomendado y les da formato (cabeceras, colores, anchos, filtros, formato condicional).
// Se puede volver a ejecutar cuando quieras (es idempotente). Usa la API de Sheets con la credencial "Google Sheets OAuth2 API".
// Uso: node scripts/generar_formato_hojas.js
const fs = require('fs');
const path = require('path');
const { constructor } = require('./lib_n8n');

const RAIZ = path.join(__dirname, '..');
const b = constructor(path.join(__dirname, 'formato_hojas'));
const { add, conectar, base, code, nota, leer } = b;
const API = '={{ "https://sheets.googleapis.com/v4/spreadsheets/" + $env.GOOGLE_SHEET_ID';
const oauth = { authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api' };

nota('Nota · Qué hace', '## Formato de las hojas (un solo uso)\nReordena las columnas de `casos`, `tendencias`, `borradores_redes`, `log_ejecuciones` y `descartados` (lo importante primero, lo técnico al final y oculto) y las decora: cabecera azul, filas alternas, anchos, filtros, colores por puntuación y estado.\n\nNo cambia los nombres de columna ni borra datos. Se puede ejecutar de nuevo cuando quieras.\nRequiere la credencial **Google Sheets OAuth2 API** (con permiso `spreadsheets`).', [-60, -200], 520, 200, 4);
add(base('Ejecución manual', 'n8n-nodes-base.manualTrigger', 1, {}, [0, 100]));
add(base('Leer metadatos', 'n8n-nodes-base.httpRequest', 4.2, {
  method: 'GET',
  url: `${API} + "?fields=sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)),bandedRanges(bandedRangeId),conditionalFormats(ranges))" }}`,
  ...oauth, options: {},
}, [240, 100]));
add(base('Leer valores', 'n8n-nodes-base.httpRequest', 4.2, {
  method: 'GET',
  url: `${API} + "/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS&ranges=casos&ranges=tendencias&ranges=borradores_redes&ranges=log_ejecuciones&ranges=descartados" }}`,
  ...oauth, options: {},
}, [480, 100]));
code('Preparar cambios', leer('preparar_cambios.js'), [720, 100]);
const post = (nombre, sufijo, campo, pos) => add(base(nombre, 'n8n-nodes-base.httpRequest', 4.2, {
  method: 'POST',
  url: `${API} + "${sufijo}" }}`,
  ...oauth, sendBody: true, contentType: 'json', specifyBody: 'json',
  jsonBody: `={{ JSON.stringify($('Preparar cambios').first().json.${campo}) }}`,
  options: {},
}, pos));
post('Escribir valores (nuevo orden de columnas)', '/values:batchUpdate', 'valores', [960, 100]);
post('Aplicar formato', ':batchUpdate', 'formato', [1200, 100]);
conectar('Ejecución manual', 'Leer metadatos');
conectar('Leer metadatos', 'Leer valores');
conectar('Leer valores', 'Preparar cambios');
conectar('Preparar cambios', 'Escribir valores (nuevo orden de columnas)');
conectar('Escribir valores (nuevo orden de columnas)', 'Aplicar formato');

const wf = {
  id: 'vigilancia-formato-hojas', name: 'Utilidad · Dar formato a las hojas de Google Sheets (un solo uso)',
  nodes: b.nodos, connections: b.conexiones,
  settings: { executionOrder: 'v1', timezone: 'Europe/Madrid' }, pinData: {}, meta: { templateCredsSetupCompleted: false }, active: false,
};
const ruta = path.join(RAIZ, 'workflows', 'utilidades', 'formato_hojas.json');
fs.mkdirSync(path.dirname(ruta), { recursive: true });
fs.writeFileSync(ruta, JSON.stringify(wf, null, 2) + '\n');
console.log(path.relative(RAIZ, ruta), wf.nodes.length, 'nodos');
