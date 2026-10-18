// Entrada: un ítem por archivo leído de /data/proyecto (config/*.json, schemas/*.json, prompts/*.md).
const archivos = {};
const entrada = $input.all();
for (let i = 0; i < entrada.length; i++) {
  const bin = entrada[i].binary && entrada[i].binary.data;
  if (!bin) continue;
  const buf = await this.helpers.getBinaryDataBuffer(i, 'data');
  archivos[bin.fileName] = buf.toString('utf8');
}
for (const nombre of ['parametros.json', 'edicion.schema.json', 'editor.md']) {
  if (!(nombre in archivos)) throw new Error(`Falta el archivo ${nombre} en /data/proyecto. Revisa los volúmenes de docker-compose.yml.`);
}

const parametros = JSON.parse(archivos['parametros.json']);
// __OVERRIDES_PARAMETROS__
const pub = parametros.publicacion;
const web = parametros.web || {};
if (!pub || !pub.nombre) throw new Error('Falta publicacion.nombre en config/parametros.json');

const madrid = d => d.toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' }); // AAAA-MM-DD
const hoy = new Date();
// web.fecha_edicion_forzada permite reconstruir la edición de un día pasado (déjalo en null en el uso normal).
const fecha = /^\d{4}-\d{2}-\d{2}$/.test(web.fecha_edicion_forzada || '') ? web.fecha_edicion_forzada : madrid(hoy);
const dias = Math.round((Date.parse(fecha + 'T00:00:00Z') - Date.parse((pub.primera_edicion || fecha) + 'T00:00:00Z')) / 86400000);

return [{
  json: {
    run_id: 'e-' + Date.now().toString(36),
    inicio_iso: hoy.toISOString(),
    fecha,
    numero_edicion: Math.max(1, dias + 1),
    parametros,
    schema_edicion: JSON.parse(archivos['edicion.schema.json']),
    prompts: { editor: archivos['editor.md'] },
  },
}];
