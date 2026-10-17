// El workflow 03 busca FUERA de la lista de fuentes: se quitan los artículos de dominios que ya se vigilan por RSS.
const cfg = $('Cargar configuración').first().json;
const conocidos = cfg.dominios_bloqueados;
const esConocido = host => conocidos.some(d => host === d || host.endsWith('.' + d));
return $input.all()
  .filter(i => i.json.url)
  .filter(i => !esConocido(i.json.fuente))
  .map(i => ({ json: i.json }));
