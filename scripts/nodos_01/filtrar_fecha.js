// Se queda con los artículos publicados dentro de la ventana (7 días; 30 en la primera ejecución).
const cfg = $('Cargar configuración').first().json;
const ahora = Date.now();
const limite = ahora - cfg.ventana_dias * 86400000;
return $input.all()
  .filter(i => i.json.url)
  .filter(i => {
    const t = Date.parse(i.json.fecha_publicacion);
    return !isNaN(t) && t >= limite && t <= ahora + 86400000;
  })
  .map(i => ({ json: i.json }));
