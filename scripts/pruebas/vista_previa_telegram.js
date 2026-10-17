// Genera una vista previa de los mensajes de Telegram SIN volver a llamar a la IA: toma los resultados de una ejecución
// anterior del workflow 02 (la salida de `n8n execute`) y les aplica el código ACTUAL de scripts/nodos_02/mensajes_telegram.js.
// Escribe un mini-workflow de n8n (disparador manual → Telegram) con esos mensajes, listo para importar y ejecutar.
// Uso: node scripts/pruebas/vista_previa_telegram.js <salida_ejecucion_02.txt> <workflow_salida.json> <id_credencial_telegram>:<nombre>
const fs = require('fs');
const path = require('path');
const { leerNodo } = require('../lib_n8n');

const [entrada, salida, cred] = process.argv.slice(2);
const t = fs.readFileSync(entrada, 'utf8');
const ej = JSON.parse(t.slice(t.indexOf('{\n  "data"'), t.lastIndexOf('\n}\n') + 2));
const run = ej.data.resultData.runData;
const salidaDe = nombre => run[nombre][0].data.main[0].map(x => ({ json: x.json }));

const todos = {
  'Cargar configuración': salidaDe('Cargar configuración'),
  'Casos de la semana': salidaDe('Casos de la semana'),
  'Validar tendencias': salidaDe('Validar tendencias'),
  'Validar redes': salidaDe('Validar redes'),
};
const $ = n => ({ first: () => todos[n][0], all: () => todos[n] });
const codigo = leerNodo(path.join(__dirname, '..', 'nodos_02', 'mensajes_telegram.js'));
const mensajes = new Function('$', '$env', codigo)($, { GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || '' }).map(m => m.json.texto);
mensajes.forEach((m, i) => console.log(`mensaje ${i + 1}: ${m.length} caracteres`));

const [id, ...nombre] = cred.split(':');
const wf = {
  id: 'vigilancia-vista-previa-telegram', name: 'Vista previa de Telegram (un solo uso)',
  nodes: [
    { parameters: {}, id: 'a1', name: 'Ejecución manual', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0] },
    { parameters: { jsCode: `return ${JSON.stringify(mensajes)}.map(texto => ({ json: { texto } }));` }, id: 'a2', name: 'Mensajes de ejemplo', type: 'n8n-nodes-base.code', typeVersion: 2, position: [240, 0] },
    {
      parameters: { resource: 'message', operation: 'sendMessage', chatId: '={{ $env.TELEGRAM_CHAT_ID }}', text: '={{ $json.texto }}', additionalFields: { parse_mode: 'HTML', appendAttribution: false, disable_web_page_preview: true } },
      id: 'a3', name: 'Enviar a Telegram', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [480, 0], credentials: { telegramApi: { id, name: nombre.join(':') } },
    },
  ],
  connections: { 'Ejecución manual': { main: [[{ node: 'Mensajes de ejemplo', type: 'main', index: 0 }]] }, 'Mensajes de ejemplo': { main: [[{ node: 'Enviar a Telegram', type: 'main', index: 0 }]] } },
  settings: { executionOrder: 'v1' }, pinData: {}, active: false,
};
fs.writeFileSync(salida, JSON.stringify(wf, null, 2));
