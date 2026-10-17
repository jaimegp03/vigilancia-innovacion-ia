// Entrada: un ítem por archivo leído de /data/proyecto (config/*.json, schemas/*.json, prompts/*.md).
const archivos = {};
const entrada = $input.all();
for (let i = 0; i < entrada.length; i++) {
  const bin = entrada[i].binary && entrada[i].binary.data;
  if (!bin) continue;
  const buf = await this.helpers.getBinaryDataBuffer(i, 'data');
  archivos[bin.fileName] = buf.toString('utf8');
}
for (const nombre of ['parametros.json', 'caso.schema.json', 'tendencias.md', 'redes.md']) {
  if (!(nombre in archivos)) throw new Error(`Falta el archivo ${nombre} en /data/proyecto. Revisa los volúmenes de docker-compose.yml.`);
}

const parametros = JSON.parse(archivos['parametros.json']);
// __OVERRIDES_PARAMETROS__
const dia = d => d.toISOString().slice(0, 10);
const hoy = new Date();

return [{
  json: {
    run_id: 'i-' + Date.now().toString(36),
    inicio_iso: hoy.toISOString(),
    desde: dia(new Date(hoy.getTime() - parametros.ventana_dias * 86400000)),
    hasta: dia(hoy),
    parametros,
    schema: JSON.parse(archivos['caso.schema.json']),
    prompts: { tendencias: archivos['tendencias.md'], redes: archivos['redes.md'] },
  },
}];
