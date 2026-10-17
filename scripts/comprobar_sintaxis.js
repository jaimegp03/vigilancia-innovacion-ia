// Comprueba que el código de todos los nodos Code de un workflow tiene sintaxis JavaScript válida (sin ejecutarlo).
// Uso: node scripts/comprobar_sintaxis.js workflow.json [...]
let fallos = 0;
for (const f of process.argv.slice(2)) {
  const w = JSON.parse(require('fs').readFileSync(f, 'utf8'));
  for (const n of w.nodes.filter(x => x.type === 'n8n-nodes-base.code')) {
    try { new (Object.getPrototypeOf(async function () {}).constructor)('$input', '$', '$getWorkflowStaticData', '$env', 'helpers', n.parameters.jsCode); }
    catch (e) { fallos++; console.log(`${f} · ${n.name}: ${e.message}`); }
  }
}
console.log(fallos ? `${fallos} nodos con error de sintaxis` : 'sintaxis ok en todos los nodos Code');
process.exit(fallos ? 1 : 0);
