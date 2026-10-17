// Resume la salida de `n8n execute`: por nodo, nº de ítems por salida y (opcional) el JSON de los primeros ítems.
// Uso: node scripts/resumir_ejecucion.js <salida.txt> [--json] [--nodo "Nombre"] [--max 2] [--volcar fichero.json]
const fs = require('fs');
const args = process.argv.slice(2);
const fichero = args[0];
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const verJson = args.includes('--json');
const soloNodo = opt('--nodo');
const max = Number(opt('--max') || 2);

const t = fs.readFileSync(fichero, 'utf8');
const ini = t.indexOf('{');
const fin = t.lastIndexOf('\n}');
const ej = JSON.parse(t.slice(ini, fin + 2));
const run = ej.data.resultData.runData;
const recortar = (v, n = 160) => {
  if (typeof v === 'string') return v.length > n ? v.slice(0, n) + `…(${v.length} car.)` : v;
  if (Array.isArray(v)) return v.map(x => recortar(x, n));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, recortar(x, n)]));
  return v;
};

console.log('Estado:', ej.status, '| Error:', ej.data.resultData.error ? ej.data.resultData.error.message : 'ninguno');
for (const [nodo, ejecs] of Object.entries(run)) {
  if (soloNodo && nodo !== soloNodo) continue;
  const salidas = ejecs.map(e => (e.data && e.data.main ? e.data.main.map(a => (a ? a.length : 0)) : [])).join(' | ');
  console.log(`\n## ${nodo}  [ejecuciones: ${ejecs.length}; ítems por salida: ${salidas}]`);
  if (ejecs[0].error) console.log('   ERROR:', ejecs[0].error.message);
  if (verJson || soloNodo) {
    ejecs.forEach((e, r) => (e.data.main || []).forEach((salida, s) => {
      (salida || []).slice(0, max).forEach(it => console.log(`   [run ${r} salida ${s}]`, JSON.stringify(recortar(it.json))));
    }));
  }
}
const volcar = opt('--volcar');
if (volcar) {
  const salida = {};
  for (const [nodo, ejecs] of Object.entries(run)) salida[nodo] = ejecs.map(e => (e.data.main || []).map(a => (a || []).map(i => i.json)));
  fs.writeFileSync(volcar, JSON.stringify(salida, null, 2));
}
