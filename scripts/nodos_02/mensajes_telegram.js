// Mensajes de Telegram (HTML): 1 resumen del informe + 1 por borrador. Telegram admite 4096 caracteres por mensaje.
// Formato pensado para leerse de un vistazo: secciones con emoji, citas para los textos copiables y barras de puntuación.
const cfg = $('Cargar configuración').first().json;
const semana = $('Casos de la semana').first().json;
const tend = $('Validar tendencias').first().json;
const borradores = $('Validar redes').all().map(i => i.json);

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
const corta = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1).trimEnd() + '…' : String(s));
const LINEA = '━━━━━━━━━━━━━━━━━━';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const NUM = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const MEDALLA = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const FUERZA = { alta: '🔴 alta', media: '🟠 media', emergente: '🟡 emergente' };

const barra = p => { const n = Math.max(0, Math.min(10, Math.round((Number(p) || 0) / 10))); return '▰'.repeat(n) + '▱'.repeat(10 - n); };
const fecha = iso => { const [a, m, d] = iso.split('-').map(Number); return { d, m, a }; };
function periodo(desde, hasta) {
  const x = fecha(desde), y = fecha(hasta);
  if (x.a === y.a && x.m === y.m) return `${x.d} → ${y.d} de ${MESES[y.m - 1]} de ${y.a}`;
  if (x.a === y.a) return `${x.d} de ${MESES[x.m - 1]} → ${y.d} de ${MESES[y.m - 1]} de ${y.a}`;
  return `${x.d} ${MESES[x.m - 1]} ${x.a} → ${y.d} ${MESES[y.m - 1]} ${y.a}`;
}
let hoja = '';
try { hoja = `https://docs.google.com/spreadsheets/d/${$env.GOOGLE_SHEET_ID}/edit`; } catch (e) { hoja = ''; }
const enlaceHoja = hoja ? `📄 <a href="${attr(hoja)}">Abrir la hoja de cálculo</a>` : '';
const cabecera = ['📊 <b>VIGILANCIA IA · Informe semanal</b>', `🗓 <i>${esc(periodo(cfg.desde, cfg.hasta))}</i>`];

// ---------- Mensaje 1: el informe ----------
// Se construye por bloques completos y, si no cabe en 4096 caracteres, se van quitando detalles opcionales
// (nunca se corta el texto a la mitad: eso dejaría etiquetas HTML sin cerrar y Telegram rechazaría el mensaje).
const una = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const primeraFrase = s => { const t = una(s); const i = t.search(/[.!?](\s|$)/); return i > 20 ? t.slice(0, i + 1) : t; };
function informe({ implicaciones, cautelas, lineasCasos, resumenMax, tituloMax, maxTendencias }) {
  const l = [...cabecera, `📥 <b>${semana.n_semana}</b> casos nuevos esta semana`, '', LINEA, ''];
  if (tend.estado === 'ok') {
    const t = tend.tendencias;
    l.push('📝 <b>EN RESUMEN</b>', `<blockquote>${esc(corta(una(t.resumen_ejecutivo), resumenMax))}</blockquote>`, '');
    l.push('🔥 <b>TENDENCIAS</b>');
    if (!t.tendencias.length) l.push('<i>Esta semana no hay tendencias con 2 o más casos.</i>');
    t.tendencias.slice(0, maxTendencias).forEach((x, i) => {
      l.push(`${NUM[i] || (i + 1) + '.'} <b>${esc(corta(una(x.titulo), tituloMax))}</b>`);
      l.push(`      📈 Fuerza ${FUERZA[x.fuerza] || esc(x.fuerza)} · ${x.casos_ids.length} casos`);
      if (implicaciones && x.implicacion) l.push(`      💡 <i>${esc(corta(una(x.implicacion), 200))}</i>`);
    });
    if (t.tendencias.length > maxTendencias) l.push(`<i>…y ${t.tendencias.length - maxTendencias} más en la hoja.</i>`);
    if (cautelas && t.cautelas && t.cautelas.length) l.push('', `🧐 <i>Ojo: ${esc(corta(una(t.cautelas[0]), 200))}</i>`);
    if (cautelas && t.limitaciones) l.push('', `ℹ️ <i>${esc(corta(una(t.limitaciones), 200))}</i>`);
  } else {
    l.push('⚠️ <b>No se pudo generar el informe de tendencias</b>', `<i>${esc(corta(una(tend.errores.join('; ')), 300))}</i>`);
  }
  l.push('', LINEA, '', '🏆 <b>CASOS DESTACADOS</b>');
  borradores.forEach((b, i) => {
    l.push(`${MEDALLA[i] || (i + 1) + '.'} <a href="${attr(b.url)}">${esc(corta(una(b.titulo_caso), 110))}</a>`);
    l.push(`      🏷 ${esc(b.fuente)} · ${barra(b.puntuacion_total)} <b>${b.puntuacion_total ?? '?'}</b>/100`);
    if (lineasCasos && b.borrador && b.borrador.explicacion_sencilla) l.push(`      💬 <i>${esc(corta(primeraFrase(b.borrador.explicacion_sencilla), 150))}</i>`);
  });
  const revisar = borradores.filter(b => b.estado !== 'pendiente_revision').length;
  l.push('', LINEA, '', '✍️ <b>BORRADORES PARA REDES</b>', `${borradores.length} listos para revisar ⬇️ <i>(en los siguientes mensajes)</i>`);
  if (revisar) l.push(`⚠️ <b>${revisar}</b> con avisos de formato: míralos con cuidado`);
  l.push('🔒 <i>No se publica nada automáticamente.</i>');
  if (enlaceHoja) l.push('', enlaceHoja);
  return l.join('\n');
}
// De más a menos detalle. Lo que primero se sacrifica son las implicaciones de cada tendencia; la línea sencilla de cada caso es lo último que se quita.
const NIVELES = [
  { implicaciones: true, cautelas: true, lineasCasos: true, resumenMax: 700, tituloMax: 110, maxTendencias: 8 },
  { implicaciones: false, cautelas: true, lineasCasos: true, resumenMax: 600, tituloMax: 100, maxTendencias: 8 },
  { implicaciones: false, cautelas: false, lineasCasos: true, resumenMax: 450, tituloMax: 90, maxTendencias: 6 },
  { implicaciones: false, cautelas: false, lineasCasos: false, resumenMax: 300, tituloMax: 70, maxTendencias: 4 },
];
let textoInforme = '';
for (const nivel of NIVELES) { textoInforme = informe(nivel); if (textoInforme.length <= 3900) break; }

