// Pruebas de la edición diaria: ensamblado, esquema de las ediciones de ejemplo y construcción de web/index.html.
// Uso: node tests/unit_web.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');
const { validarContraDef } = require('../scripts/validar_esquema');
const { ensamblarEdicion, nota5 } = require('../scripts/web/lib_edicion');

const RAIZ = path.join(__dirname, '..');
const esquema = JSON.parse(fs.readFileSync(path.join(RAIZ, 'schemas', 'edicion.schema.json'), 'utf8'));
let n = 0;
const ok = (nombre, f) => { f(); n++; console.log('  ✓', nombre); };

const caso = (id, total, extra = {}) => ({
  id, titulo_caso: 'Caso ' + id, empresa: 'Empresa ' + id, sector: 'banca_seguros', pais: 'España', tipo_innovacion: 'atencion_cliente',
  madurez: 'produccion', resumen: 'Resumen ' + id, resultado: 'Resultado ' + id, puntuacion_total: total, confianza: 'alta',
  fuente: 'Medio', url: 'https://ejemplo.invalid/' + id, fecha_publicacion: '2026-10-17', ...extra,
});
const salida = (extra = {}) => ({ portada_id: 'a', destacadas_ids: ['b', 'c'], senales_debiles_ids: ['e'], analisis: 'Análisis', noticias: [], ...extra });

