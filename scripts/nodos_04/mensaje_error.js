// Aviso de Telegram cuando algo falla al preparar la edición. Devuelve siempre UN solo ítem.
const cfg = $('Cargar configuración').first().json;
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const corta = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const seguro = f => { try { return f(); } catch (e) { return null; } };
const validacion = seguro(() => $('Validar edición (reintento)').first().json) || seguro(() => $('Validar edición').first().json);
const comando = seguro(() => $input.first().json);
let motivo = 'No se pudo completar la edición.';
if (comando && (comando.stderr || comando.error)) motivo = 'Falló la construcción de la web: ' + (comando.stderr || (comando.error && comando.error.message) || '');
else if (validacion && validacion.estado === 'invalida') motivo = 'La IA no devolvió una edición válida (tras reintentar): ' + (validacion.errores || []).slice(0, 3).join('; ');
return [{ json: { texto: [
  `⚠️ <b>${esc(cfg.parametros.publicacion.nombre_corto.toUpperCase())} · No se pudo preparar la edición</b>`,
  `🗓 <i>${esc(cfg.fecha)}</i>`, '',
  `<i>${esc(corta(motivo, 600))}</i>`, '',
  'No se ha perdido nada: los casos siguen en la hoja. Puedes volver a lanzar el workflow 04 a mano.',
].join('\n') } }];
