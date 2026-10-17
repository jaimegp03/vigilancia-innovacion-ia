// Servidor que imita la API REST de Gemini para probar el nodo HTTP de los workflows SIN clave real ni coste.
// Comprueba la forma de la petición, simula un error 429 (cuota) y responde con JSON válido de extracción/clasificación.
// Uso (dentro del contenedor): node mock_gemini.js [puerto] [desde-hasta]   ·   GET /log devuelve las peticiones recibidas.
// El tercer argumento fija qué peticiones reciben un 429 (por defecto solo la 3; "3-40" simula cuota agotada de forma sostenida).
const http = require('http');

const puerto = Number(process.argv[2] || 8099);
const [caeDesde, caeHasta] = (process.argv[3] || '3-3').split('-').map(Number);
const registro = [];
let n = 0;

const extraccion = titular => ({
  es_caso: true, motivo_no_caso: null, empresa: '(mock Gemini)', sector: 'tecnologia_software', pais: 'España',
  titulo_caso: '(mock Gemini) ' + titular.slice(0, 90), resumen: '(mock Gemini) Respuesta simulada del servidor de pruebas.',
  tecnologia_ia: ['IA generativa'], tipo_innovacion: 'producto_servicio', madurez: 'anuncio', resultado: null, metricas: [], confianza: 'media',
});
const clasificacion = () => ({
  categoria: 'otros', novedad: 3, impacto: 3, replicabilidad: 3, evidencia: 2, relevancia_sector: null,
  etiquetas: ['mock', 'prueba'], justificacion: '(mock Gemini) Puntuación simulada.',
});

http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', d => { cuerpo += d; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/log') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(registro, null, 1));
    }
    let b = null;
    try { b = JSON.parse(cuerpo); } catch (e) { /* cuerpo inválido */ }
    const sistema = b && b.systemInstruction && b.systemInstruction.parts[0].text || '';
    const usuario = b && b.contents && b.contents[0].parts[0].text || '';
    n++;
    const entrada = {
      n, t: Date.now(), metodo: req.method, ruta: url.pathname, clave: url.searchParams.get('key'),
      tipoContenido: req.headers['content-type'],
      cuerpoOk: !!(b && b.systemInstruction && b.contents && b.generationConfig),
      json: b && b.generationConfig && b.generationConfig.responseMimeType, maxTokens: b && b.generationConfig && b.generationConfig.maxOutputTokens,
      tarea: sistema.includes('extrae datos') ? 'extraccion' : sistema.includes('clasifica y puntúa') ? 'clasificacion' : 'otra',
    };
    registro.push(entrada);

    if (n >= caeDesde && n <= caeHasta) { // simula la cuota agotada
      entrada.respuesta = 429;
      res.writeHead(429, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: { code: 429, message: 'Quota exceeded (simulado)', status: 'RESOURCE_EXHAUSTED' } }));
    }
    let texto;
    if (entrada.tarea === 'extraccion') {
      const titular = (usuario.match(/Titular: (.*)/) || [, ''])[1];
      // la primera extracción responde en prosa para forzar el reintento con corrección
      texto = entrada.n === 1 ? 'Claro, aquí tienes el análisis solicitado en texto libre.' : JSON.stringify(extraccion(titular));
    } else if (entrada.tarea === 'clasificacion') texto = JSON.stringify(clasificacion());
    else texto = '{}';
    entrada.respuesta = 200;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      candidates: [{ content: { role: 'model', parts: [{ text: texto }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    }));
  });
}).listen(puerto, '127.0.0.1', () => console.log('mock Gemini en el puerto ' + puerto));
