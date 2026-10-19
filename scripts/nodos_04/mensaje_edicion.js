// Aviso de Telegram cuando la edición se ha generado. Devuelve siempre UN solo ítem.
const cfg = $('Cargar configuración').first().json;
const ed = $('Ensamblar edición').first().json;
const web = cfg.parametros.web || {};
if (web.silencioso) return []; // reconstrucciones de ediciones pasadas: sin aviso por Telegram
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fecha = new Date(cfg.fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
let publicada = false;
try { publicada = $('Subir archivo a GitHub').all().length > 0; } catch (e) { publicada = false; }
const enlace = publicada && web.propietario ? `https://${web.propietario}.github.io/${web.repo}/` : '';

const l = [
  `📰 <b>${esc(cfg.parametros.publicacion.nombre_corto.toUpperCase())} · Edición nº ${ed.numero_edicion}</b>`,
  `🗓 <i>${esc(fecha)}</i>`, '',
  `✅ <b>La edición de hoy está lista</b> con ${ed.n_noticias} ${ed.n_noticias === 1 ? 'noticia' : 'noticias'}.`,
  `🌟 <b>Portada:</b> ${esc(ed.portada)}`,
  `📊 Puntuación media ${String(ed.puntuacion_media).replace('.', ',')}/5 · ${ed.n_senales} ${ed.n_senales === 1 ? 'señal débil' : 'señales débiles'}`,
  '',
  enlace ? `🔗 <a href="${esc(enlace)}">Ver la publicación</a>` : '📁 Ábrela con doble clic: <code>web/index.html</code> dentro de la carpeta del proyecto.',
];
return [{ json: { texto: l.join('\n') } }];
