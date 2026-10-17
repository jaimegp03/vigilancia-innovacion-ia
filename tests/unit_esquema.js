// Pruebas unitarias del validador de esquemas (scripts/validar_esquema.js), incluido el recorte de textos demasiado largos.
// Uso: node tests/unit_esquema.js
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { validarContraDef } = require('../scripts/validar_esquema');

const esquema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schemas', 'caso.schema.json'), 'utf8'));
const leer = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'esquema', f), 'utf8'));
let n = 0;
const ok = (nombre, f) => { f(); n++; console.log('  ✓', nombre); };

console.log('Validador de esquemas');
ok('acepta una extracción válida', () => assert.strictEqual(validarContraDef(esquema, 'extraccion', leer('extraccion_valida.json')).ok, true));
ok('rechaza una extracción inválida (enum, campo ausente, campo extra, motivo obligatorio)', () => {
  const r = validarContraDef(esquema, 'extraccion', leer('extraccion_invalida.json'));
  assert.strictEqual(r.ok, false);
  assert.ok(r.errores.length >= 4);
});
ok('recorta un texto que excede maxLength en lugar de rechazarlo', () => {
  const e = leer('extraccion_valida.json');
  e.resumen = 'x'.repeat(637); // el esquema admite 600
  const r = validarContraDef(esquema, 'extraccion', e);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(e.resumen.length, 600);
  assert.ok(e.resumen.endsWith('…'));
});
ok('recorta el motivo de "no es un caso" y la justificación de la clasificación', () => {
  const e = leer('extraccion_valida.json');
  Object.assign(e, { es_caso: false, motivo_no_caso: 'm'.repeat(252), empresa: null, sector: null, pais: null, titulo_caso: null, resumen: null, tecnologia_ia: [], tipo_innovacion: null, madurez: null, resultado: null, metricas: [], confianza: 'baja' });
  assert.strictEqual(validarContraDef(esquema, 'extraccion', e).ok, true);
  assert.strictEqual(e.motivo_no_caso.length, 200);
  const c = leer('clasificacion_valida.json');
  c.justificacion = 'j'.repeat(335);
  assert.strictEqual(validarContraDef(esquema, 'clasificacion', c).ok, true);
  assert.strictEqual(c.justificacion.length, 300);
});
ok('recorta listas con demasiados elementos', () => {
  const c = leer('clasificacion_valida.json');
  c.etiquetas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  assert.strictEqual(validarContraDef(esquema, 'clasificacion', c).ok, true);
  assert.strictEqual(c.etiquetas.length, 6);
});
ok('sigue rechazando lo que no es longitud (puntuación fuera de rango)', () => {
  const c = leer('clasificacion_valida.json');
  c.impacto = 9;
  assert.strictEqual(validarContraDef(esquema, 'clasificacion', c).ok, false);
});

console.log(`\n${n} pruebas correctas`);
