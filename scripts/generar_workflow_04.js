// Genera workflows/04_edicion_diaria.json (producción) y tests/04_edicion_diaria.test.json (IA, hojas, escritura y Telegram simulados).
// El código de cada nodo Code vive en scripts/nodos_04/*.js; la lógica de ensamblado, compartida con los ejemplos, en scripts/web/lib_edicion.js.
// Uso: node scripts/generar_workflow_04.js
const fs = require('fs');
const path = require('path');
const { constructor, validadorFuente, resolverModelos } = require('./lib_n8n');

const RAIZ = path.join(__dirname, '..');
const prompt01 = fs.readFileSync(path.join(__dirname, 'nodos_01', 'preparar_prompt.js'), 'utf8');
const preparaReintento = fs.readFileSync(path.join(__dirname, 'nodos_01', 'preparar_reintento.js'), 'utf8');
const libEdicion = fs.readFileSync(path.join(__dirname, 'web', 'lib_edicion.js'), 'utf8').split('if (typeof module')[0];

// Casos de ejemplo (FICTICIOS) para la versión de prueba. Fechas "ahora" para que caigan en la edición de hoy.
const CASOS_EJEMPLO = [
  ['c-ej-01', 'Banco Ejemplo', 'banca_seguros', 'España', 'Asistente de IA para consultas de hipotecas', 88, 5, 'alta'],
  ['c-ej-02', 'Aseguradora Muestra', 'banca_seguros', 'México', 'Triaje automático de siniestros del hogar', 78, 4, 'alta'],
  ['c-ej-03', 'Fábrica Demo', 'industria_manufactura', 'Alemania', 'Visión artificial para control de calidad', 72, 4, 'media'],
  ['c-ej-04', 'Supermercados Prueba', 'retail_comercio', 'España', 'Previsión de demanda de frescos con IA', 64, 3, 'media'],
  ['c-ej-05', 'Hotel Ficticio', 'turismo_hosteleria', 'Portugal', 'Agente de reservas multilingüe', 61, 3, 'media'],
  ['c-ej-06', 'Agencia Humo', 'medios_marketing', 'Reino Unido', 'Campañas completas solo con IA (anuncio sin datos)', 35, 1, 'baja'],
].map(([id, empresa, sector, pais, titulo, punt, evid, conf]) => ({
  id, fecha_ingesta: '__AHORA__', fecha_publicacion: '__HOY__', fuente: 'Fuente (ejemplo)', url: `https://ejemplo.invalid/${id}`, region_fuente: 'España',
  empresa, sector, pais, titulo_caso: `(ejemplo) ${titulo}`, resumen: `(ejemplo) Caso ficticio para probar el workflow: ${titulo.toLowerCase()}.`,
  resultado: '(ejemplo) Resultado ficticio.', tecnologia_ia: 'IA generativa', tipo_innovacion: 'proceso_operaciones', madurez: 'produccion',
  metricas: '[]', confianza: conf, categoria: 'optimizacion_operaciones', evidencia: evid, puntuacion_total: punt,
}));

