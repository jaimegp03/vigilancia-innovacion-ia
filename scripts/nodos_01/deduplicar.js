// Descarta URLs ya vistas (hojas "casos" y "descartados") y repetidas dentro de esta misma ejecución.
const conocidas = new Set($('URLs conocidas (descartados)').first().json.urls);

// __UTIL_URL__

const vistas = new Set();
return $input.all()
  .filter(i => i.json.url)
  .sort((a, b) => Date.parse(b.json.fecha_publicacion) - Date.parse(a.json.fecha_publicacion))
  .filter(i => {
    const u = i.json.url_normalizada;
    if (conocidas.has(u) || vistas.has(u)) return false;
    vistas.add(u);
    return true;
  })
  .map(i => ({ json: { ...i.json, id: hash(i.json.url_normalizada) } }));
