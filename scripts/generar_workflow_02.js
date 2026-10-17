// Genera workflows/02_informe_semanal.json (producción) y tests/02_informe_semanal.test.json (IA, hojas y Telegram simulados).
// El código de cada nodo Code vive en scripts/nodos_02/*.js (y el preparador de prompts, compartido, en nodos_01/).
// Uso: node scripts/generar_workflow_02.js
const fs = require('fs');
const path = require('path');
const { constructor, validadorFuente, resolverModelos } = require('./lib_n8n');

const RAIZ = path.join(__dirname, '..');
const prompt01 = fs.readFileSync(path.join(__dirname, 'nodos_01', 'preparar_prompt.js'), 'utf8');

// Casos de ejemplo (FICTICIOS) para la versión de prueba; fechas relativas a "ahora".
const CASOS_EJEMPLO = [
  ['c-ej-01', 'Banco Ejemplo', 'banca_seguros', 'España', 'Asistente de IA para consultas de hipotecas', 1, 82, 4],
  ['c-ej-02', 'Aseguradora Muestra', 'banca_seguros', 'México', 'Triaje automático de siniestros del hogar', 2, 74, 4],
  ['c-ej-03', 'Fábrica Demo', 'industria_manufactura', 'Alemania', 'Visión artificial para control de calidad', 2, 71, 3],
  ['c-ej-04', 'Supermercados Prueba', 'retail_comercio', 'España', 'Previsión de demanda de frescos con IA', 3, 66, 3],
  ['c-ej-05', 'Hotel Ficticio', 'turismo_hosteleria', 'Portugal', 'Agente de reservas multilingüe', 4, 63, 2],
  ['c-ej-06', 'Logística Test', 'logistica_transporte', 'Chile', 'Optimización de rutas con IA', 5, 58, 3],
  ['c-ej-07', 'Clínica Imaginaria', 'salud_farma', 'Colombia', 'Resumen automático de historias clínicas', 6, 55, 2],
  ['c-ej-08', 'Energía Simulada', 'energia_utilities', 'España', 'Mantenimiento predictivo de turbinas', 20, 90, 5], // fuera de la semana
].map(([id, empresa, sector, pais, titulo, dias, punt, evid]) => ({
  id, fecha_ingesta: `__AHORA_MENOS_${dias}D__`, fuente: 'Fuente (ejemplo)', url: `https://ejemplo.invalid/${id}`, region_fuente: 'España',
  empresa, sector, pais, titulo_caso: `(ejemplo) ${titulo}`, resumen: `(ejemplo) Caso ficticio para probar el workflow: ${titulo.toLowerCase()}.`,
  tecnologia_ia: 'IA generativa; agentes', tipo_innovacion: 'proceso_operaciones', madurez: 'produccion', metricas: '[{"descripcion":"Ahorro de tiempo","valor":"30 %"}]',
  confianza: 'media', categoria: 'optimizacion_operaciones', evidencia: evid, puntuacion_total: punt, etiquetas: 'ejemplo; prueba',
}));

