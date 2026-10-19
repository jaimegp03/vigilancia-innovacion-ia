// Filas de la hoja "casos" → casos ingeridos el día de la edición (hora de Madrid), en formato compacto.
const cfg = $('Cargar configuración').first().json;
const num = v => { const n = Number(v); return isNaN(n) ? null : n; };
const json = v => { try { return JSON.parse(v); } catch (e) { return []; } };
const madrid = t => new Date(t).toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const forzada = !!((cfg.parametros.web || {}).fecha_edicion_forzada);
const MAX = 60; // tope de noticias por edición (schemas/edicion.schema.json → editor_salida.noticias)

const vistos = new Set();
const casos = $input.all()
  .map(i => i.json)
  .filter(r => r.id && r.titulo_caso && r.url)
  // Uso normal: casos ingeridos hoy. Con web.fecha_edicion_forzada (reconstruir un día pasado): también los casos publicados ese día.
  .filter(r => {
    const t = Date.parse(r.fecha_ingesta);
    const ingeridoHoy = !isNaN(t) && madrid(t) === cfg.fecha;
    return forzada ? ingeridoHoy || String(r.fecha_publicacion || '').slice(0, 10) === cfg.fecha : ingeridoHoy;
  })
  .filter(r => (vistos.has(r.id) ? false : vistos.add(r.id)))
  .map(r => ({
    id: String(r.id), titulo_caso: r.titulo_caso, empresa: r.empresa || null, sector: r.sector || null, pais: r.pais || null,
    resumen: r.resumen || null, resultado: r.resultado || null, metricas: json(r.metricas), madurez: r.madurez || null,
    tipo_innovacion: r.tipo_innovacion || null, puntuacion_total: num(r.puntuacion_total), novedad: num(r.novedad), evidencia: num(r.evidencia),
    confianza: r.confianza || null, tipo_fuente: r.tipo_fuente || null, fuente: r.fuente, url: r.url, fecha_publicacion: String(r.fecha_publicacion || '').slice(0, 10),
  }))
  .sort((a, b) => (b.puntuacion_total || 0) - (a.puntuacion_total || 0) || (b.evidencia || 0) - (a.evidencia || 0))
  .slice(0, MAX);

// Al editor solo se le pasa lo necesario (sin URL): los enlaces los copia n8n de los casos.
const paraPrompt = casos.map(({ url, ...resto }) => resto);
return [{ json: { n_dia: casos.length, ids_prompt: casos.map(c => c.id), casos_prompt: paraPrompt, casos_todos: casos } }];
