// AVISO · mensaje diario de Telegram con el resultado de la ejecución (HTML; máx. 4096 caracteres).
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = s => esc(s).replace(/"/g, '&quot;');
const corta = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const barra = p => { const n = Math.max(0, Math.min(10, Math.round((Number(p) || 0) / 10))); return '▰'.repeat(n) + '▱'.repeat(10 - n); };
const seguro = f => { try { return f(); } catch (e) { return []; } };

const r = $('Resumen de ejecución').first().json;
const casos = seguro(() => $('Formatear fila caso').all()).map(i => i.json).filter(c => c && c.titulo_caso)
  .sort((a, b) => (b.puntuacion_total || 0) - (a.puntuacion_total || 0));
let hoja = '';
try { hoja = `https://docs.google.com/spreadsheets/d/${$env.GOOGLE_SHEET_ID}/edit`; } catch (e) { hoja = ''; }

const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
const analizados = (r.extraidos_ok || 0) + (r.extraccion_invalida || 0);

const l = ['📰 <b>VIGILANCIA IA · Resumen del día</b>', `🗓 <i>${esc(fecha)}</i>`, ''];
if (casos.length) {
  l.push(`✅ <b>${casos.length} ${casos.length === 1 ? 'caso nuevo' : 'casos nuevos'}</b> guardados en la hoja`, '');
  casos.slice(0, 8).forEach((c, i) => {
    l.push(`${i + 1}. <a href="${attr(c.url)}">${esc(corta(c.titulo_caso, 100))}</a>`);
    l.push(`      🏷 ${esc(c.empresa)} · ${esc(c.fuente)} · ${barra(c.puntuacion_total)} <b>${c.puntuacion_total ?? '?'}</b>/100`);
    if (c.resumen) l.push(`      💬 <i>${esc(corta(c.resumen, 140))}</i>`);
  });
  if (casos.length > 8) l.push('', `…y ${casos.length - 8} más en la hoja.`);
} else {
  l.push('😴 <b>Hoy no ha entrado ningún caso nuevo.</b>', '<i>Es normal algunos días: la prensa habla mucho de IA, pero pocos artículos describen un caso real.</i>');
}

l.push('', '📊 <b>Cómo ha ido</b>');
l.push(`• Fuentes revisadas: ${r.fuentes_activas}${r.fuentes_con_error ? ` (⚠️ ${r.fuentes_con_error} con error)` : ''}`);
l.push(`• Artículos analizados con IA: ${analizados}${r.no_son_caso ? ` · descartados por no ser un caso real: ${r.no_son_caso}` : ''}`);
if (r.recortados_por_tope) l.push(`• ⏳ ${r.recortados_por_tope} artículos esperan turno (tope diario)`);
if (r.errores) l.push('', `⚠️ <i>${esc(corta(r.errores, 300))}</i>`);
if (hoja) l.push('', `🔗 <a href="${attr(hoja)}">Abrir la hoja</a>`);

let texto = l.join('\n');
if (texto.length > 4096) texto = texto.replace(new RegExp('</?(b|i|a)( [^>]*)?>', 'g'), '').slice(0, 4090);
return [{ json: { texto } }];
