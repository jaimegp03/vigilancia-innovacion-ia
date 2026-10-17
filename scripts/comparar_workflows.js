// Compara dos exportaciones de workflow de n8n: nodos (tipo, versión, parámetros, posición, opciones) y conexiones.
// Uso: node scripts/comparar_workflows.js antes.json despues.json
const fs = require('fs');
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const indexar = w => Object.fromEntries(w.nodes.map(n => [n.name, n]));
const A = indexar(a);
const B = indexar(b);
const clave = n => JSON.stringify([n.type, n.typeVersion, n.parameters, n.position, n.onError, n.alwaysOutputData, n.retryOnFail]);
let difs = 0;
for (const n of new Set([...Object.keys(A), ...Object.keys(B)])) {
  if (!A[n] || !B[n]) { console.log('solo en uno:', n); difs++; continue; }
  if (clave(A[n]) !== clave(B[n])) { console.log('difiere:', n); difs++; }
}
const conexionesIguales = JSON.stringify(a.connections) === JSON.stringify(b.connections);
console.log(`nodos: ${a.nodes.length} → ${b.nodes.length} | nodos distintos: ${difs} | conexiones iguales: ${conexionesIguales}`);
process.exit(difs === 0 && conexionesIguales ? 0 : 1);
