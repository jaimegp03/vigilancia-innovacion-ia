// Genera web/index.html (un único archivo autocontenido) a partir de web/plantilla.html y data/ediciones/*.json.
// Sin dependencias. Uso:
//   node web/build.mjs                  (si hay ediciones reales usa solo esas; si no, usa las de ejemplo)
//   node web/build.mjs --con-ejemplos   (mezcla ejemplo y reales: solo para probar el diseño)
//   node web/build.mjs --sin-ejemplos   (falla si no hay ediciones reales)
//   node web/build.mjs --salida ruta/index.html
//   node web/build.mjs --datos otra/carpeta   (lee las ediciones de otra carpeta; útil para pruebas)
// Nombre, eslogan, noindex y nº de ediciones incrustadas salen de config/parametros.json (publicacion.* y web.*).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validarContraDef } = require('../scripts/validar_esquema.js');

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIMITE_BYTES = 5 * 1024 * 1024;
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const valorDe = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

function fallar(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }
const leerJson = ruta => { try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) { fallar(`No se pudo leer ${path.relative(RAIZ, ruta)}: ${e.message}`); } };

const params = leerJson(path.join(RAIZ, 'config', 'parametros.json'));
const pub = params.publicacion;
const web = params.web || {};
if (!pub || !pub.nombre || !pub.nombre_corto || !pub.slug) fallar('Faltan publicacion.nombre, publicacion.nombre_corto o publicacion.slug en config/parametros.json');
const N = Number.isInteger(web.ediciones_embebidas) && web.ediciones_embebidas > 0 ? web.ediciones_embebidas : 90;
const salida = path.resolve(RAIZ, valorDe('--salida') || web.ruta_salida || 'web/index.html');

// 1) Leer y validar todas las ediciones
const esquema = leerJson(path.join(RAIZ, 'schemas', 'edicion.schema.json'));
const dirEd = valorDe('--datos') ? path.resolve(valorDe('--datos')) : path.join(RAIZ, 'data', 'ediciones');
if (!fs.existsSync(dirEd)) fallar(`No existe ${path.relative(RAIZ, dirEd)}/. Genera las de ejemplo con: node scripts/web/generar_ejemplos.js`);
const archivos = fs.readdirSync(dirEd).filter(f => f.endsWith('.json')).sort();
const todas = [];
for (const f of archivos) {
  const ed = leerJson(path.join(dirEd, f));
  const r = validarContraDef(esquema, 'edicion', ed);
  const errores = [...r.errores];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ed.fecha || '')) errores.push('fecha: debe tener el formato AAAA-MM-DD');
  if (ed.es_ejemplo === false) {
    const noticias = [ed.portada, ...(ed.destacadas || []), ...(ed.secciones_por_sector || []).flatMap(s => s.noticias), ...(ed.senales_debiles || [])];
    noticias.forEach(n => { if (!n || !/^https?:\/\//i.test(n.url || '')) errores.push(`noticia "${n && n.id}": una edición real necesita url http(s) en cada noticia`); });
  }
  if (errores.length) fallar(`La edición ${f} no es válida:\n  - ${errores.slice(0, 12).join('\n  - ')}${errores.length > 12 ? `\n  … y ${errores.length - 12} errores más` : ''}`);
  todas.push({ archivo: f, ed });
}

// 2) Elegir qué ediciones se incrustan
const reales = todas.filter(x => !x.ed.es_ejemplo);
const ejemplos = todas.filter(x => x.ed.es_ejemplo);
let elegidas;
if (flag('--con-ejemplos')) elegidas = todas;
else if (flag('--sin-ejemplos')) { if (!reales.length) fallar('No hay ediciones reales en data/ediciones/ (y se ha pedido --sin-ejemplos).'); elegidas = reales; }
else elegidas = reales.length ? reales : ejemplos;
if (!elegidas.length) fallar('No hay ninguna edición en data/ediciones/.');

const porFecha = new Map();
for (const x of elegidas) {
  if (porFecha.has(x.ed.fecha)) fallar(`Hay dos ediciones con la fecha ${x.ed.fecha} (${porFecha.get(x.ed.fecha)} y ${x.archivo}). Usa --sin-ejemplos o cambia una fecha.`);
  porFecha.set(x.ed.fecha, x.archivo);
}
const ediciones = elegidas.map(x => x.ed).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).slice(-N);

// 3) Incrustar en la plantilla
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const aJsonSeguro = v => JSON.stringify(v).split('<').join('\\u003c').split(LS).join('\\u2028').split(PS).join('\\u2029');
const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const plantilla = fs.readFileSync(path.join(RAIZ, 'web', 'plantilla.html'), 'utf8');
const indexable = web.indexable === true;
const descripcion = `${pub.nombre}. ${pub.eslogan || ''}`.trim();
const html = plantilla
  .replace('__TITLE__', () => attr(pub.nombre))
  .replace('__DESCRIPCION__', () => attr(descripcion))
  .replace('<!--__ROBOTS__-->', () => (indexable ? '' : '<meta name="robots" content="noindex, nofollow">'))
  .replace('__PUBLICACION__', () => aJsonSeguro({ nombre: pub.nombre, nombre_corto: pub.nombre_corto, slug: pub.slug, eslogan: pub.eslogan || '' }))
  .replace('__EDICIONES__', () => aJsonSeguro(ediciones));

for (const marca of ['__TITLE__', '__DESCRIPCION__', '__PUBLICACION__', '__EDICIONES__', '__ROBOTS__']) {
  if (html.includes(marca)) fallar(`La plantilla conserva la marca ${marca} sin sustituir.`);
}
const bytes = Buffer.byteLength(html, 'utf8');
if (bytes > LIMITE_BYTES) fallar(`web/index.html pesa ${(bytes / 1048576).toFixed(1)} MB y el límite es 5 MB. Reduce web.ediciones_embebidas en config/parametros.json (hoy ${N}).`);

fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, html);
const dirSalida = path.dirname(salida);
if (!indexable) fs.writeFileSync(path.join(dirSalida, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
else if (fs.existsSync(path.join(dirSalida, 'robots.txt'))) fs.unlinkSync(path.join(dirSalida, 'robots.txt'));
if (web.destino === 'github_pages') fs.writeFileSync(path.join(dirSalida, '.nojekyll'), '');

const hayEjemplo = ediciones.some(e => e.es_ejemplo);
console.log(`✓ ${path.relative(RAIZ, salida)} · ${ediciones.length} ediciones (${ediciones[0].fecha} → ${ediciones[ediciones.length - 1].fecha}) · ${(bytes / 1024).toFixed(0)} KB`);
console.log(`  Publicación: ${pub.nombre} (${pub.nombre_corto}) · indexable: ${indexable ? 'sí' : 'no'}`);
if (hayEjemplo) console.log('  ⚠ Contiene ediciones de EJEMPLO (ficticias): no se publicarán.');
