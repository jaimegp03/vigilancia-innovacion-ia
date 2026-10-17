// Entrada: un ítem por archivo leído de /data/proyecto (config/*.json, schemas/*.json, prompts/*.md).
const archivos = {};
const entrada = $input.all();
for (let i = 0; i < entrada.length; i++) {
  const bin = entrada[i].binary && entrada[i].binary.data;
  if (!bin) continue;
  const buf = await this.helpers.getBinaryDataBuffer(i, 'data');
  archivos[bin.fileName] = buf.toString('utf8');
}
for (const nombre of ['parametros.json', 'fuentes.json', 'caso.schema.json', 'extraccion.md', 'clasificacion.md']) {
  if (!(nombre in archivos)) throw new Error(`Falta el archivo ${nombre} en /data/proyecto. Revisa los volúmenes de docker-compose.yml.`);
}

const parametros = JSON.parse(archivos['parametros.json']);
// __OVERRIDES_PARAMETROS__
const fuentes = JSON.parse(archivos['fuentes.json']).fuentes
  .filter(f => f.activa && parametros.idiomas.includes(f.idioma));

// Primera ejecución: ventana ampliada (30 días). La marca se guarda al terminar con éxito.
const sd = $getWorkflowStaticData('global');
const primera = !sd.primera_ejecucion_hecha;

return [{
  json: {
    run_id: 'r-' + Date.now().toString(36),
    inicio_iso: new Date().toISOString(),
    primera_ejecucion: primera,
    ventana_dias: primera ? parametros.ventana_dias_primera_ejecucion : parametros.ventana_dias,
    parametros,
    schema: JSON.parse(archivos['caso.schema.json']),
    prompts: { extraccion: archivos['extraccion.md'], clasificacion: archivos['clasificacion.md'] },
    fuentes,
  },
}];
