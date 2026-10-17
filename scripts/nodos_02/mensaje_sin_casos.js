const cfg = $('Cargar configuración').first().json;
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const f = iso => { const [a, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };
let hoja = '';
try { hoja = `https://docs.google.com/spreadsheets/d/${$env.GOOGLE_SHEET_ID}/edit`; } catch (e) { hoja = ''; }
const texto = [
  '📊 <b>VIGILANCIA IA · Informe semanal</b>',
  `🗓 <i>${f(cfg.desde)} → ${f(cfg.hasta)}</i>`,
  '',
  '━━━━━━━━━━━━━━━━━━',
  '',
  `😴 Esta semana no hay casos nuevos en la hoja «${cfg.parametros.hojas.casos}».`,
  '',
  '🔎 <b>Qué revisar</b>',
  '• La hoja <i>log_ejecuciones</i>: ¿ha corrido bien el workflow 01 cada día?',
  '• Si hubo errores de cuota de la IA, los artículos se reintentan al día siguiente.',
  ...(hoja ? ['', `📄 <a href="${hoja}">Abrir la hoja de cálculo</a>`] : []),
].join('\n');
return [{ json: { texto } }];
