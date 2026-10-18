// PUBLICACIÓN (desactivada por defecto). Prepara los archivos que se suben al repositorio de la web:
// solo index.html, .nojekyll y robots.txt (si no es indexable). Nunca data/, config/, prompts/ ni workflows/.
const cfg = $('Cargar configuración').first().json;
const web = cfg.parametros.web || {};
const bin = $input.first().binary && $input.first().binary.data;
if (!bin) throw new Error('Falta web/index.html leído del disco.');
const html = (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8');
const archivos = [{ ruta: 'index.html', contenido: html }, { ruta: '.nojekyll', contenido: '' }];
if (web.indexable !== true) archivos.push({ ruta: 'robots.txt', contenido: 'User-agent: *\nDisallow: /\n' });
return archivos.map(a => ({
  json: {
    ruta: a.ruta, base64: Buffer.from(a.contenido, 'utf8').toString('base64'),
    propietario: web.propietario, repo: web.repo, rama: web.rama || 'main', mensaje: `Edición ${cfg.fecha}`,
  },
}));
