// PUBLICACIÓN (desactivada por defecto). BLOQUEO DE SEGURIDAD: se niega a continuar si la web generada
// incrusta alguna edición de ejemplo ("es_ejemplo": true). Los datos de ejemplo nunca se publican.
const cfg = $('Cargar configuración').first().json;
const web = cfg.parametros.web || {};
const bin = $input.first().binary && $input.first().binary.data;
if (!bin) throw new Error('PUBLICACIÓN BLOQUEADA: no se pudo leer web/index.html.');
const html = (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8');
if (html.includes('"es_ejemplo":true')) {
  throw new Error('PUBLICACIÓN BLOQUEADA: web/index.html contiene ediciones de EJEMPLO ("es_ejemplo": true). Los datos de ejemplo nunca se publican. Genera la web solo con ediciones reales (node web/build.mjs --sin-ejemplos).');
}
if (web.destino !== 'github_pages') throw new Error('PUBLICACIÓN BLOQUEADA: web.destino no es "github_pages" en config/parametros.json.');
if (!web.propietario || !web.repo) throw new Error('PUBLICACIÓN BLOQUEADA: faltan web.propietario o web.repo en config/parametros.json.');
return $input.all();
