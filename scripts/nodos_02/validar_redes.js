// Valida cada borrador contra schemas/caso.schema.json → $defs/borrador_redes y comprueba que cita la URL de la fuente.
// Un borrador con fallos se guarda igualmente (estado "revisar_formato") para que una persona lo corrija.
// __VALIDADOR__
// __UTIL_IA__
const cfg = $('Cargar configuración').first().json;

function extraerJson(t) {
  const s = t.replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

return $input.all().map((it, k) => {
  const base = $('Preparar prompt redes').itemMatching(k).json;
  const errores = [];
  const texto = leerIA(it.json, errores);
  let obj = null;
  if (texto) {
    try { obj = JSON.parse(extraerJson(texto)); } catch (e) { errores.push('JSON no parseable: ' + e.message); }
  }
  if (obj) {
    // Si un texto se pasa de longitud, se acorta la parte escrita pero se conserva la URL de la fuente al final
    // (el recorte genérico del validador la cortaría y el borrador saldría marcado "falta la URL").
    for (const [red, limite] of [['linkedin', 1200], ['x', 270]]) {
      const r = obj[red];
      if (!r || typeof r.texto !== 'string' || r.texto.length <= limite || !r.texto.includes(base.url)) continue;
      const i = r.texto.lastIndexOf(base.url);
      const cola = r.texto.slice(i);
      if (cola.length < limite - 10) r.texto = r.texto.slice(0, i).trimEnd().slice(0, limite - cola.length - 2).trimEnd() + '… ' + cola;
    }
    errores.push(...validarContraDef(cfg.schema, 'borrador_redes', obj).errores);
    if (obj.caso_id !== base.id) { errores.push(`caso_id "${obj.caso_id}" no coincide con "${base.id}"`); obj.caso_id = base.id; }
    for (const red of ['linkedin', 'x']) {
      if (obj[red] && typeof obj[red].texto === 'string' && !obj[red].texto.includes(base.url)) errores.push(`${red}: falta la URL de la fuente`);
    }
  }
  return {
    json: {
      id: base.id, posicion: base.posicion, titulo_caso: base.titulo_caso, fuente: base.fuente, url: base.url,
      puntuacion_total: base.puntuacion_total,
      borrador: obj, estado: errores.length ? 'revisar_formato' : 'pendiente_revision', errores,
      respuesta_cruda: errores.length ? texto.slice(0, 1500) : undefined,
    },
  };
});
