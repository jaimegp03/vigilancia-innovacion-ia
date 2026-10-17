// Pruebas unitarias de los nodos Code puros del workflow 02 (sin n8n ni red).
// Uso: node tests/unit_nodos_02.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { validadorFuente, leerNodo } = require('../scripts/lib_n8n');

const raiz = path.join(__dirname, '..');
const params = JSON.parse(fs.readFileSync(path.join(raiz, 'config', 'parametros.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(raiz, 'schemas', 'caso.schema.json'), 'utf8'));
const codigo = f => leerNodo(path.join(raiz, 'scripts', 'nodos_02', f)).replace('// __VALIDADOR__', () => validadorFuente);

function ejecutar(archivo, items, { parametros = {}, nodos = {} } = {}) {
  const cfg = { parametros: { ...params, ...parametros }, schema, desde: '2026-10-09', hasta: '2026-10-16' };
  const todos = { 'Cargar configuración': [{ json: cfg }], ...nodos };
  const $ = n => ({ first: () => todos[n][0], all: () => todos[n], itemMatching: k => todos[n][k] });
  const fn = new Function('$input', '$', '$env', `"use strict";
${codigo(archivo)}`);
  const entrada = items.map(json => ({ json }));
  return fn({ all: () => entrada, first: () => entrada[0] }, $, { GOOGLE_SHEET_ID: 'HOJA123' }).map(x => x.json);
}

let n = 0;
const ok = (nombre, f) => { f(); n++; console.log('  ✓', nombre); };
const ahora = d => new Date(Date.now() - d * 86400000).toISOString();
const fila = (id, extra = {}) => ({ id, titulo_caso: 'Caso ' + id, fecha_ingesta: ahora(1), puntuacion_total: '50', sector: 'otros', relevancia_sector: '', ...extra });

console.log('Casos de la semana');
ok('fase 1 (sector_foco null): no filtra por sector y ordena por puntuación', () => {
  const [r] = ejecutar('casos_semana.js', [fila('a', { puntuacion_total: '40' }), fila('b', { puntuacion_total: '80' })], { parametros: { sector_foco: null } });
  assert.deepStrictEqual(r.ids_prompt, ['b', 'a']);
});
ok('modo sectorial: deja el sector foco y los casos con relevancia suficiente', () => {
  const filas = [
    fila('banco', { sector: 'banca_seguros' }),
    fila('otro_relevante', { sector: 'tecnologia_software', relevancia_sector: '4' }),
    fila('otro_irrelevante', { sector: 'agricultura', relevancia_sector: '1' }),
    fila('sin_dato', { sector: 'turismo_hosteleria' }),
  ];
  const [r] = ejecutar('casos_semana.js', filas, { parametros: { sector_foco: 'banca_seguros', relevancia_sector_minima: 3 } });
  assert.deepStrictEqual(r.ids_prompt.sort(), ['banco', 'otro_relevante']);
});
ok('ignora casos de hace más de 7 días y filas repetidas', () => {
  const [r] = ejecutar('casos_semana.js', [fila('a'), fila('a'), fila('vieja', { fecha_ingesta: ahora(10) })], { parametros: { sector_foco: null } });
  assert.deepStrictEqual(r.ids_prompt, ['a']);
});
ok('hoja vacía → n_semana 0', () => {
  assert.strictEqual(ejecutar('casos_semana.js', [{}], { parametros: { sector_foco: null } })[0].n_semana, 0);
});

console.log('Validación de tendencias');
const tendenciaBase = ids => ({
  periodo: { desde: 'x', hasta: 'y' }, n_casos_analizados: 1, resumen_ejecutivo: 'Resumen',
  tendencias: [
    { titulo: 'Buena', descripcion: 'd', fuerza: 'media', casos_ids: [ids[0], ids[1]], sectores: [], regiones: [], implicacion: 'i' },
    { titulo: 'Con id inventado', descripcion: 'd', fuerza: 'emergente', casos_ids: [ids[0], 'zzz'], sectores: [], regiones: [], implicacion: 'i' },
  ],
  casos_destacados: [{ id: ids[0], por_que: 'p' }, { id: 'zzz', por_que: 'p' }],
  sectores_mas_activos: [], tecnologias_mas_citadas: [], cautelas: [], limitaciones: null,
});
const validar = obj => ejecutar('validar_tendencias.js', [{ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] }], {
  nodos: { 'Casos de la semana': [{ json: { ids_prompt: ['a', 'b', 'c'], n_prompt: 3 } }] },
})[0];
ok('quita ids inventados y elimina tendencias con menos de 2 casos reales', () => {
  const r = validar(tendenciaBase(['a', 'b']));
  assert.strictEqual(r.estado, 'ok');
  assert.deepStrictEqual(r.tendencias.tendencias.map(t => t.titulo), ['Buena']);
  assert.deepStrictEqual(r.tendencias.casos_destacados.map(c => c.id), ['a']);
  assert.strictEqual(r.tendencias.n_casos_analizados, 3);
});
ok('respuesta que no es JSON → estado invalida', () => assert.strictEqual(validar('No puedo.').estado, 'invalida'));
ok('JSON con enum fuera de lista → estado invalida', () => {
  const o = tendenciaBase(['a', 'b']);
  o.tendencias[0].fuerza = 'enorme';
  assert.strictEqual(validar(o).estado, 'invalida');
});

console.log('Validación de borradores para redes');
const URL_FUENTE = 'https://ejemplo.invalid/caso-1';
const borrador = (textoX, textoLi = 'Texto de LinkedIn ' + URL_FUENTE) => JSON.stringify({
  caso_id: 'c1', linkedin: { texto: textoLi, hashtags: ['#IA'] }, x: { texto: textoX, hashtags: ['#IA'] }, idea_visual: 'Gráfico', avisos_revision: [],
});
const validarRedes = textoJson => ejecutar('validar_redes.js', [{ candidates: [{ content: { parts: [{ text: textoJson }] } }] }], {
  nodos: { 'Preparar prompt redes': [{ json: { id: 'c1', posicion: 1, titulo_caso: 'Caso', fuente: 'F', url: URL_FUENTE, puntuacion_total: 70 } }] },
})[0];
ok('un borrador correcto queda pendiente de revisión', () => {
  const r = validarRedes(borrador('Corto ' + URL_FUENTE));
  assert.strictEqual(r.estado, 'pendiente_revision');
});
ok('si el texto de X excede 270 caracteres, se acorta conservando la URL al final', () => {
  const largo = 'palabra '.repeat(60) + URL_FUENTE; // > 270
  const r = validarRedes(borrador(largo));
  assert.strictEqual(r.estado, 'pendiente_revision', r.errores.join('; '));
  assert.ok(r.borrador.x.texto.length <= 270);
  assert.ok(r.borrador.x.texto.endsWith(URL_FUENTE));
});
ok('sin URL de la fuente se marca para revisar el formato', () => {
  assert.strictEqual(validarRedes(borrador('Sin enlace')).estado, 'revisar_formato');
});
ok('lee también la respuesta con la forma de Claude', () => {
  const r = ejecutar('validar_redes.js', [{ content: [{ type: 'text', text: borrador('X ' + URL_FUENTE) }] }], {
    nodos: { 'Preparar prompt redes': [{ json: { id: 'c1', posicion: 1, titulo_caso: 'Caso', fuente: 'F', url: URL_FUENTE, puntuacion_total: 70 } }] },
  })[0];
  assert.strictEqual(r.estado, 'pendiente_revision');
});

console.log('Mensajes de Telegram');
const tendOk = {
  estado: 'ok', errores: [], ajustes: [],
  tendencias: {
    resumen_ejecutivo: 'Resumen con <etiquetas> & símbolos raros. '.repeat(10),
    tendencias: [
      { titulo: 'Agentes en operaciones', fuerza: 'alta', casos_ids: ['a', 'b', 'c'], implicacion: 'Probar un piloto pequeño.' },
      { titulo: 'Modelos más baratos', fuerza: 'emergente', casos_ids: ['a', 'd'], implicacion: '' },
    ],
    cautelas: ['Pocas métricas verificables'], limitaciones: null,
  },
};
const borr = (i, extra = {}) => ({
  id: 'c' + i, posicion: i, titulo_caso: `Caso <${i}> & "prueba"`, fuente: 'Fuente & Co', url: `https://ejemplo.invalid/c${i}?a=1&b="2"`, puntuacion_total: 90 - i * 10,
  estado: 'pendiente_revision', errores: [],
  borrador: { caso_id: 'c' + i, linkedin: { texto: 'Texto de LinkedIn <largo> '.repeat(40), hashtags: ['#IA'] }, x: { texto: 'Texto X ' + `https://ejemplo.invalid/c${i}`, hashtags: ['#IA'] }, explicacion_sencilla: 'Una empresa usa inteligencia artificial para trabajar más rápido. Antes tardaba días y ahora tarda horas.', por_que_importa: 'Muestra que esta tecnología ya se usa en el día a día.', idea_visual: 'Un gráfico', avisos_revision: ['Verificar cifra'] },
  ...extra,
});
const mensajes = (tend = tendOk, bs = [borr(1), borr(2, { estado: 'revisar_formato', errores: ['x: falta la URL'] }), borr(3, { borrador: null, errores: ['Sin respuesta del modelo'] })]) => ejecutar('mensajes_telegram.js', [{}], {
  nodos: { 'Casos de la semana': [{ json: { n_semana: 17 } }], 'Validar tendencias': [{ json: tend }], 'Validar redes': bs.map(json => ({ json })) },
}).map(m => m.texto);
const equilibrado = t => ['b', 'i', 'blockquote'].every(e => (t.match(new RegExp(`<${e}>`, 'g')) || []).length === (t.match(new RegExp(`</${e}>`, 'g')) || []).length);
ok('genera un mensaje de informe y uno por borrador, todos dentro del límite de Telegram', () => {
  const m = mensajes();
  assert.strictEqual(m.length, 4);
  m.forEach(t => assert.ok(t.length <= 4096, `mensaje de ${t.length} caracteres`));
});
ok('las etiquetas HTML quedan equilibradas y el texto del medio va escapado', () => {
  mensajes().forEach(t => { assert.ok(equilibrado(t), t.slice(0, 80)); assert.ok(!/undefined|NaN/.test(t)); });
  const informe = mensajes()[0];
  assert.ok(informe.includes('&lt;etiquetas&gt; &amp;'));
  assert.ok(informe.includes('href="https://ejemplo.invalid/c1?a=1&amp;b=&quot;2&quot;"'));
});
ok('muestra el periodo en español, la barra de puntuación, el enlace a la hoja y el aviso de borradores con fallos', () => {
  const informe = mensajes()[0];
  assert.ok(informe.includes('9 → 16 de octubre de 2026'));
  assert.ok(informe.includes('▰▰▰▰▰▰▰▰▱▱'));
  assert.ok(informe.includes('https://docs.google.com/spreadsheets/d/HOJA123/edit'));
  assert.ok(informe.includes('<b>1</b> con avisos'));
});
ok('cada borrador incluye el apartado "En palabras sencillas" y el informe una línea sencilla por caso', () => {
  const m = mensajes();
  assert.ok(m[1].includes('EN PALABRAS SENCILLAS'));
  assert.ok(m[1].includes('<blockquote>Una empresa usa inteligencia artificial'));
  assert.ok(m[1].includes('Por qué importa:'));
  assert.ok(m[0].includes('💬 <i>Una empresa usa inteligencia artificial para trabajar más rápido.</i>'), 'la línea del informe usa solo la primera frase');
});
ok('si la IA no escribe la explicación sencilla, el mensaje sigue siendo válido sin ese apartado', () => {
  const sin = borr(1);
  delete sin.borrador.explicacion_sencilla; delete sin.borrador.por_que_importa;
  const m = mensajes(tendOk, [sin]);
  assert.ok(!m[1].includes('EN PALABRAS SENCILLAS') && equilibrado(m[1]) && !m[0].includes('💬'));
});
ok('un texto larguísimo se recorta sin romper el mensaje', () => {
  const grande = borr(1);
  grande.borrador.linkedin.texto = 'palabra '.repeat(900);
  mensajes(tendOk, [grande]).forEach(t => { assert.ok(t.length <= 4096); assert.ok(equilibrado(t)); });
});
ok('un informe muy largo (8 tendencias con textos largos y 5 casos) se compacta sin romper etiquetas', () => {
  const largo = (c, n) => `${c} `.repeat(n).trim();
  const tend8 = { estado: 'ok', errores: [], ajustes: [], tendencias: {
    resumen_ejecutivo: largo('resumen', 200),
    tendencias: Array.from({ length: 8 }, (_, i) => ({ titulo: largo('titulo', 30) + i, fuerza: 'media', casos_ids: ['a', 'b'], implicacion: largo('implicacion', 60) })),
    cautelas: [largo('cautela', 80)], limitaciones: largo('limite', 80),
  } };
  const bs = [1, 2, 3, 4, 5].map(i => borr(i, { titulo_caso: largo('caso', 40) }));
  const m = mensajes(tend8, bs);
  m.forEach(t => { assert.ok(t.length <= 4096, `mensaje de ${t.length}`); assert.ok(equilibrado(t)); });
  assert.ok(m[0].includes('CASOS DESTACADOS') && m[0].includes('BORRADORES PARA REDES'), 'el informe conserva todas las secciones');
});
ok('si las tendencias fallan, lo dice sin romper el informe', () => {
  const t = mensajes({ estado: 'invalida', errores: ['JSON no parseable'], tendencias: null }, [borr(1)])[0];
  assert.ok(t.includes('No se pudo generar el informe de tendencias'));
  assert.ok(equilibrado(t));
});
ok('el mensaje de "sin casos" es legible', () => {
  const t = ejecutar('mensaje_sin_casos.js', [{}])[0].texto;
  assert.ok(t.includes('no hay casos nuevos') && t.includes('HOJA123') && equilibrado(t));
});

console.log(`\n${n} pruebas correctas`);
