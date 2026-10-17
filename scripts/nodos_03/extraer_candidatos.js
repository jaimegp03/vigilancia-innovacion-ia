// Convierte la respuesta de la búsqueda web en artículos candidatos.
// Solo se aceptan URLs que aparecen de verdad en los resultados de la herramienta de búsqueda: el modelo elige, pero no puede inventar enlaces.
const cfg = $('Cargar configuración').first().json;
const max = cfg.descubrimiento.max_candidatos_por_consulta;
// __UTIL_URL__

function extraerJson(t) {
  const s = t.replace(/```(?:json)?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

const salida = [];
$input.all().forEach((it, k) => {
  const q = $('Preparar prompt búsqueda').itemMatching(k).json;
  const bloques = it.json.content || [];
  if (!bloques.length) {
    const e = it.json.error;
    salida.push({ json: { error: 'Sin respuesta de la búsqueda' + (e ? ': ' + (typeof e === 'string' ? e : JSON.stringify(e)).slice(0, 200) : ''), consulta: q.consulta } });
    return;
  }

  // Resultados reales devueltos por la herramienta web_search
  const resultados = new Map();
  for (const b of bloques) {
    if (b.type !== 'web_search_tool_result' || !Array.isArray(b.content)) continue;
    for (const r of b.content) if (r.type === 'web_search_result' && r.url) resultados.set(r.url, { titular: r.title || '', page_age: r.page_age || null });
  }

  // Selección del modelo (si no es JSON válido, se usan los primeros resultados)
  const texto = bloques.filter(b => b.type === 'text').map(b => b.text).join('');
  let elegidos = [];
  try {
    const obj = JSON.parse(extraerJson(texto));
    elegidos = (obj.candidatos || []).filter(c => c && resultados.has(c.url)).map(c => ({ url: c.url, titular: c.titular || resultados.get(c.url).titular, motivo: c.motivo || '' }));
  } catch (e) {
    elegidos = [...resultados].map(([url, r]) => ({ url, titular: r.titular, motivo: '' }));
  }

  for (const c of elegidos.slice(0, max)) {
    const host = hostDe(c.url);
    if (!host) continue;
    const r = resultados.get(c.url);
    salida.push({
      json: {
        fuente: host,
        tipo_fuente: 'busqueda_web',
        region_fuente: q.region_nombre,
        idioma: q.idioma,
        acceso_fuente: 'abierto',
        titular: quitarHtml(c.titular || r.titular),
        url: c.url,
        url_normalizada: normalizarUrl(c.url),
        // page_age llega como texto ("October 14, 2026") o vacío; si no se entiende, se usa la fecha de hallazgo.
        fecha_publicacion: fechaIso(r.page_age) || new Date().toISOString(),
        resumen_feed: quitarHtml(c.motivo).slice(0, 400),
        origen: 'busqueda_web',
        consulta: q.consulta,
      },
    });
  }
});
return salida;
