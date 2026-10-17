const MARCAS = /^(utm_|fbclid|gclid|mc_cid|mc_eid|ocid|xtor|cmp|ref$|ref_|source$|spm|igshid)/i;

function quitarHtml(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim();
}

// El global URL no existe en el sandbox de los nodos Code de n8n: se analiza la URL con una expresión regular.
function partesUrl(u) {
  const m = String(u || '').trim().match(/^https?:\/\/([^\/?#:]+)(?::\d+)?([^?#]*)(?:\?([^#]*))?/i);
  return m ? { host: m[1].toLowerCase().replace(/^www\./, ''), ruta: m[2] || '', consulta: m[3] || '' } : null;
}

function hostDe(u) {
  const p = partesUrl(u);
  return p ? p.host : '';
}

// Misma noticia con distinto utm_*, www, fragmento o barra final → misma clave.
function normalizarUrl(u) {
  const p = partesUrl(u);
  if (!p) return String(u || '').trim().toLowerCase();
  const params = p.consulta.split('&').filter(x => x && !MARCAS.test(x.split('=')[0])).sort();
  return p.host + p.ruta.replace(/\/+$/, '') + (params.length ? '?' + params.join('&') : '');
}

function fechaIso(v) {
  const t = Date.parse(v || '');
  return isNaN(t) ? null : new Date(t).toISOString();
}

// Hash estable (cyrb53) de la URL normalizada; sirve como id del caso.
function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'c' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
