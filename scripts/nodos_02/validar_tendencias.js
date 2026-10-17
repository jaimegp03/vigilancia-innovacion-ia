// Parsea y valida el informe de tendencias contra schemas/caso.schema.json → $defs/tendencias
// y comprueba que solo cita ids de casos que se le enviaron.
// __VALIDADOR__
// __UTIL_IA__
const cfg = $('Cargar configuración').first().json;
const semana = $('Casos de la semana').first().json;

function extraerJson(t) {
  const s = t.replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

const it = $input.first();
const errores = [];
const ajustes = [];
const texto = leerIA(it && it.json, errores);
let obj = null;
if (texto) {
  try { obj = JSON.parse(extraerJson(texto)); } catch (e) { errores.push('JSON no parseable: ' + e.message); }
}

if (obj) {
  errores.push(...validarContraDef(cfg.schema, 'tendencias', obj).errores);
  if (errores.length === 0) {
    const validos = new Set(semana.ids_prompt);
    // Se descartan ids inventados; una tendencia necesita al menos 2 casos reales.
    obj.tendencias = obj.tendencias.filter(t => {
      const antes = t.casos_ids.length;
      t.casos_ids = t.casos_ids.filter(id => validos.has(id));
      if (t.casos_ids.length < antes) ajustes.push(`Tendencia "${t.titulo}": se quitaron ${antes - t.casos_ids.length} ids inexistentes`);
      if (t.casos_ids.length < 2) { ajustes.push(`Tendencia "${t.titulo}" eliminada: menos de 2 casos válidos`); return false; }
      return true;
    });
    obj.casos_destacados = obj.casos_destacados.filter(c => validos.has(c.id));
    obj.periodo = { desde: cfg.desde, hasta: cfg.hasta };
    obj.n_casos_analizados = semana.n_prompt;
  }
}

return [{
  json: {
    estado: errores.length ? 'invalida' : 'ok',
    tendencias: errores.length ? null : obj,
    errores,
    ajustes,
    respuesta_cruda: errores.length ? texto.slice(0, 1500) : undefined,
  },
}];
