// Cola común de los workflows 01 y 03: descarga → texto limpio → IA extracción (con 1 reintento) → IA clasificación → guardado → registro.
// Empieza en el nodo "¿Hay artículos nuevos?", que cuelga del nodo `previo` (por defecto "Limitar lote diario").
// El código de los nodos vive en scripts/nodos_01/ (y el resumen de cada workflow en su carpeta).
const fs = require('fs');
const path = require('path');
const { CFG, validadorFuente, leerNodo } = require('./lib_n8n');

const leer = f => leerNodo(path.join(__dirname, 'nodos_01', f));

function anadirCola(b, { test, dx = 0, previo = 'Limitar lote diario', leerResumen, marcarPrimera = false }) {
  const { add, conectar, base, code, si, unir, hoja, ia, simulado, envolver } = b;
  // ---------- Descarga y texto ----------
  si('¿Hay artículos nuevos?', '!$json.vacio', [3360 + dx, -80]);
  conectar(previo, '¿Hay artículos nuevos?');
  add(base('Descargar artículo', 'n8n-nodes-base.httpRequest', 4.2, {
    url: '={{ $json.url }}',
    sendHeaders: true,
    headerParameters: { parameters: [
      { name: 'User-Agent', value: 'Mozilla/5.0 (compatible; vigilancia-ia/1.0)' },
      { name: 'Accept-Language', value: 'es,en;q=0.8' },
    ] },
    options: {
      timeout: `={{ ${CFG}.parametros.procesamiento.timeout_descarga_ms }}`,
      batching: { batch: { batchSize: `={{ ${CFG}.parametros.procesamiento.tamano_lote }}`, batchInterval: `={{ ${CFG}.parametros.procesamiento.pausa_entre_lotes_ms }}` } },
      response: { response: { fullResponse: true, responseFormat: 'text', neverError: true } },
    },
  }, [3600 + dx, -160], { onError: 'continueRegularOutput' }));
  code('Extraer texto limpio', leer('extraer_texto.js'), [3840 + dx, -160]);
  conectar('¿Hay artículos nuevos?', 'Descargar artículo', 0);
  conectar('Descargar artículo', 'Extraer texto limpio');

  // ---------- Extracción ----------
  const varsExtraccion = '{ fuente: j.fuente, fecha_publicacion: (j.fecha_publicacion || "").slice(0, 10), idioma: j.idioma, acceso: j.acceso, titular: j.titular, texto: j.texto }';
  code('Preparar prompt extracción', leer('preparar_prompt.js').replace(/__PROMPT__/g, 'extraccion').replace('__VARS__', varsExtraccion), [4080 + dx, -160]);
  conectar('Extraer texto limpio', 'Preparar prompt extracción');

  const mockValido = `{ es_caso: true, motivo_no_caso: null, empresa: '(simulado) ' + j.fuente, sector: 'tecnologia_software', pais: 'España', titulo_caso: '(simulado) ' + j.titular.slice(0, 100), resumen: '(simulado) Texto de prueba generado por el mock, no por Claude.', tecnologia_ia: ['IA generativa'], tipo_innovacion: 'producto_servicio', madurez: 'anuncio', resultado: null, metricas: [], confianza: j.acceso === 'parcial' ? 'baja' : 'media' }`;
  if (test) {
    code('IA · Extracción', `// SIMULADO (sin clave de API): imita la respuesta del modelo de IA.\n// Posición 1 → responde sin JSON (fuerza el reintento); posición 2 → "no es un caso"; el resto → caso válido.\nreturn $input.all().map((it, k) => {\n  const j = it.json;\n  const noCaso = { es_caso: false, motivo_no_caso: 'Artículo de opinión sin caso concreto (simulado)', empresa: null, sector: null, pais: null, titulo_caso: null, resumen: null, tecnologia_ia: [], tipo_innovacion: null, madurez: null, resultado: null, metricas: [], confianza: 'baja' };\n  const texto = k === 1 ? 'Aquí tienes el análisis en prosa, sin JSON.' : JSON.stringify(k === 2 ? noCaso : ${mockValido});\n  return { json: { ${envolver('texto')} }, pairedItem: { item: k } };\n});`, [4320 + dx, -160]);
  } else {
    ia('IA · Extracción', 'extraccion', 'max_tokens_extraccion', [4320 + dx, -160]);
  }
  conectar('Preparar prompt extracción', 'IA · Extracción');
  code('Validar extracción', leer('validar_extraccion.js').replace('// __VALIDADOR__', validadorFuente).replace('__PREVIO__', 'Preparar prompt extracción').replace('__INTENTO__', '1'), [4560 + dx, -160]);
  conectar('IA · Extracción', 'Validar extracción');
  si('¿Extracción válida?', '$json.valido', [4800 + dx, -160]);
  conectar('Validar extracción', '¿Extracción válida?');

  // Reintento (una sola vez)
  code('Preparar reintento extracción', leer('preparar_reintento.js'), [5040 + dx, 40]);
  conectar('¿Extracción válida?', 'Preparar reintento extracción', 1);
  if (test) {
    code('IA · Extracción (reintento)', `// SIMULADO: el reintento devuelve un caso válido.\nreturn $input.all().map((it, k) => {\n  const j = it.json;\n  return { json: { ${envolver('JSON.stringify(' + mockValido + ')')} }, pairedItem: { item: k } };\n});`, [5280 + dx, 40]);
  } else {
    ia('IA · Extracción (reintento)', 'extraccion', 'max_tokens_extraccion', [5280 + dx, 40]);
  }
  conectar('Preparar reintento extracción', 'IA · Extracción (reintento)');
  code('Validar extracción (reintento)', leer('validar_extraccion.js').replace('// __VALIDADOR__', validadorFuente).replace('__PREVIO__', 'Preparar reintento extracción').replace('__INTENTO__', '2'), [5520 + dx, 40]);
  conectar('IA · Extracción (reintento)', 'Validar extracción (reintento)');
  si('¿Reintento válido?', '$json.valido', [5760 + dx, 40]);
  conectar('Validar extracción (reintento)', '¿Reintento válido?');

  unir('Unir extracciones válidas', 2, [5760 + dx, -160]);
  conectar('¿Extracción válida?', 'Unir extracciones válidas', 0, 0);
  conectar('¿Reintento válido?', 'Unir extracciones válidas', 0, 1);
  code('Descartar: extracción inválida', leer('descartar.js').replace('__MOTIVO__', "'Extracción inválida tras reintento: ' + (j.errores_validacion || []).join('; ')").replace('__ETAPA__', 'extraccion'), [6000 + dx, 140]);
  conectar('¿Reintento válido?', 'Descartar: extracción inválida', 1);

  // ---------- Clasificación ----------
  si('¿Es un caso?', '$json.extraccion.es_caso', [6000 + dx, -160]);
  conectar('Unir extracciones válidas', '¿Es un caso?');
  code('Descartar: no es un caso', leer('descartar.js').replace('__MOTIVO__', "j.extraccion.motivo_no_caso || 'No es un caso de innovación con IA'").replace('__ETAPA__', 'es_caso'), [6240 + dx, -40]);
  conectar('¿Es un caso?', 'Descartar: no es un caso', 1);
  const varsClasif = "{ sector_foco: cfg.parametros.sector_foco || 'ninguno', extraccion_json: JSON.stringify(j.extraccion, null, 1) }";
  code('Preparar prompt clasificación', leer('preparar_prompt.js').replace(/__PROMPT__/g, 'clasificacion').replace('__VARS__', varsClasif), [6240 + dx, -260]);
  conectar('¿Es un caso?', 'Preparar prompt clasificación', 0);
  if (test) {
    code('IA · Clasificación', `// SIMULADO (sin clave de API). El último artículo recibe una puntuación fuera de rango para probar el descarte.\nconst n = $input.all().length;\nreturn $input.all().map((it, k) => {\n  const cls = { categoria: 'otros', novedad: 3, impacto: 3, replicabilidad: 3, evidencia: 2, relevancia_sector: null, etiquetas: ['simulado', 'prueba'], justificacion: '(simulado) Puntuación de prueba generada por el mock, no por Claude.' };\n  if (n > 2 && k === n - 1) cls.impacto = 9;\n  return { json: { ${envolver('JSON.stringify(cls)')} }, pairedItem: { item: k } };\n});`, [6480 + dx, -260]);
  } else {
    ia('IA · Clasificación', 'clasificacion', 'max_tokens_clasificacion', [6480 + dx, -260]);
  }
  conectar('Preparar prompt clasificación', 'IA · Clasificación');
  code('Validar clasificación', leer('validar_clasificacion.js').replace('// __VALIDADOR__', validadorFuente), [6720 + dx, -260]);
  conectar('IA · Clasificación', 'Validar clasificación');

  // ---------- Reparto y guardado ----------
  unir('Unir resultados', 3, [6960 + dx, 0]);
  conectar('Validar clasificación', 'Unir resultados', 0, 0);
  conectar('Descartar: extracción inválida', 'Unir resultados', 0, 1);
  conectar('Descartar: no es un caso', 'Unir resultados', 0, 2);
  si('¿Se guarda como caso?', "$json.destino === 'casos'", [7200 + dx, 0]);
  conectar('Unir resultados', '¿Se guarda como caso?');

  code('Formatear fila caso', leer('formatear_fila_caso.js'), [7440 + dx, -80]);
  if (test) simulado('Guardar caso', 'en producción escribe en la hoja "casos"', [7680 + dx, -80]);
  else hoja('Guardar caso', 'append', 'casos', [7680 + dx, -80]);
  conectar('¿Se guarda como caso?', 'Formatear fila caso', 0);
  conectar('Formatear fila caso', 'Guardar caso');

  code('Formatear fila descartado', leer('formatear_fila_descartado.js'), [7440 + dx, 100]);
  if (test) simulado('Guardar descartado', 'en producción escribe en la hoja "descartados"', [7680 + dx, 100]);
  else hoja('Guardar descartado', 'append', 'descartados', [7680 + dx, 100]);
  conectar('¿Se guarda como caso?', 'Formatear fila descartado', 1);
  conectar('Formatear fila descartado', 'Guardar descartado');

  // ---------- Registro ----------
  unir('Unir y registrar', 4, [7920 + dx, 0]);
  conectar('Guardar caso', 'Unir y registrar', 0, 0);
  conectar('Guardar descartado', 'Unir y registrar', 0, 1);
  conectar('¿Hay artículos nuevos?', 'Unir y registrar', 1, 2);
  // Entrada directa: aunque no se guarde nada (p. ej. todos omitidos por un fallo de la API), el registro de la ejecución se escribe siempre.
  conectar('Unir resultados', 'Unir y registrar', 0, 3);
  code('Resumen de ejecución', leerResumen(), [8160 + dx, 0]);
  conectar('Unir y registrar', 'Resumen de ejecución');
  if (test) simulado('Guardar log', 'en producción escribe en la hoja "log_ejecuciones"', [8400 + dx, 0]);
  else hoja('Guardar log', 'append', 'log_ejecuciones', [8400 + dx, 0]);
  conectar('Resumen de ejecución', 'Guardar log');
  if (marcarPrimera) {
    code('Marcar primera ejecución', "// Tras registrar con éxito, las siguientes ejecuciones usan la ventana normal (7 días).\n$getWorkflowStaticData('global').primera_ejecucion_hecha = true;\nreturn $input.all();", [8640 + dx, 0]);
    conectar('Guardar log', 'Marcar primera ejecución');
  }
}

module.exports = { anadirCola };
