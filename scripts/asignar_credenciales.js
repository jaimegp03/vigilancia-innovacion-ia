// Asigna credenciales de n8n a los nodos de un workflow y escribe una copia (el original del repositorio no se toca,
// porque los IDs de credencial son propios de cada instalación de n8n).
// Uso: node scripts/asignar_credenciales.js <entrada.json> <salida.json> <tipo=id:nombre> [<tipo=id:nombre> ...]
//   tipos: googleApi (cuenta de servicio) · googleSheetsOAuth2Api · googlePalmApi · telegramApi · anthropicApi
//   Ejemplo: node scripts/asignar_credenciales.js workflows/01_ingesta_diaria.json copia.json googlePalmApi=abc123:"Mi Gemini"
const fs = require('fs');
const [entrada, salida, ...pares] = process.argv.slice(2);
const creds = {};
for (const p of pares) {
  const [tipo, resto] = [p.slice(0, p.indexOf('=')), p.slice(p.indexOf('=') + 1)];
  const [id, ...nombre] = resto.split(':');
  creds[tipo] = { id, name: nombre.join(':') };
}

const w = JSON.parse(fs.readFileSync(entrada, 'utf8'));
let n = 0;
for (const nodo of w.nodes) {
  let tipo = null;
  if (nodo.type === 'n8n-nodes-base.googleSheets') tipo = nodo.parameters.authentication === 'serviceAccount' ? 'googleApi' : 'googleSheetsOAuth2Api';
  else if (nodo.type === 'n8n-nodes-base.telegram') tipo = 'telegramApi';
  else if (nodo.type === 'n8n-nodes-base.httpRequest' && nodo.parameters.nodeCredentialType) tipo = nodo.parameters.nodeCredentialType;
  else if (nodo.type === '@n8n/n8n-nodes-langchain.anthropic') tipo = 'anthropicApi';
  if (tipo && creds[tipo]) { nodo.credentials = { [tipo]: creds[tipo] }; n++; }
}
fs.writeFileSync(salida, JSON.stringify(w, null, 2));
console.log(`${n} nodos con credencial asignada → ${salida}`);
