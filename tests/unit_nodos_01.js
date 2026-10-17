// Pruebas unitarias de los nodos Code puros del workflow 01 (sin n8n ni red).
// Uso: node tests/unit_nodos_01.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { leerNodo } = require('../scripts/lib_n8n');
const cargar = f => leerNodo(path.join(__dirname, '..', 'scripts', 'nodos_01', f));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'parametros.json'), 'utf8'));

// Ejecuta el código de un nodo con un entorno $ mínimo.
function ejecutar(archivo, items, nodos = {}) {
  const todos = { 'Cargar configuración': [{ json: { parametros: params, ventana_dias: 7 } }], ...nodos };
  const $ = nombre => ({
    first: () => todos[nombre][0],
    all: () => todos[nombre],
    itemMatching: k => todos[nombre][k],
  });
  // El tercer parámetro "URL" se pasa como undefined: en el sandbox de n8n ese global no existe y el código no debe depender de él.
  const fn = new Function('$input', '$', 'URL', `"use strict";\n${cargar(archivo)}`);
  return fn({ all: () => items.map(json => ({ json })) }, $, undefined).map(x => x.json);
}
let n = 0;
const ok = (nombre, f) => { f(); n++; console.log('  ✓', nombre); };

console.log('Filtro por palabras clave');
const art = (titular, resumen_feed = '') => ({ url: 'https://x.es/' + titular, titular, resumen_feed });
ok('incluye "IA" como palabra completa y distingue mayúsculas', () => {
  const r = ejecutar('filtrar_palabras.js', [art('La IA llega a los bancos'), art('Mi familia y mi Lía'), art('Said, la novela')]);
  assert.deepStrictEqual(r.map(x => x.titular), ['La IA llega a los bancos']);
});
ok('incluye "inteligencia artificial" sin importar acentos ni mayúsculas', () => {
  const r = ejecutar('filtrar_palabras.js', [art('Inteligencia Artificial en el campo'), art('Inteligencia artificial'.normalize('NFD'))]);
  assert.strictEqual(r.length, 2);
});
ok('busca también en el resumen del feed', () => {
  assert.strictEqual(ejecutar('filtrar_palabras.js', [art('Un banco estrena algo', 'usa machine learning para el riesgo')]).length, 1);
});
ok('excluye por titular (chollos) aunque mencione IA', () => {
  assert.strictEqual(ejecutar('filtrar_palabras.js', [art('Chollo: móvil con IA a mitad de precio')]).length, 0);
});
ok('descarta artículos sin palabras clave', () => {
  assert.strictEqual(ejecutar('filtrar_palabras.js', [art('Resultados de la liga de fútbol')]).length, 0);
});

console.log('Deduplicación');
const conocidas = { 'URLs conocidas (descartados)': [{ json: { urls: ['x.es/ya-guardado'] } }] };
const d = (u, f) => ({ url: 'https://' + u, url_normalizada: u, fecha_publicacion: f, titular: u });
ok('quita URLs ya guardadas y repetidas en el mismo lote, y asigna id', () => {
  const r = ejecutar('deduplicar.js', [d('x.es/a', '2026-10-15T10:00:00Z'), d('x.es/ya-guardado', '2026-10-15T11:00:00Z'), d('x.es/a', '2026-10-15T12:00:00Z'), d('x.es/b', '2026-10-16T09:00:00Z')], conocidas);
  assert.deepStrictEqual(r.map(x => x.url_normalizada), ['x.es/b', 'x.es/a']); // más reciente primero
  assert.ok(r.every(x => /^c[0-9a-z]+$/.test(x.id)));
  assert.notStrictEqual(r[0].id, r[1].id);
});
ok('el id es estable entre ejecuciones', () => {
  const a = ejecutar('deduplicar.js', [d('x.es/a', '2026-10-15T10:00:00Z')], conocidas)[0].id;
  const b = ejecutar('deduplicar.js', [d('x.es/a', '2026-10-15T10:00:00Z')], conocidas)[0].id;
  assert.strictEqual(a, b);
});

console.log('Normalización de artículos');
const fuente = { json: { nombre: 'Fuente', tipo: 'revista', region: 'España', idioma: 'es', acceso: 'abierto' } };
const norm = link => ejecutar('normalizar_articulos.js', [{ title: 'T &amp; <b>x</b>', link, isoDate: '2026-10-15T10:00:00.000Z', contentSnippet: 'Resumen' }], { 'Preparar fuentes': [fuente] })[0];
ok('quita utm_*, fragmento, www y barra final', () => {
  assert.strictEqual(norm('https://www.Ejemplo.com/a/b/?utm_source=x&id=3&fbclid=zz#frag').url_normalizada, 'ejemplo.com/a/b?id=3');
  assert.strictEqual(norm('https://ejemplo.com/a/b').url_normalizada, 'ejemplo.com/a/b');
});
ok('limpia el titular de HTML y entidades', () => assert.strictEqual(norm('https://e.com/x').titular, 'T & x'));
ok('conserva los parámetros que identifican la noticia y ordena los demás', () => {
  assert.strictEqual(norm('https://e.com/p?b=2&a=1&utm_medium=x').url_normalizada, 'e.com/p?a=1&b=2');
  assert.strictEqual(norm('http://e.com:8080/p/').url_normalizada, 'e.com/p');
});

console.log('Filtro por fecha');
ok('respeta la ventana de días', () => {
  const dia = 86400000;
  const iso = ms => new Date(Date.now() - ms).toISOString();
  const r = ejecutar('filtrar_fecha.js', [
    { url: 'a', fecha_publicacion: iso(1 * dia) }, { url: 'b', fecha_publicacion: iso(8 * dia) }, { url: 'c', fecha_publicacion: null },
  ]);
  assert.deepStrictEqual(r.map(x => x.url), ['a']);
});

console.log(`\n${n} pruebas correctas`);
