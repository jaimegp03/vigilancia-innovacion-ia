// Valida la clasificación, calcula la puntuación total (pesos en parametros.json) y construye el caso final.
// __VALIDADOR__
// __UTIL_IA__
const cfg = $('Cargar configuración').first().json;
const p = cfg.parametros;
const NODO_PREVIO = 'Preparar prompt clasificación';

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
  let cls = null;
  if (texto) {
    try { cls = JSON.parse(extraerJson(texto)); } catch (e) { errores.push('JSON no parseable: ' + e.message); }
  }
  if (cls) errores.push(...validarContraDef(cfg.schema, 'clasificacion', cls).errores);

  if (errores.length) {
    // Un fallo de la API (cuota, sobrecarga…) no es culpa del artículo: se "omite" sin guardarlo, para reintentarlo en la siguiente ejecución.
    const falloApi = errores.some(e => e.startsWith('Sin respuesta del modelo'));
    return {
      json: {
        id: base.id, url: base.url, url_normalizada: base.url_normalizada, titular: base.titular, fuente: base.fuente,
        acceso: base.acceso, destino: falloApi ? 'omitidos' : 'descartados', etapa: 'clasificacion',
        motivo: ('Clasificación inválida: ' + errores.join('; ')).slice(0, 300),
      },
    };
  }

  const w = p.pesos_puntuacion;
  const suma = Object.keys(w).reduce((s, c) => s + w[c] * cls[c], 0);
  const pesos = Object.values(w).reduce((s, x) => s + x, 0);
  cls.puntuacion_total = Math.round((suma / pesos) / 5 * 100);

  return {
    json: {
      destino: 'casos',
      caso: {
        metadatos: {
          id: base.id, url: base.url, url_normalizada: base.url_normalizada, titular: base.titular,
          fuente: base.fuente, tipo_fuente: base.tipo_fuente, region_fuente: base.region_fuente,
          fecha_publicacion: base.fecha_publicacion, idioma: base.idioma, acceso: base.acceso,
          origen: base.origen || 'rss', ...(base.consulta ? { consulta: base.consulta } : {}),
          fecha_ingesta: new Date().toISOString(),
          modelo_extraccion: p.modelos.extraccion, modelo_clasificacion: p.modelos.clasificacion,
        },
        extraccion: base.extraccion,
        clasificacion: cls,
      },
    },
  };
});