function construir({ test, proveedor, vacio = false }) {
  const b = constructor(path.join(__dirname, 'nodos_02'), proveedor);
  const sufijo = proveedor === 'anthropic' ? '-claude' : '';
  const etiqueta = proveedor === 'anthropic' ? ' (Claude)' : '';
  const { add, conectar, base, code, nota, si, hoja, ia, telegram, simulado, leer, envolver } = b;

  b.nota('Nota · Cabecera', '## 02 · Informe semanal\nLee los casos de la semana → **IA de tendencias** (una sola llamada) → guarda en "tendencias" → top 5 casos → **IA de redes** (uno por caso) → guarda en "borradores_redes" → resumen por **Telegram**.\n\nLos borradores NO se publican: siempre quedan pendientes de revisión humana.' + (test ? '\n\n**VERSIÓN DE PRUEBA**: IA, hojas y Telegram simulados.' : ''), [-60, -420], 560, 200, test ? 3 : 4);
  b.nota('Nota · Almacenamiento', '### Bloque de almacenamiento\nPara cambiar a Postgres: sustituir **Leer hoja casos**, **Guardar tendencias** y **Guardar borradores**. Los nodos **Formatear fila…** ya dan filas planas con los nombres de columna.', [1500, -300], 520, 150, 5);

  // Disparadores
  if (!test) add(base('Programador semanal', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 7, triggerAtMinute: 30 }] } }, [0, -140]));
  add(base('Ejecución manual', 'n8n-nodes-base.manualTrigger', 1, {}, [0, 60]));
  add(base('Leer archivos del proyecto', 'n8n-nodes-base.readWriteFile', 1.1, {
    operation: 'read', fileSelector: '/data/proyecto/{config/*.json,schemas/*.json,prompts/*.md}', options: { dataPropertyName: 'data' },
  }, [240, 0]));
  code('Cargar configuración', leer('cargar_configuracion.js').replace('// __OVERRIDES_PARAMETROS__', resolverModelos(proveedor)), [480, 0]);
  if (!test) conectar('Programador semanal', 'Leer archivos del proyecto');
  conectar('Ejecución manual', 'Leer archivos del proyecto');
  conectar('Leer archivos del proyecto', 'Cargar configuración');

  // Casos de la semana
  if (test) {
    const filas = vacio ? [] : CASOS_EJEMPLO;
    code('Leer hoja casos', `// SIMULADO: filas de ejemplo (ficticias) de la hoja "casos"\nconst filas = ${JSON.stringify(filas)};\nreturn (filas.length ? filas : [{}]).map(f => ({ json: { ...f, fecha_ingesta: (f.fecha_ingesta || '').replace(/__AHORA_MENOS_(\\d+)D__/, (m, d) => new Date(Date.now() - Number(d) * 86400000).toISOString()) } }));`, [720, 0], { alwaysOutputData: true });
  } else {
    hoja('Leer hoja casos', 'read', 'casos', [720, 0], { alwaysOutputData: true });
  }
  code('Casos de la semana', leer('casos_semana.js'), [960, 0]);
  si('¿Hay casos esta semana?', '$json.n_semana > 0', [1200, 0]);
  conectar('Cargar configuración', 'Leer hoja casos');
  conectar('Leer hoja casos', 'Casos de la semana');
  conectar('Casos de la semana', '¿Hay casos esta semana?');

  // Sin casos → aviso
  code('Mensaje: sin casos', leer('mensaje_sin_casos.js'), [1440, 220]);
  conectar('¿Hay casos esta semana?', 'Mensaje: sin casos', 1);

  // Tendencias
  const prepTend = prompt01.replace(/__PROMPT__/g, 'tendencias').replace('__VARS__', leer('vars_tendencias.txt').trim());
  code('Preparar prompt tendencias', prepTend.replace("return $input.all().map(it => {\n  const j = it.json;", "return $input.all().map(it => {\n  const j = it.json;"), [1440, -120]);
  conectar('¿Hay casos esta semana?', 'Preparar prompt tendencias', 0);
  if (test) {
    code('IA · Tendencias', `// SIMULADO (sin clave de API). Incluye a propósito ids inventados para probar la limpieza.\nconst ids = $('Casos de la semana').first().json.ids_prompt;\nconst t = {\n  periodo: { desde: '2000-01-01', hasta: '2000-01-07' },\n  n_casos_analizados: 999,\n  resumen_ejecutivo: '(simulado) Resumen de prueba generado por el mock, no por Claude.',\n  tendencias: [\n    { titulo: '(simulado) Agentes en banca y seguros', descripcion: 'Descripción de prueba.', fuerza: 'media', casos_ids: ids.slice(0, 3), sectores: ['banca_seguros'], regiones: ['España'], implicacion: 'Implicación de prueba.' },\n    { titulo: '(simulado) Tendencia con un solo caso real', descripcion: 'Debe eliminarse.', fuerza: 'emergente', casos_ids: [ids[3], 'id-inventado'], sectores: [], regiones: [], implicacion: 'x' },\n  ],\n  casos_destacados: [{ id: ids[0], por_que: 'Mayor puntuación (simulado).' }, { id: 'id-inventado', por_que: 'No existe.' }],\n  sectores_mas_activos: [{ sector: 'banca_seguros', n_casos: 2 }],\n  tecnologias_mas_citadas: [{ tecnologia: 'IA generativa', n_casos: ids.length }],\n  cautelas: ['(simulado) Datos de ejemplo.'],\n  limitaciones: null,\n};\nreturn [{ json: { ${envolver('JSON.stringify(t)')} } }];`, [1680, -120]);
  } else {
    ia('IA · Tendencias', 'tendencias', 'max_tokens_tendencias', [1680, -120]);
  }
  conectar('Preparar prompt tendencias', 'IA · Tendencias');
  code('Validar tendencias', leer('validar_tendencias.js').replace('// __VALIDADOR__', validadorFuente), [1920, -120]);
  conectar('IA · Tendencias', 'Validar tendencias');
  code('Formatear fila tendencias', leer('formatear_fila_tendencias.js'), [2160, -120]);
  if (test) simulado('Guardar tendencias', 'en producción escribe en la hoja "tendencias"', [2400, -120]);
  else hoja('Guardar tendencias', 'append', 'tendencias', [2400, -120]);
  conectar('Validar tendencias', 'Formatear fila tendencias');
  conectar('Formatear fila tendencias', 'Guardar tendencias');

  // Borradores para redes (uno por caso)
  code('Seleccionar top casos', leer('seleccionar_top.js'), [2640, -120]);
  conectar('Guardar tendencias', 'Seleccionar top casos');
  const prepRedes = prompt01.replace(/__PROMPT__/g, 'redes').replace('__VARS__', leer('vars_redes.txt').trim());
  code('Preparar prompt redes', prepRedes, [2880, -120]);
  conectar('Seleccionar top casos', 'Preparar prompt redes');
  if (test) {
    code('IA · Redes', `// SIMULADO (sin clave de API). Posición 1 → sin URL (aviso de formato); posición 2 → no es JSON.\nreturn $input.all().map((it, k) => {\n  const j = it.json;\n  const url = j.url;\n  const d = { caso_id: j.id, linkedin: { texto: '(simulado) Borrador de LinkedIn sobre: ' + j.titulo_caso + '. Fuente: ' + url, hashtags: ['#IA', '#Innovación'] }, x: { texto: '(simulado) Borrador de X. ' + url, hashtags: ['#IA'] }, explicacion_sencilla: '(simulado) Una empresa ha empezado a usar una herramienta de inteligencia artificial para trabajar más rápido.', por_que_importa: '(simulado) Muestra que esta tecnología ya se usa en el día a día.', idea_visual: '(simulado) Gráfico de barras con la mejora declarada.', avisos_revision: [] };\n  d.linkedin.texto = d.linkedin.texto.replace('undefined', j.titulo_caso);\n  if (k === 1) { d.linkedin.texto = '(simulado) Texto sin la URL.'; }\n  const texto = k === 2 ? 'No puedo darte JSON ahora.' : JSON.stringify(d);\n  return { json: { ${envolver('texto')} }, pairedItem: { item: k } };\n});`, [3120, -120]);
  } else {
    ia('IA · Redes', 'redes', 'max_tokens_redes', [3120, -120]);
  }
  conectar('Preparar prompt redes', 'IA · Redes');
  code('Validar redes', leer('validar_redes.js').replace('// __VALIDADOR__', validadorFuente), [3360, -120]);
  conectar('IA · Redes', 'Validar redes');
  code('Formatear fila borrador', leer('formatear_fila_borrador.js'), [3600, -120]);
  if (test) simulado('Guardar borradores', 'en producción escribe en la hoja "borradores_redes"', [3840, -120]);
  else hoja('Guardar borradores', 'append', 'borradores_redes', [3840, -120]);
  conectar('Validar redes', 'Formatear fila borrador');
  conectar('Formatear fila borrador', 'Guardar borradores');

  // Telegram
  code('Preparar mensajes Telegram', leer('mensajes_telegram.js'), [4080, -120]);
  conectar('Guardar borradores', 'Preparar mensajes Telegram');
  if (test) {
    code('Enviar a Telegram', '// SIMULADO: en producción envía cada mensaje con el nodo Telegram (modo HTML).\nreturn $input.all().map((it, k) => ({ json: { ...it.json, simulado: true, longitud: it.json.texto.length }, pairedItem: { item: k } }));', [4320, 0]);
  } else {
    telegram('Enviar a Telegram', [4320, 0]);
  }
  conectar('Preparar mensajes Telegram', 'Enviar a Telegram');
  conectar('Mensaje: sin casos', 'Enviar a Telegram');

  return {
    id: (test ? (vacio ? 'vigilancia-02-vacio' : 'vigilancia-02-test') : 'vigilancia-02-informe') + sufijo,
    name: (test ? '02 Informe semanal (PRUEBA, IA simulada)' : '02 Informe semanal') + etiqueta,
    nodes: b.nodos, connections: b.conexiones,
    settings: { executionOrder: 'v1', timezone: 'Europe/Madrid', executionTimeout: 1800 },
    pinData: {}, meta: { templateCredsSetupCompleted: false }, active: false,
  };
}

const salidas = [];
for (const [proveedor, sub] of [['gemini', ''], ['anthropic', 'variante_claude']]) {
  salidas.push([path.join(RAIZ, 'workflows', sub, '02_informe_semanal.json'), construir({ test: false, proveedor })]);
  salidas.push([path.join(RAIZ, 'tests', sub, '02_informe_semanal.test.json'), construir({ test: true, proveedor })]);
  salidas.push([path.join(RAIZ, 'tests', sub, '02_informe_semanal.vacio.test.json'), construir({ test: true, proveedor, vacio: true })]);
}
for (const [ruta, wf] of salidas) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(wf, null, 2) + '\n');
  console.log(path.relative(RAIZ, ruta), wf.nodes.length, 'nodos');
}