// Último recurso: si algún mensaje quedase con etiquetas sin cerrar, se envía sin formato en lugar de fallar.
const equilibrado = s => ['b', 'i', 'blockquote'].every(e => (s.match(new RegExp('<' + e + '>', 'g')) || []).length === (s.match(new RegExp('</' + e + '>', 'g')) || []).length);
const seguro = s => (s.length <= 4096 && equilibrado(s) ? s : s.replace(new RegExp('</?(b|i|blockquote|a)( [^>]*)?>', 'g'), '').slice(0, 4090));

const mensajes = [{ json: { texto: seguro(textoInforme) } }];

// ---------- Mensajes siguientes: un borrador por mensaje ----------
borradores.forEach((b, i) => {
  const cab = [`✍️ <b>BORRADOR ${i + 1} de ${borradores.length}</b>`, LINEA, `📌 <b>${esc(corta(b.titulo_caso, 140))}</b>`, `🏷 ${esc(b.fuente)} · ${barra(b.puntuacion_total)} <b>${b.puntuacion_total ?? '?'}</b>/100`, `🔗 <a href="${attr(b.url)}">Ver el artículo original</a>`, ''];
  const d = b.borrador;
  if (!d) {
    mensajes.push({ json: { texto: seguro([...cab, '❌ <b>No se pudo generar este borrador</b>', `<i>${esc(corta(b.errores.join('; '), 300))}</i>`].join('\n')) } });
    return;
  }
  const hl = (d.linkedin.hashtags || []).join(' ');
  const hx = (d.x.hashtags || []).join(' ');
  const avisos = [...(d.avisos_revision || []), ...b.errores];
  // Apartado sencillo: qué dice la noticia, en lenguaje cotidiano, y por qué importa (solo si la IA lo ha escrito).
  const sencillo = [];
  if (d.explicacion_sencilla) sencillo.push('🧩 <b>EN PALABRAS SENCILLAS</b>', `<blockquote>${esc(corta(d.explicacion_sencilla, 600))}</blockquote>`);
  if (d.por_que_importa) sencillo.push(`🎯 <b>Por qué importa:</b> <i>${esc(corta(d.por_que_importa, 300))}</i>`);
  if (sencillo.length) sencillo.push('');
  cab.push(...sencillo);
  const pie = ['', '🖼 <b>Imagen sugerida</b>', `<i>${esc(corta(d.idea_visual, 300))}</i>`];
  if (avisos.length) pie.push('', '⚠️ <b>Antes de publicar, revisa:</b>', ...avisos.slice(0, 5).map(a => `• ${esc(corta(a, 200))}`));
  // Reserva de espacio: lo que sobra de los 4000 caracteres es para los textos (no se corta nunca una etiqueta HTML).
  const fijo = [...cab, '💼 <b>LinkedIn</b>', '', '', '𝕏 <b>X</b>', '', ...pie].join('\n').length + 80;
  const margen = Math.max(400, 4000 - fijo);
  const tl = corta(d.linkedin.texto, Math.floor(margen * 0.75));
  const tx = corta(d.x.texto, Math.floor(margen * 0.25));
  const m = [...cab,
    '💼 <b>LinkedIn</b>', `<blockquote>${esc(tl)}${hl ? '\n\n' + esc(hl) : ''}</blockquote>`, '',
    '𝕏 <b>X</b>', `<blockquote>${esc(tx)}${hx ? '\n' + esc(hx) : ''}</blockquote>`,
    ...pie];
  mensajes.push({ json: { texto: seguro(m.join('\n')) } });
});
return mensajes;
