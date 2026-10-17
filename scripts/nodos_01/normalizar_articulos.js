// Convierte los ítems del RSS (de todas las fuentes) en artículos con un formato común.
// __UTIL_URL__

const salida = [];
const entrada = $input.all();
for (let k = 0; k < entrada.length; k++) {
  const it = entrada[k];
  if (!it.json.link) continue;
  // itemMatching recorre la trazabilidad de ítems hasta la fuente que originó este artículo
  const f = $('Preparar fuentes').itemMatching(k).json;
  const bruto = it.json.contentSnippet || it.json.content || it.json['content:encoded'] || it.json.summary || '';
  salida.push({
    json: {
      fuente: f.nombre,
      tipo_fuente: f.tipo,
      region_fuente: f.region,
      idioma: f.idioma,
      acceso_fuente: f.acceso,
      titular: quitarHtml(it.json.title),
      url: it.json.link.trim(),
      url_normalizada: normalizarUrl(it.json.link),
      fecha_publicacion: fechaIso(it.json.isoDate || it.json.pubDate),
      resumen_feed: quitarHtml(bruto).slice(0, 800),
      origen: 'rss',
    },
  });
}
return salida;
