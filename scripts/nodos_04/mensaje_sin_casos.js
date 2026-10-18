const cfg = $('Cargar configuración').first().json;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fecha = new Date(cfg.fecha + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
return [{ json: { texto: [
  `📰 <b>${esc(cfg.parametros.publicacion.nombre_corto.toUpperCase())} · Sin edición hoy</b>`,
  `🗓 <i>${esc(fecha)}</i>`, '',
  '😴 Hoy no hay casos nuevos en la hoja, así que no se publica edición.',
  '🔎 Si esperabas casos, mira la hoja <i>log_ejecuciones</i>: ¿corrió bien el workflow 01 esta mañana?',
].join('\n') } }];
