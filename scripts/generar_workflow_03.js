// Genera workflows/03_descubrimiento_semanal.json (producción) y tests/03_descubrimiento_semanal.test.json (IA y hojas simuladas).
// Usa la búsqueda web integrada del nodo Anthropic y reutiliza la cola común del workflow 01 (descarga → extracción → clasificación → guardado).
// Uso: node scripts/generar_workflow_03.js
const fs = require('fs');
const path = require('path');
const { constructor, CFG, resolverModelos } = require('./lib_n8n');
const { anadirCola } = require('./cola_pipeline');

const RAIZ = path.join(__dirname, '..');
const prompt01 = fs.readFileSync(path.join(__dirname, 'nodos_01', 'preparar_prompt.js'), 'utf8');

// URLs REALES de dominios que no están en fuentes.json (comprobadas el 16-oct-2026) para la prueba.
const U = {
  A: 'https://www.marktechpost.com/2026/10/15/liquid-ai-d1-ultra-decision-model/',
  B: 'https://www.marktechpost.com/2026/10/15/meta-muse-spark-open-816b-open-weight-model/',
  C: 'https://huggingface.co/blog/reflection-beam',
  D: 'https://huggingface.co/blog/nvidia/scaling-indic-pretraining',
  FUENTE_CONOCIDA: 'https://www.xataka.com/robotica-e-ia/openai-pidio-a-ia-que-terminara-tarea-programacion-acabo-entrando-cartera-ajena-para-conseguirlo',
};

const MOCK_BUSQUEDA = `// SIMULADO (sin clave de API ni búsqueda web): imita la respuesta del nodo Anthropic con la herramienta web_search.
//   consulta 0 → 3 resultados válidos + 1 de un dominio ya vigilado + 1 enlace que el modelo cita pero NO está en los resultados
//   consulta 1 → un enlace repetido de la consulta 0 y uno nuevo
//   consulta 2 → error de la API
//   consulta 3 → el modelo no devuelve JSON (se usan los resultados tal cual)
//   consultas 4 y 5 → sin resultados
const U = ${JSON.stringify(U)};
const resultado = (url, titulo, edad) => ({ type: 'web_search_result', url, title: titulo, page_age: edad, encrypted_content: 'x' });
const bloque = (...rs) => [{ type: 'server_tool_use', name: 'web_search', input: {} }, { type: 'web_search_tool_result', content: rs }];
const texto = (...cands) => ({ type: 'text', text: JSON.stringify({ candidatos: cands.map(([url, titular]) => ({ url, titular, motivo: '(simulado) Caso de ejemplo' })) }) });
const respuestas = [
  [...bloque(resultado(U.A, 'Liquid AI presenta un modelo de decisión', 'October 15, 2026'), resultado(U.B, 'Meta lanza un modelo abierto', 'October 15, 2026'), resultado(U.FUENTE_CONOCIDA, 'Artículo de Xataka', 'October 16, 2026'), resultado(U.C, 'Reflection beam', null)),
    texto([U.A, 'Liquid AI presenta un modelo de decisión'], [U.B, 'Meta lanza un modelo abierto'], [U.FUENTE_CONOCIDA, 'Artículo de Xataka'], ['https://enlace-inventado.example/no-esta-en-los-resultados', 'Inventado'])],
  [...bloque(resultado(U.B, 'Meta lanza un modelo abierto', 'October 15, 2026'), resultado(U.D, 'Preentrenamiento para lenguas indias', 'October 14, 2026')),
    texto([U.B, 'Meta lanza un modelo abierto'], [U.D, 'Preentrenamiento para lenguas indias'])],
  null,
  [...bloque(resultado(U.C, 'Reflection beam', null), resultado(U.A, 'Liquid AI presenta un modelo de decisión', 'October 15, 2026')),
    { type: 'text', text: 'Aquí tienes los enlaces que he encontrado, sin formato JSON.' }],
  [{ type: 'text', text: JSON.stringify({ candidatos: [] }) }],
  [{ type: 'text', text: JSON.stringify({ candidatos: [] }) }],
];
return $input.all().map((it, k) => {
  const r = respuestas[k];
  return { json: r ? { content: r } : { error: 'overloaded_error (simulado)' }, pairedItem: { item: k } };
});`;

