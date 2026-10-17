// Descarta URLs ya vistas (hojas "casos" y "descartados") o repetidas entre consultas, y asigna el id del caso.
const conocidas = new Set($('URLs conocidas (descartados)').first().json.urls);
// __UTIL_URL__

const vistas = new Set();
return $input.all()
  .filter(i => i.json.url)
  .filter(i => {
    const u = i.json.url_normalizada;
    if (conocidas.has(u) || vistas.has(u)) return false;
    vistas.add(u);
    return true;
  })
  .map(i => ({ json: { ...i.json, id: hash(i.json.url_normalizada) } }));
