// Genera workflows/01_ingesta_diaria.json (producción) y tests/01_ingesta_diaria.test.json (IA y hojas simuladas).
// El código de cada nodo Code vive en scripts/nodos_01/*.js; la cola común (descarga → IA → guardado) en scripts/cola_pipeline.js.
// Uso: node scripts/generar_workflow_01.js
const fs = require('fs');
const path = require('path');
const { constructor, resolverModelos } = require('./lib_n8n');
const { anadirCola } = require('./cola_pipeline');

const RAIZ = path.join(__dirname, '..');

function construir({ test, proveedor }) {
  const b = constructor(path.join(__dirname, 'nodos_01'), proveedor);
  const sufijo = proveedor === 'anthropic' ? '-claude' : '';
  const etiqueta = proveedor === 'anthropic' ? ' (Claude)' : '';
  const { add, conectar, base, code, nota, hoja, leer } = b;

  nota('Nota · Cabecera', '## 01 · Ingesta diaria\nLee feeds → filtra (fecha, palabras clave) → deduplica → descarga → **IA de extracción** → **IA de clasificación** → guarda en "casos".\n\nProveedor y modelos de IA, palabras clave, ventana y hojas: `config/parametros.json`. Fuentes: `config/fuentes.json`.' + (test ? '\n\n**VERSIÓN DE PRUEBA**: la IA y las hojas están simuladas.' : ''), [-60, -420], 520, 190, test ? 3 : 4);
  nota('Nota · Almacenamiento', '### Bloque de almacenamiento\nPara pasar de Google Sheets a Postgres solo hay que cambiar los nodos **Leer hoja…**, **Guardar caso**, **Guardar descartado** y **Guardar log**. Los nodos **Formatear fila…** y **Resumen de ejecución** ya producen filas planas con los nombres de columna.', [7380, -280], 560, 170, 5);

  // ---------- Disparadores y configuración ----------
  if (!test) add(base('Programador diario', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7 }] } }, [0, -140]));
  add(base('Ejecución manual', 'n8n-nodes-base.manualTrigger', 1, {}, [0, 60]));
  add(base('Leer archivos del proyecto', 'n8n-nodes-base.readWriteFile', 1.1, {
    operation: 'read',
    fileSelector: '/data/proyecto/{config/*.json,schemas/*.json,prompts/*.md}',
    options: { dataPropertyName: 'data' },
  }, [240, 0]));
  const overrides = test ? 'parametros.max_articulos_por_ejecucion = 5; // PRUEBA: solo 5 artículos' : '';
  code('Cargar configuración', leer('cargar_configuracion.js').replace('// __OVERRIDES_PARAMETROS__', overrides + '\n' + resolverModelos(proveedor)), [480, 0]);
  if (!test) conectar('Programador diario', 'Leer archivos del proyecto');
  conectar('Ejecución manual', 'Leer archivos del proyecto');
  conectar('Leer archivos del proyecto', 'Cargar configuración');

  // ---------- Lectura de URLs ya vistas ----------
  if (test) code('Leer hoja casos', '// SIMULADO: hoja "casos" vacía\nreturn [{ json: {} }];', [720, 0], { alwaysOutputData: true });
  else hoja('Leer hoja casos', 'read', 'casos', [720, 0], { alwaysOutputData: true });
  code('URLs conocidas (casos)', leer('urls_casos.js'), [960, 0]);
  if (test) code('Leer hoja descartados', '// SIMULADO: hoja "descartados" vacía\nreturn [{ json: {} }];', [1200, 0], { alwaysOutputData: true });
  else hoja('Leer hoja descartados', 'read', 'descartados', [1200, 0], { alwaysOutputData: true });
  code('URLs conocidas (descartados)', leer('urls_descartados.js'), [1440, 0]);
  conectar('Cargar configuración', 'Leer hoja casos');
  conectar('Leer hoja casos', 'URLs conocidas (casos)');
  conectar('URLs conocidas (casos)', 'Leer hoja descartados');
  conectar('Leer hoja descartados', 'URLs conocidas (descartados)');

  // ---------- Feeds ----------
  code('Preparar fuentes', leer('preparar_fuentes.js'), [1680, 0]);
  add(base('Leer feed RSS', 'n8n-nodes-base.rssFeedRead', 1.2, { url: '={{ $json.feed_url }}', options: {} }, [1920, 0], { onError: 'continueErrorOutput' }));
  code('Normalizar artículos', leer('normalizar_articulos.js'), [2160, -80], { alwaysOutputData: true });
  code('Errores de feed', leer('errores_feed.js'), [2160, 140]);
  code('Filtrar por fecha', leer('filtrar_fecha.js'), [2400, -80], { alwaysOutputData: true });
  code('Filtrar por palabras clave', leer('filtrar_palabras.js'), [2640, -80], { alwaysOutputData: true });
  code('Deduplicar', leer('deduplicar.js'), [2880, -80], { alwaysOutputData: true });
  code('Limitar lote diario', leer('limitar_lote.js'), [3120, -80]);
  conectar('URLs conocidas (descartados)', 'Preparar fuentes');
  conectar('Preparar fuentes', 'Leer feed RSS');
  conectar('Leer feed RSS', 'Normalizar artículos', 0);
  conectar('Leer feed RSS', 'Errores de feed', 1);
  conectar('Normalizar artículos', 'Filtrar por fecha');
  conectar('Filtrar por fecha', 'Filtrar por palabras clave');
  conectar('Filtrar por palabras clave', 'Deduplicar');
  conectar('Deduplicar', 'Limitar lote diario');

  // ---------- Descarga, IA, guardado y registro (común con el workflow 03) ----------
  anadirCola(b, { test, leerResumen: () => leer('resumen_ejecucion.js'), marcarPrimera: true });

  return {
    id: (test ? 'vigilancia-01-test' : 'vigilancia-01-ingesta') + sufijo,
    name: (test ? '01 Ingesta diaria (PRUEBA, IA simulada)' : '01 Ingesta diaria') + etiqueta,
    nodes: b.nodos,
    connections: b.conexiones,
    settings: { executionOrder: 'v1', timezone: 'Europe/Madrid', executionTimeout: 3600 },
    pinData: {},
    meta: { templateCredsSetupCompleted: false },
    active: false,
  };
}

// Por defecto Gemini (capa gratuita); la variante Claude va en workflows/variante_claude/ y tests/variante_claude/.
const salidas = [];
for (const [proveedor, sub] of [['gemini', ''], ['anthropic', 'variante_claude']]) {
  salidas.push([path.join(RAIZ, 'workflows', sub, '01_ingesta_diaria.json'), construir({ test: false, proveedor })]);
  salidas.push([path.join(RAIZ, 'tests', sub, '01_ingesta_diaria.test.json'), construir({ test: true, proveedor })]);
}
for (const [ruta, wf] of salidas) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(wf, null, 2) + '\n');
  console.log(path.relative(RAIZ, ruta), wf.nodes.length, 'nodos');
}
