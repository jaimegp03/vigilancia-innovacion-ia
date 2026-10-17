// Toma el workflow de PRODUCCIÓN y lo deja listo para probar los nodos HTTP de Gemini contra mock_gemini.js:
//  - las hojas de Google se sustituyen por nodos simulados (no hay credenciales de Google),
//  - los nodos de Gemini se mantienen tal cual y se les asigna la credencial de prueba "Gemini MOCK",
//  - se limita a 6 artículos y se acorta la pausa entre llamadas.
// Uso: node scripts/pruebas/preparar_prueba_gemini.js <workflow.json> <salida.json> <id>
const fs = require('fs');
const [entrada, salida, id] = process.argv.slice(2);
const w = JSON.parse(fs.readFileSync(entrada, 'utf8'));

for (const n of w.nodes) {
  if (n.type === 'n8n-nodes-base.googleSheets') {
    const lectura = n.parameters.operation === 'read';
    n.type = 'n8n-nodes-base.code';
    n.typeVersion = 2;
    n.parameters = { jsCode: lectura ? 'return [{ json: {} }];' : 'return $input.all();' };
  }
  if (n.type === 'n8n-nodes-base.httpRequest' && n.parameters.nodeCredentialType === 'googlePalmApi') {
    n.credentials = { googlePalmApi: { id: 'mockgem', name: 'Gemini MOCK' } };
  }
  if (n.name === 'Cargar configuración') {
    n.parameters.jsCode = n.parameters.jsCode.replace(
      'parametros.proveedor_ia = PROVEEDOR;',
      [
        'parametros.proveedor_ia = PROVEEDOR;',
        'parametros.max_articulos_por_ejecucion = 6;',
        "parametros.gemini_host = 'http://127.0.0.1:8099'; // servidor simulado, no Google",
        'for (const t of Object.keys(parametros.procesamiento.pausas_ia_ms)) parametros.procesamiento.pausas_ia_ms[t] = 1500;',
      ].join('\n'),
    );
  }
}
w.id = id;
w.name = w.name + ' (PRUEBA contra mock Gemini)';
fs.writeFileSync(salida, JSON.stringify(w, null, 2));
console.log('listo', salida, w.nodes.filter(n => n.credentials).length, 'nodos con credencial de prueba');