console.log('Edición diaria');
ok('la nota 1-5 es la puntuación total ÷ 20 redondeada', () => {
  assert.deepStrictEqual([0, 10, 30, 70, 88, 100].map(nota5), [1, 1, 2, 4, 4, 5]);
});
ok('ensambla portada, destacadas, señales y secciones sin repetir noticias', () => {
  const casos = [caso('a', 90), caso('b', 80), caso('c', 75), caso('d', 60, { sector: 'salud_farma' }), caso('e', 30, { novedad: 5, evidencia: 1 })];
  const ed = ensamblarEdicion({ casos, salida: salida(), fecha: '2026-10-17', numero: 1 });
  assert.strictEqual(ed.portada.id, 'a');
  assert.deepStrictEqual(ed.destacadas.map(x => x.id), ['b', 'c']);
  assert.deepStrictEqual(ed.senales_debiles.map(x => x.id), ['e']);
  assert.deepStrictEqual(ed.secciones_por_sector.flatMap(s => s.noticias).map(x => x.id), ['d']);
  assert.strictEqual(ed.cifras.casos_totales, 5);
  assert.strictEqual(validarContraDef(esquema, 'edicion', ed).ok, true);
});
ok('ignora ids inventados y cae al mejor caso si la portada elegida no existe', () => {
  const casos = [caso('a', 50), caso('b', 95)];
  const ed = ensamblarEdicion({ casos, salida: salida({ portada_id: 'zzz', destacadas_ids: ['yyy'], senales_debiles_ids: [] }), fecha: '2026-10-17', numero: 2 });
  assert.strictEqual(ed.portada.id, 'b');
  assert.strictEqual(ed.destacadas.length, 0);
});
ok('las URL, el medio y la puntuación salen del caso, no del editor', () => {
  const casos = [caso('a', 84)];
  const sal = salida({ destacadas_ids: [], senales_debiles_ids: [], noticias: [{ caso_id: 'a', titular: 'T', entradilla: 'E', impacto: 'I', tipo_afirmacion: 'hecho_confirmado', url: 'https://malo.invalid' }] });
  const ed = ensamblarEdicion({ casos, salida: sal, fecha: '2026-10-17', numero: 1 });
  assert.strictEqual(ed.portada.url, 'https://ejemplo.invalid/a');
  assert.strictEqual(ed.portada.puntuacion, 4);
  assert.strictEqual(ed.portada.tipo_afirmacion, 'hecho_confirmado');
});
ok('agrupa la misma historia contada por varios medios en una sola noticia con otras fuentes', () => {
  const casos = [
    caso('a', 80, { empresa: 'Amazon', titulo_caso: 'Amazon lanza dispositivos corporales Bee', fuente: 'Medio A' }),
    caso('b', 70, { empresa: 'Amazon', titulo_caso: 'Amazon presenta los accesorios Bee corporales', fuente: 'Medio B' }),
    caso('c', 75, { empresa: 'Otra', titulo_caso: 'Otra empresa distinta', fuente: 'Medio C' }),
    caso('d', 60, { empresa: 'Uno', titulo_caso: 'Caso del editor uno', fuente: 'Medio D' }),
    caso('e', 62, { empresa: 'Dos', titulo_caso: 'Caso del editor dos', fuente: 'Medio E' }),
  ];
  const ed = ensamblarEdicion({ casos, salida: salida({ portada_id: 'a', destacadas_ids: ['c'], historias_repetidas: [['d', 'e']] }), fecha: '2026-10-17', numero: 1 });
  const todas = [ed.portada, ...ed.destacadas, ...ed.secciones_por_sector.flatMap(x => x.noticias), ...ed.senales_debiles];
  assert.strictEqual(todas.length, 3, 'a+b se fusionan por empresa y título; d+e por indicación del editor');
  assert.deepStrictEqual(ed.portada.otras_fuentes.map(o => o.medio), ['Medio B']);
  assert.strictEqual(ed.cifras.medios_distintos, 5, 'cuenta también los medios de las otras fuentes');
  assert.strictEqual(validarContraDef(esquema, 'edicion', ed).ok, true);
});
ok('las señales débiles las decide el código: novedad alta con poca evidencia o solo un anuncio', () => {
  const casos = [
    caso('a', 90, { novedad: 4, evidencia: 5 }), caso('b', 80, { novedad: 3, evidencia: 4 }), caso('c', 78, { novedad: 3, evidencia: 4 }),
    caso('x', 50, { novedad: 5, evidencia: 2 }), caso('y', 70, { novedad: 4, evidencia: 4, madurez: 'anuncio' }),
    caso('z', 68, { novedad: 2, evidencia: 1 }), caso('w', 66, { novedad: 4, evidencia: 5 }),
  ];
  const ed = ensamblarEdicion({ casos, salida: salida({ destacadas_ids: ['b', 'c'], senales_debiles_ids: ['w'] }), fecha: '2026-10-17', numero: 1 });
  assert.deepStrictEqual(ed.senales_debiles.map(n => n.id), ['x', 'y'], 'z (poco novedoso y poco probado) es ruido y w (novedoso y sólido) no es débil');
});
ok('el «qué vigilar» del editor se guarda en la noticia', () => {
  const sal = salida({ destacadas_ids: [], noticias: [{ caso_id: 'a', titular: 'T', entradilla: 'E', impacto: 'I', tipo_afirmacion: 'afirmacion_empresa', vigilar: 'Si publican resultados' }] });
  const ed = ensamblarEdicion({ casos: [caso('a', 80, { novedad: 4, evidencia: 2 })], salida: sal, fecha: '2026-10-17', numero: 1 });
  assert.strictEqual(ed.portada.vigilar, 'Si publican resultados');
  assert.strictEqual(ed.portada.novedad, 4);
});
ok('las claves del editor se guardan (máximo tres) y la edición incluye la fecha de generación', () => {
  const ed = ensamblarEdicion({ casos: [caso('a', 80)], salida: salida({ destacadas_ids: [], claves: ['uno', 'dos', 'tres', 'cuatro'] }), fecha: '2026-10-17', numero: 1, generadaEn: '2026-10-17T07:40:00.000Z' });
  assert.deepStrictEqual(ed.claves, ['uno', 'dos', 'tres']);
  assert.strictEqual(ed.generada_en, '2026-10-17T07:40:00.000Z');
});
ok('rechaza una edición con campos fuera del esquema', () => {
  const ed = ensamblarEdicion({ casos: [caso('a', 80)], salida: salida({ destacadas_ids: [], senales_debiles_ids: [] }), fecha: '2026-10-17', numero: 1 });
  ed.portada.sector = 'inventado';
  assert.strictEqual(validarContraDef(esquema, 'edicion', ed).ok, false);
});
ok('las 7 ediciones de ejemplo validan, son ficticias y no tienen URL', () => {
  const dir = path.join(RAIZ, 'data', 'ediciones');
  const ejemplos = fs.readdirSync(dir).filter(f => f.startsWith('ejemplo-'));
  assert.strictEqual(ejemplos.length, 7);
  for (const f of ejemplos) {
    const ed = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = validarContraDef(esquema, 'edicion', ed);
    assert.strictEqual(r.ok, true, f + ': ' + r.errores.join('; '));
    assert.strictEqual(ed.es_ejemplo, true);
    const todas = [ed.portada, ...ed.destacadas, ...ed.secciones_por_sector.flatMap(s => s.noticias), ...ed.senales_debiles];
    todas.forEach(x => assert.strictEqual(x.url, null, f + ': los ejemplos no llevan URL real'));
  }
});
const copiarEjemplos = destino => {
  const dir = path.join(RAIZ, 'data', 'ediciones');
  fs.mkdirSync(destino, { recursive: true });
  fs.readdirSync(dir).filter(f => f.startsWith('ejemplo-')).forEach(f => fs.copyFileSync(path.join(dir, f), path.join(destino, f)));
};
ok('build.mjs genera un HTML autocontenido, con nombre, noindex y sin peticiones externas', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webtest-'));
  copiarEjemplos(path.join(tmp, 'ed'));
  const salidaHtml = path.join(tmp, 'index.html');
  execFileSync(process.execPath, [path.join(RAIZ, 'web', 'build.mjs'), '--datos', path.join(tmp, 'ed'), '--salida', salidaHtml], { stdio: 'pipe' });
  const html = fs.readFileSync(salidaHtml, 'utf8');
  const sinDatos = html.replace(/<script type="application\/json"[\s\S]*?<\/script>/g, '');
  const params = JSON.parse(fs.readFileSync(path.join(RAIZ, 'config', 'parametros.json'), 'utf8'));
  assert.ok(html.includes(params.publicacion.nombre));
  assert.ok(html.includes('"es_ejemplo":true'));
  assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(!/(src|href)=["']https?:/i.test(sinDatos), 'no debe cargar nada externo');
  assert.ok(!/__(TITLE|DESCRIPCION|PUBLICACION|EDICIONES|ROBOTS)__/.test(sinDatos), 'quedan marcas sin sustituir');
  assert.ok(fs.statSync(salidaHtml).size < 5 * 1024 * 1024);
  fs.rmSync(tmp, { recursive: true, force: true });
});
ok('build.mjs falla con un mensaje claro si una edición real no tiene enlaces', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webtest-'));
  copiarEjemplos(path.join(tmp, 'ed'));
  const ed = JSON.parse(fs.readFileSync(path.join(tmp, 'ed', 'ejemplo-2026-10-12.json'), 'utf8'));
  ed.es_ejemplo = false; ed.fecha = '2099-01-01';
  fs.writeFileSync(path.join(tmp, 'ed', '2099-01-01.json'), JSON.stringify(ed));
  try {
    assert.throws(() => execFileSync(process.execPath, [path.join(RAIZ, 'web', 'build.mjs'), '--datos', path.join(tmp, 'ed'), '--salida', path.join(tmp, 'no_se_escribe.html')], { stdio: 'pipe' }), e => /url http\(s\)/.test(String(e.stderr)));
    assert.ok(!fs.existsSync(path.join(tmp, 'no_se_escribe.html')));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});



console.log(`\n${n} pruebas correctas`);
