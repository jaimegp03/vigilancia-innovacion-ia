// Lee la respuesta del modelo, la parsea y la valida contra schemas/caso.schema.json → $defs/extraccion.
// __VALIDADOR__
// __UTIL_IA__
const cfg = $('Cargar configuración').first().json;
const NODO_PREVIO = '__PREVIO__';

function extraerJson(t) {
  const s = t.replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

return $input.all().map((it, k) => {
  const base = $(NODO_PREVIO).itemMatching(k).json;
  const errores = [];
  const texto = leerIA(it.json, errores);
  let obj = null;
  if (texto) {
    try { obj = JSON.parse(extraerJson(texto)); } catch (e) { errores.push('JSON no parseable: ' + e.message); }
  }
  if (obj) errores.push(...validarContraDef(cfg.schema, 'extraccion', obj).errores);
  const valido = errores.length === 0;
  return {
    json: {
      ...base,
      extraccion: valido ? obj : null,
      valido,
      errores_validacion: errores,
      respuesta_cruda: valido ? undefined : texto.slice(0, 1500),
      intento: __INTENTO__,
    },
  };
});
