// Ayudantes comunes para generar workflows de n8n como JSON (nodos, conexiones y bloques repetidos).
// Proveedor de IA: "gemini" (por defecto; capa gratuita) o "anthropic" (Claude). Cambia solo los nodos de IA;
// el resto del flujo es idéntico y lee las respuestas con la utilidad común nodos_comun/util_ia.js.
const fs = require('fs');
const path = require('path');

const CFG = "$('Cargar configuración').first().json";
const PROVEEDORES = ['gemini', 'anthropic'];
// Acceso a Google Sheets: cuenta de servicio (por defecto: no caduca) u OAuth2 de usuario (caduca a los 7 días si la app de Google está en modo "Prueba").
// Para generar los workflows con OAuth2: GOOGLE_AUTH=oauth node scripts/generar_workflow_01.js (y 02, 03).
const AUTH_GOOGLE = process.env.GOOGLE_AUTH === 'oauth' ? 'oAuth2' : 'serviceAccount';
let contador = 0;
const uid = () => `c${String(++contador).padStart(4, '0')}-0000-4000-8000-${String(contador).padStart(12, '0')}`;

// Lee el código de un nodo e inyecta las utilidades compartidas (marcadores "// __UTIL_URL__" y "// __UTIL_IA__").
const util = f => fs.readFileSync(path.join(__dirname, 'nodos_comun', f), 'utf8');
const utilUrl = util('util_url.js');
const utilIa = util('util_ia.js');
const leerNodo = ruta => fs.readFileSync(ruta, 'utf8')
  .replace('// __UTIL_URL__', () => utilUrl)
  .replace('// __UTIL_IA__', () => utilIa);

// Código que fija el proveedor y deja en parametros.modelos el modelo (texto) de cada tarea para ese proveedor.
// config/parametros.json guarda, por tarea, un modelo por proveedor: { "extraccion": { "gemini": "...", "anthropic": "..." } }.
const resolverModelos = proveedor => [
  `const PROVEEDOR = '${proveedor}'; // proveedor de IA con el que se generó este workflow`,
  'parametros.proveedor_ia = PROVEEDOR;',
  'for (const t of Object.keys(parametros.modelos)) parametros.modelos[t] = parametros.modelos[t][PROVEEDOR];',
].join('\n');