function construir({ test, proveedor, vacio = false }) {
  const b = constructor(path.join(__dirname, 'nodos_04'), proveedor);
  const sufijo = proveedor === 'anthropic' ? '-claude' : '';
  const etiqueta = proveedor === 'anthropic' ? ' (Claude)' : '';
  const { add, conectar, base, code, nota, si, hoja, ia, telegram, simulado, leer, envolver } = b;

  nota('Nota · Cabecera', '## 04 · Edición diaria\nLee los casos de hoy → **IA editor jefe** (selección y textos) → ensambla la edición → la guarda en `data/ediciones/AAAA-MM-DD.json` → `node web/build.mjs` genera `web/index.html` → aviso por **Telegram**.\n\nURLs, medios, fechas y puntuaciones los copia n8n de los casos: la IA no los escribe. Se ejecuta después del 01 (07:40).', [0, -420], 760, 200, 4);
  nota('Nota · Publicación', '### Publicación en GitHub Pages (DESACTIVADA)\nLos nodos grises de la derecha **Leer web generada → … → Subir archivo a GitHub** están desactivados. Con `web.destino = "local"` no se publica nada.\n\nPara activarlos: sigue la guía **docs/web.md → Publicar en GitHub Pages**. El nodo **Comprobar bloqueo** se niega a continuar si hay ediciones de ejemplo.', [3300, -420], 640, 200, 5);

  // Disparadores
  if (!test) add(base('Programador diario', 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 7, triggerAtMinute: 40 }] } }, [0, -140]));
  add(base('Ejecución manual', 'n8n-nodes-base.manualTrigger', 1, {}, [0, 60]));
  add(base('Leer archivos del proyecto', 'n8n-nodes-base.readWriteFile', 1.1, {
    operation: 'read', fileSelector: '/data/proyecto/{config/*.json,schemas/*.json,prompts/*.md}', options: { dataPropertyName: 'data' },
  }, [240, 0]));
  code('Cargar configuración', leer('cargar_configuracion.js').replace('// __OVERRIDES_PARAMETROS__', resolverModelos(proveedor)), [480, 0]);
  if (!test) conectar('Programador diario', 'Leer archivos del proyecto');
  conectar('Ejecución manual', 'Leer archivos del proyecto');
  conectar('Leer archivos del proyecto', 'Cargar configuración');

  // Casos del día
  if (test) {
    const filas = vacio ? [] : CASOS_EJEMPLO;
    code('Leer hoja casos', `// SIMULADO: filas de ejemplo (ficticias) de la hoja "casos"\nconst filas = ${JSON.stringify(filas)};\nconst hoy = new Date().toISOString().slice(0, 10);\nreturn (filas.length ? filas : [{}]).map(f => ({ json: { ...f, fecha_ingesta: f.fecha_ingesta ? new Date().toISOString() : undefined, fecha_publicacion: hoy } }));`, [720, 0], { alwaysOutputData: true });
  } else {
    hoja('Leer hoja casos', 'read', 'casos', [720, 0], { alwaysOutputData: true });
  }
  code('Casos del día', leer('casos_del_dia.js'), [960, 0]);
  si('¿Hay casos hoy?', '$json.n_dia > 0', [1200, 0]);
  conectar('Cargar configuración', 'Leer hoja casos');
  conectar('Leer hoja casos', 'Casos del día');
  conectar('Casos del día', '¿Hay casos hoy?');
  code('Mensaje: sin casos', leer('mensaje_sin_casos.js'), [1440, 260]);
  conectar('¿Hay casos hoy?', 'Mensaje: sin casos', 1);

  // Editor jefe (IA) con un reintento
  const prep = prompt01.replace(/__PROMPT__/g, 'editor').replace('__VARS__', leer('vars_editor.txt').trim());
  code('Preparar prompt editor', prep, [1440, -120]);
  conectar('¿Hay casos hoy?', 'Preparar prompt editor', 0);
  const simEditor = (nombre, pos) => code(nombre, `// SIMULADO (sin clave de API): el editor elige portada, destacadas y señales débiles con los ids recibidos.\nconst ids = $('Casos del día').first().json.ids_prompt;\nconst casos = $('Casos del día').first().json.casos_prompt;\nconst d = {\n  portada_id: ids[0],\n  destacadas_ids: ids.slice(1, 3),\n  senales_debiles_ids: casos.filter(c => c.puntuacion_total < 50).map(c => c.id),\n  analisis: '(simulado) Edición de prueba: texto de análisis ficticio.',\n  noticias: casos.map((c, k) => ({ caso_id: c.id, titular: '(simulado) ' + c.titulo_caso, entradilla: '(simulado) Entradilla de prueba.', impacto: '(simulado) Impacto de prueba.', tipo_afirmacion: k === 0 ? 'hecho_confirmado' : 'afirmacion_empresa' })),\n};\nreturn [{ json: { ${envolver('JSON.stringify(d)')} } }];`, pos);
  if (test) simEditor('IA · Editor', [1680, -120]); else ia('IA · Editor', 'editor', 'max_tokens_editor', [1680, -120]);
  conectar('Preparar prompt editor', 'IA · Editor');
  const validar = leer('validar_edicion.js').replace('// __VALIDADOR__', validadorFuente);
  code('Validar edición', validar, [1920, -120]);
  conectar('IA · Editor', 'Validar edición');
  si('¿Edición válida?', "$json.estado === 'ok'", [2160, -120]);
  conectar('Validar edición', '¿Edición válida?');
  code('Preparar reintento', preparaReintento, [2160, 120]);
  conectar('¿Edición válida?', 'Preparar reintento', 1);
  if (test) simEditor('IA · Editor (reintento)', [2400, 120]); else ia('IA · Editor (reintento)', 'editor', 'max_tokens_editor', [2400, 120]);
  conectar('Preparar reintento', 'IA · Editor (reintento)');
  code('Validar edición (reintento)', validar, [2640, 120]);
  conectar('IA · Editor (reintento)', 'Validar edición (reintento)');
  si('¿Edición válida tras reintentar?', "$json.estado === 'ok'", [2880, 120]);
  conectar('Validar edición (reintento)', '¿Edición válida tras reintentar?');
  code('Mensaje: error', leer('mensaje_error.js'), [3120, 380]);
  conectar('¿Edición válida tras reintentar?', 'Mensaje: error', 1);

  // Ensamblar, guardar y construir la web
  code('Ensamblar edición', leer('ensamblar_edicion.js').replace('// __VALIDADOR__', validadorFuente).replace('// __LIB_EDICION__', libEdicion), [2400, -120]);
  conectar('¿Edición válida?', 'Ensamblar edición', 0);
  conectar('¿Edición válida tras reintentar?', 'Ensamblar edición', 0);
  if (test) {
    simulado('Guardar edición', 'en producción escribe data/ediciones/AAAA-MM-DD.json', [2640, -120]);
    code('Construir web', "// SIMULADO: en producción ejecuta `node /data/proyecto/web/build.mjs --sin-ejemplos`.\nreturn [{ json: { exitCode: 0, stdout: '(simulado) web/index.html generado', stderr: '' } }];", [2880, -120]);
  } else {
    add(base('Guardar edición', 'n8n-nodes-base.readWriteFile', 1.1, {
      operation: 'write', fileName: '=/data/proyecto/data/ediciones/{{ $json.nombre_archivo }}', dataPropertyName: 'data', options: {},
    }, [2640, -120]));
    add(base('Construir web', 'n8n-nodes-base.executeCommand', 1, { command: 'node /data/proyecto/web/build.mjs --sin-ejemplos' }, [2880, -120], { onError: 'continueErrorOutput' }));
  }
  conectar('Ensamblar edición', 'Guardar edición');
  conectar('Guardar edición', 'Construir web');
  conectar('Construir web', 'Mensaje: error', 1);

  // Publicación en GitHub Pages: nodos DESACTIVADOS por defecto
  const off = { disabled: true };
  add(base('Leer web generada', 'n8n-nodes-base.readWriteFile', 1.1, { operation: 'read', fileSelector: '/data/proyecto/web/index.html', options: { dataPropertyName: 'data' } }, [3120, -120], off));
  code('Comprobar bloqueo', leer('comprobar_bloqueo.js'), [3360, -120], off);
  code('Preparar archivos a publicar', leer('preparar_archivos_publicacion.js'), [3600, -120], off);
  const urlGh = '=https://api.github.com/repos/{{ $json.propietario }}/{{ $json.repo }}/contents/{{ $json.ruta }}';
  add(base('Obtener sha actual', 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'GET', url: `${urlGh}?ref={{ $json.rama }}`, authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }] },
    options: { response: { response: { neverError: true } } },
  }, [3840, -120], { ...off, onError: 'continueRegularOutput' }));
  const P = "$('Preparar archivos a publicar').itemMatching($itemIndex).json";
  add(base('Subir archivo a GitHub', 'n8n-nodes-base.httpRequest', 4.2, {
    method: 'PUT',
    url: `=https://api.github.com/repos/{{ ${P}.propietario }}/{{ ${P}.repo }}/contents/{{ ${P}.ruta }}`,
    authentication: 'predefinedCredentialType', nodeCredentialType: 'githubApi',
    sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }] },
    sendBody: true, contentType: 'json', specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ message: ${P}.mensaje, content: ${P}.base64, branch: ${P}.rama, sha: $json.sha }) }}`,
    options: {},
  }, [4080, -120], off));
  conectar('Construir web', 'Leer web generada', 0);
  conectar('Leer web generada', 'Comprobar bloqueo');
  conectar('Comprobar bloqueo', 'Preparar archivos a publicar');
  conectar('Preparar archivos a publicar', 'Obtener sha actual');
  conectar('Obtener sha actual', 'Subir archivo a GitHub');

  // Aviso
  code('Mensaje: edición lista', leer('mensaje_edicion.js'), [4320, -120]);
  conectar('Subir archivo a GitHub', 'Mensaje: edición lista');
  if (test) code('Enviar a Telegram', '// SIMULADO: en producción envía el mensaje con el nodo Telegram (modo HTML).\nreturn $input.all().map((it, k) => ({ json: { ...it.json, simulado: true, longitud: it.json.texto.length }, pairedItem: { item: k } }));', [4560, 0]);
  else telegram('Enviar a Telegram', [4560, 0], { onError: 'continueRegularOutput' });
  conectar('Mensaje: edición lista', 'Enviar a Telegram');
  conectar('Mensaje: sin casos', 'Enviar a Telegram');
  conectar('Mensaje: error', 'Enviar a Telegram');

  return {
    id: (test ? (vacio ? 'vigilancia-04-vacio' : 'vigilancia-04-test') : 'vigilancia-04-edicion') + sufijo,
    name: (test ? '04 Edición diaria (PRUEBA, IA simulada)' : '04 Edición diaria') + etiqueta,
    nodes: b.nodos, connections: b.conexiones,
    settings: { executionOrder: 'v1', timezone: 'Europe/Madrid', executionTimeout: 900 },
    pinData: {}, meta: { templateCredsSetupCompleted: false }, active: false,
  };
}

const salidas = [];
for (const [proveedor, sub] of [['gemini', ''], ['anthropic', 'variante_claude']]) {
  salidas.push([path.join(RAIZ, 'workflows', sub, '04_edicion_diaria.json'), construir({ test: false, proveedor })]);
  salidas.push([path.join(RAIZ, 'tests', sub, '04_edicion_diaria.test.json'), construir({ test: true, proveedor })]);
  salidas.push([path.join(RAIZ, 'tests', sub, '04_edicion_diaria.vacio.test.json'), construir({ test: true, proveedor, vacio: true })]);
}
for (const [ruta, wf] of salidas) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(wf, null, 2) + '\n');
  console.log(path.relative(RAIZ, ruta), wf.nodes.length, 'nodos');
}
