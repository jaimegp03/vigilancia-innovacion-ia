// Convierte el HTML descargado en texto limpio. Si hay paywall, error o poco texto: solo titular + resumen y acceso "parcial".
const p = $('Cargar configuración').first().json.parametros;
const MIN = p.texto_minimo_caracteres;
const MAX = p.texto_maximo_caracteres;
const PAYWALL = /suscr[ií]bete para|solo para suscriptores|contenido exclusivo para|inicia sesi[oó]n para (seguir|continuar|leer)|subscribe to (continue|read)|already a subscriber|sign in to (continue|read)|create a free account to (continue|read)/i;

const ENTIDADES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»', iexcl: '¡', iquest: '¿', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decodificar = s => s
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
  .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTIDADES ? ENTIDADES[n] : m));
const limpiar = s => decodificar(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function textoDeHtml(html) {
  let b = (html.match(/<article[\s\S]*<\/article>/i) || html.match(/<main[\s\S]*<\/main>/i) || [html])[0];
  b = b.replace(/<(script|style|nav|aside|footer|header|form|figure|figcaption|svg|noscript|iframe|button)[\s\S]*?<\/\1>/gi, ' ');
  const partes = [];
  const vistos = new Set();
  for (const m of b.matchAll(/<(p|h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const t = limpiar(m[2]);
    const minimo = m[1].toLowerCase() === 'p' ? 40 : 10;
    if (t.length >= minimo && !vistos.has(t)) { vistos.add(t); partes.push(t); }
  }
  return partes.join('\n');
}

return $input.all().map((it, k) => {
  const base = $('Limitar lote diario').itemMatching(k).json;
  const codigo = it.json.statusCode;
  const cuerpo = typeof it.json.data === 'string' ? it.json.data : it.json.body; // el nodo HTTP devuelve el HTML en 'data'
  const html = typeof cuerpo === 'string' ? cuerpo.slice(0, 1500000) : '';
  const ok = !it.json.error && codigo >= 200 && codigo < 300 && html.length > 0;
  let texto = ok ? textoDeHtml(html) : '';
  let motivo = null;
  if (!ok) motivo = it.json.error ? 'error de descarga' : `HTTP ${codigo || 'sin respuesta'}`;
  else if (texto.length < MIN) motivo = 'texto demasiado corto';
  else if (PAYWALL.test(html) && texto.length < MIN * 3) motivo = 'paywall';

  const parcial = motivo !== null;
  if (parcial) texto = `${base.titular}\n${base.resumen_feed}`.trim();
  return {
    json: {
      ...base,
      acceso: parcial ? 'parcial' : 'completo',
      motivo_acceso_parcial: motivo,
      texto: texto.slice(0, MAX),
      texto_chars: texto.length,
    },
  };
});
