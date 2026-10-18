// Parsea y valida la salida del editor contra schemas/edicion.schema.json → $defs/editor_salida
// y comprueba que solo cita ids de casos que se le enviaron.
// __VALIDADOR__
// __UTIL_IA__
const cfg = $('Cargar configuración').first().json;
const dia = $('Casos del día').first().json;
const previo = $('Preparar prompt editor').first().json;

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
  errores.push(...validarContraDef(cfg.schema_edicion, 'editor_salida', obj).errores);
  if (errores.length === 0) {
    const validos = new Set(dia.ids_prompt);
    if (!validos.has(obj.portada_id)) errores.push(`portada_id "${obj.portada_id}" no es un id de los casos recibidos`);
    const filtra = (lista, nombre) => lista.filter(id => { const ok = validos.has(id); if (!ok) ajustes.push(`${nombre}: se quitó el id inexistente "${id}"`); return ok; });
    obj.destacadas_ids = filtra(obj.destacadas_ids, 'destacadas_ids');
    obj.senales_debiles_ids = filtra(obj.senales_debiles_ids, 'senales_debiles_ids');
    obj.noticias = obj.noticias.filter(n => { const ok = validos.has(n.caso_id); if (!ok) ajustes.push(`noticias: se quitó el caso inexistente "${n.caso_id}"`); return ok; });
  }
}

return [{
  json: {
    estado: errores.length ? 'invalida' : 'ok',
    salida: errores.length ? null : obj,
    errores,
    errores_validacion: errores,
    ajustes,
    prompt_system: previo.prompt_system,
    prompt_user: previo.prompt_user,
    respuesta_cruda: errores.length ? texto.slice(0, 1500) : undefined,
  },
}];