function construir({ test }) {
  const proveedor = 'anthropic'; // la búsqueda web con enlaces reales solo está disponible con Claude
  const b = constructor(path.join(__dirname, 'nodos_03'), proveedor);
  const { add, conectar, base, code, nota, hoja, ia, leer } = b;
  const leer01 = f => require('./lib_n8n').leerNodo(path.join(__dirname, 'nodos_01', f));

  nota('Nota · Cabecera', '## 03 · Descubrimiento semanal (opcional)\nBúsqueda web con **Claude** (herramienta de búsqueda del nodo Anthropic) con consultas por región × tipo de innovación, **fuera** de las fuentes de `fuentes.json`. Los artículos encontrados pasan por la misma cola que el workflow 01: descarga → extracción → clasificación → "casos".\n\nConsultas: `config/descubrimiento.json`. Coste: cada búsqueda web se factura aparte.' + (test ? '\n\n**VERSIÓN DE PRUEBA**: la búsqueda y la IA están simuladas; las descargas son reales.' : ''), [-60, -440], 560, 230, test ? 3 : 4);
  nota('Nota · Almacenamiento', '### Bloque de almacenamiento\nIgual que en el workflow 01: cambiar **Leer hoja…**, **Guardar caso**, **Guardar descartado** y **Guardar log** para pasar a Postgres.', [7380, -280], 520, 130, 5);

  if (!test) add(base('Programador semanal', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [3], triggerAtHour: 9 }] } }, [0, -140]));
  add(base('Ejecución manual', 'n8n-nodes-base.manualTrigger', 1, {}, [0, 60]));
  add(base('Leer archivos del proyecto', 'n8n-nodes-base.readWriteFile', 1.1, {
    operation: 'read', fileSelector: '/data/proyecto/{config/*.json,schemas/*.json,prompts/*.md}', options: { dataPropertyName: 'data' },
  }, [240, 0]));
  code('Cargar configuración', leer('cargar_configuracion.js').replace('// __OVERRIDES_PARAMETROS__', resolverModelos(proveedor)), [480, 0]);
  if (!test) conectar('Programador semanal', 'Leer archivos del proyecto');
  conectar('Ejecución manual', 'Leer archivos del proyecto');
  conectar('Leer archivos del proyecto', 'Cargar configuración');

  // URLs ya vistas (mismo bloque que el 01)
  if (test) code('Leer hoja casos', '// SIMULADO: hoja "casos" vacía\nreturn [{ json: {} }];', [720, 0], { alwaysOutputData: true });
  else hoja('Leer hoja casos', 'read', 'casos', [720, 0], { alwaysOutputData: true });
  code('URLs conocidas (casos)', leer01('urls_casos.js'), [960, 0]);
  if (test) code('Leer hoja descartados', '// SIMULADO: hoja "descartados" vacía\nreturn [{ json: {} }];', [1200, 0], { alwaysOutputData: true });
  else hoja('Leer hoja descartados', 'read', 'descartados', [1200, 0], { alwaysOutputData: true });
  code('URLs conocidas (descartados)', leer01('urls_descartados.js'), [1440, 0]);
  conectar('Cargar configuración', 'Leer hoja casos');
  conectar('Leer hoja casos', 'URLs conocidas (casos)');
  conectar('URLs conocidas (casos)', 'Leer hoja descartados');
  conectar('Leer hoja descartados', 'URLs conocidas (descartados)');

  // Búsqueda web
  code('Preparar consultas', leer('preparar_consultas.js'), [1680, 0]);
  conectar('URLs conocidas (descartados)', 'Preparar consultas');
  code('Preparar prompt búsqueda', prompt01.replace(/__PROMPT__/g, 'busqueda').replace('__VARS__', leer('vars_busqueda.txt').trim()), [1920, 0]);
  conectar('Preparar consultas', 'Preparar prompt búsqueda');
  if (test) code('IA · Búsqueda web', MOCK_BUSQUEDA, [2160, 0]);
  else ia('IA · Búsqueda web', 'busqueda', 'max_tokens_busqueda', [2160, 0], {
    webSearch: true,
    maxUses: `={{ ${CFG}.descubrimiento.max_busquedas_por_consulta }}`,
    blockedDomains: `={{ ${CFG}.dominios_bloqueados.join(',') }}`,
  });
  conectar('Preparar prompt búsqueda', 'IA · Búsqueda web');

  code('Extraer candidatos', leer('extraer_candidatos.js'), [2400, 0], { alwaysOutputData: true });
  code('Filtrar dominios conocidos', leer('filtrar_dominios.js'), [2640, 0], { alwaysOutputData: true });
  code('Deduplicar candidatos', leer('deduplicar_candidatos.js'), [2880, 0], { alwaysOutputData: true });
  code('Limitar lote diario', leer01('limitar_lote.js'), [3120, 0]);
  conectar('IA · Búsqueda web', 'Extraer candidatos');
  conectar('Extraer candidatos', 'Filtrar dominios conocidos');
  conectar('Filtrar dominios conocidos', 'Deduplicar candidatos');
  conectar('Deduplicar candidatos', 'Limitar lote diario');

  // Cola común con el workflow 01
  anadirCola(b, { test, leerResumen: () => leer('resumen_ejecucion.js'), marcarPrimera: false });

  return {
    id: test ? 'vigilancia-03-test' : 'vigilancia-03-descubrimiento',
    name: test ? '03 Descubrimiento semanal (PRUEBA, IA simulada)' : '03 Descubrimiento semanal',
    nodes: b.nodos, connections: b.conexiones,
    settings: { executionOrder: 'v1', timezone: 'Europe/Madrid', executionTimeout: 3600 },
    pinData: {}, meta: { templateCredsSetupCompleted: false }, active: false,
  };
}

const salidas = [
  [path.join(RAIZ, 'workflows', 'variante_claude', '03_descubrimiento_semanal.json'), construir({ test: false })],
  [path.join(RAIZ, 'tests', 'variante_claude', '03_descubrimiento_semanal.test.json'), construir({ test: true })],
];
for (const [ruta, wf] of salidas) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(wf, null, 2) + '\n');
  console.log(path.relative(RAIZ, ruta), wf.nodes.length, 'nodos');
}
