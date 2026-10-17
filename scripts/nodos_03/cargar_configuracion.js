// Entrada: un ítem por archivo leído de /data/proyecto (config/*.json, schemas/*.json, prompts/*.md).
const archivos = {};
const entrada = $input.all();
for (let i = 0; i < entrada.length; i++) {
  const bin = entrada[i].binary && entrada[i].binary.data;
  if (!bin) continue;
  const buf = await this.helpers.getBinaryDataBuffer(i, 'data');
  archivos[bin.fileName] = buf.toString('utf8');
}
for (const nombre of ['parametros.json', 'fuentes.json', 'descubrimiento.json', 'caso.schema.json', 'busqueda.md', 'extraccion.md', 'clasificacion.md']) {
  if (!(nombre in archivos)) throw new Error(`Falta el archivo ${nombre} en /data/proyecto. Revisa los volúmenes de docker-compose.yml.`);
}

// __UTIL_URL__
const parametros = JSON.parse(archivos['parametros.json']);
// __OVERRIDES_PARAMETROS__
const desc = JSON.parse(archivos['descubrimiento.json']);
const fuentes = JSON.parse(archivos['fuentes.json']).fuentes.filter(f => f.activa);

// Dominios que ya se vigilan por RSS (el campo "dominio" de fuentes.json; si falta, el host del feed) + dominios sin valor.
const dominiosFuentes = [...new Set(fuentes.map(f => (f.dominio || hostDe(f.feed_url)).toLowerCase()))];
const bloqueados = [...new Set([...dominiosFuentes, ...desc.excluir_dominios])];

// Todas las combinaciones región × tipo; cada ejecución toma N consecutivas, rotando por semana.
const sectorClave = parametros.sector_foco;
const sectorTxt = lang => (sectorClave && desc.sectores[sectorClave] ? ` del sector ${desc.sectores[sectorClave][lang]}` : '');
const combinaciones = [];
for (const r of desc.regiones) {
  for (const t of desc.tipos) {
    const lang = r.idioma;
    const texto = desc.plantillas[lang]
      .replace('{tipo}', t[lang]).replace('{region}', r[lang]).replace('{sector}', sectorTxt(lang));
    combinaciones.push({
      consulta_id: `${r.clave}.${t.clave}`, consulta: texto, region: r[lang], region_nombre: r.nombre, tipo: t[lang], idioma: lang,
      sector: sectorClave && desc.sectores[sectorClave] ? desc.sectores[sectorClave][lang] : 'ninguno',
    });
  }
}
const n = Math.min(desc.consultas_por_ejecucion, combinaciones.length);
const semana = Math.floor(Date.now() / (7 * 86400000));
const inicio = (semana * n) % combinaciones.length;
const consultas = Array.from({ length: n }, (_, i) => combinaciones[(inicio + i) % combinaciones.length]);

return [{
  json: {
    run_id: 'd-' + Date.now().toString(36),
    inicio_iso: new Date().toISOString(),
    ventana_dias: 14,
    parametros,
    descubrimiento: desc,
    schema: JSON.parse(archivos['caso.schema.json']),
    prompts: { busqueda: archivos['busqueda.md'], extraccion: archivos['extraccion.md'], clasificacion: archivos['clasificacion.md'] },
    fuentes: [],
    dominios_fuentes: dominiosFuentes,
    dominios_bloqueados: bloqueados,
    consultas,
    n_combinaciones: combinaciones.length,
  },
}];