function constructor(carpetaNodos, proveedor = 'gemini') {
  if (!PROVEEDORES.includes(proveedor)) throw new Error(`Proveedor de IA desconocido: ${proveedor}`);
  const nodos = [];
  const conexiones = {};
  const leer = f => leerNodo(path.join(carpetaNodos, f));

  const add = n => { nodos.push(n); return n.name; };
  const conectar = (de, a, salida = 0, entrada = 0) => {
    conexiones[de] = conexiones[de] || { main: [] };
    while (conexiones[de].main.length <= salida) conexiones[de].main.push([]);
    conexiones[de].main[salida].push({ node: a, type: 'main', index: entrada });
  };
  const base = (name, type, typeVersion, parameters, position, extra = {}) =>
    ({ parameters, id: uid(), name, type, typeVersion, position, ...extra });
  const code = (name, js, position, extra = {}) => add(base(name, 'n8n-nodes-base.code', 2, { jsCode: js }, position, extra));
  const nota = (name, content, position, width, height, color = 4) =>
    add(base(name, 'n8n-nodes-base.stickyNote', 1, { content, height, width, color }, position));
  const si = (name, expr, position, esperado = true) => add(base(name, 'n8n-nodes-base.if', 2.2, {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
      conditions: [{ id: uid(), leftValue: `={{ ${expr} }}`, rightValue: '', operator: { type: 'boolean', operation: esperado ? 'true' : 'false', singleValue: true } }],
      combinator: 'and',
    },
    options: {},
  }, position));
  const unir = (name, n, position) => add(base(name, 'n8n-nodes-base.merge', 3.2, { numberInputs: n }, position));
  const hoja = (nombreNodo, operacion, hojaKey, position, extra = {}) => add(base(nombreNodo, 'n8n-nodes-base.googleSheets', 4.7, {
    authentication: AUTH_GOOGLE,
    operation: operacion,
    documentId: { __rl: true, mode: 'id', value: '={{ $env.GOOGLE_SHEET_ID }}' },
    sheetName: { __rl: true, mode: 'name', value: `={{ ${CFG}.parametros.hojas.${hojaKey} }}` },
    ...(operacion === 'append' ? { columns: { mappingMode: 'autoMapInputData', value: null, matchingColumns: [], schema: [] } } : {}),
    options: {},
  }, position, extra));

  // Nodo de IA. El modelo sale de config/parametros.json → modelos.<tarea>.<proveedor>.
  // No se fija temperatura: algunos modelos recientes no la admiten y la validación JSON ya cubre la variabilidad.
  const iaAnthropic = (nombre, tarea, tokensClave, position, opcionesExtra) => add(base(nombre, '@n8n/n8n-nodes-langchain.anthropic', 1, {
    resource: 'text',
    operation: 'message',
    modelId: { __rl: true, mode: 'id', value: `={{ ${CFG}.parametros.modelos.${tarea} }}` },
    messages: { values: [{ content: '={{ $json.prompt_user }}', role: 'user' }] },
    simplify: true,
    options: { system: '={{ $json.prompt_system }}', maxTokens: `={{ ${CFG}.parametros.ia.${tokensClave} }}`, ...opcionesExtra },
  }, position, { retryOnFail: true, maxTries: 3, waitBetweenTries: 3000, onError: 'continueRegularOutput' }));

  // Gemini por llamada HTTP a la API REST: permite espaciar las llamadas (límites por minuto de la capa gratuita)
  // con el "batching" del nodo, y pedir JSON puro (responseMimeType). Usa la credencial "Google Gemini(PaLM) Api".
  const iaGemini = (nombre, tarea, tokensClave, position) => {
    if (tarea === 'busqueda') throw new Error('La búsqueda web del workflow 03 solo está disponible con el proveedor "anthropic".');
    const jsonBody = `={{ JSON.stringify({ systemInstruction: { parts: [{ text: $json.prompt_system }] }, contents: [{ role: 'user', parts: [{ text: $json.prompt_user }] }], generationConfig: { maxOutputTokens: ${CFG}.parametros.ia.${tokensClave}, responseMimeType: 'application/json' } }) }}`;
    if (jsonBody.slice(3, -2).includes('}}')) throw new Error('jsonBody contiene "}}" y n8n lo confundiría con el cierre de la expresión');
    return add(base(nombre, 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST',
      url: `={{ ${CFG}.parametros.gemini_host + '/v1beta/models/' + ${CFG}.parametros.modelos.${tarea} + ':generateContent' }}`,
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googlePalmApi',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody,
      options: {
        timeout: 180000,
        batching: { batch: { batchSize: 1, batchInterval: `={{ ${CFG}.parametros.procesamiento.pausas_ia_ms.${tarea} }}` } },
      },
    }, position, { retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueRegularOutput' }));
  };
  const ia = (nombre, tarea, tokensClave, position, opcionesExtra = {}) =>
    (proveedor === 'anthropic' ? iaAnthropic : iaGemini)(nombre, tarea, tokensClave, position, opcionesExtra);

  // Para los nodos de IA simulados de las versiones de prueba: envuelve un texto con la forma de respuesta del proveedor.
  const envolver = exprTexto => (proveedor === 'anthropic'
    ? `content: [{ type: 'text', text: ${exprTexto} }]`
    : `candidates: [{ content: { role: 'model', parts: [{ text: ${exprTexto} }] }, finishReason: 'STOP' }]`);

  const telegram = (nombre, position, extra = {}) => add(base(nombre, 'n8n-nodes-base.telegram', 1.2, {
    resource: 'message',
    operation: 'sendMessage',
    chatId: '={{ $env.TELEGRAM_CHAT_ID }}',
    text: '={{ $json.texto }}',
    additionalFields: { parse_mode: 'HTML', appendAttribution: false, disable_web_page_preview: true },
  }, position, extra));
  const simulado = (nombre, descripcion, position) =>
    code(nombre, `// SIMULADO (solo pruebas): ${descripcion}\nreturn $input.all().map((it, k) => ({ json: it.json, pairedItem: { item: k } }));`, position);

  return { nodos, conexiones, leer, add, conectar, base, code, nota, si, unir, hoja, ia, telegram, simulado, envolver, proveedor };
}

const validadorFuente = fs.readFileSync(path.join(__dirname, 'validar_esquema.js'), 'utf8').split('if (typeof module')[0];

module.exports = { constructor, validadorFuente, leerNodo, resolverModelos, CFG, PROVEEDORES };
