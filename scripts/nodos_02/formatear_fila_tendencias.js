// ALMACENAMIENTO · fila de la hoja "tendencias" (una por semana).
// "tendencias_texto" es la versión legible; las columnas en JSON se conservan (ocultas en la hoja) por si otro sistema las lee.
const cfg = $('Cargar configuración').first().json;
const semana = $('Casos de la semana').first().json;
const j = $input.first().json;
const t = j.tendencias;
const js = v => JSON.stringify(v || []);
const FUERZA = { alta: '🔴 alta', media: '🟠 media', emergente: '🟡 emergente' };
const texto = t && t.tendencias.length
  ? t.tendencias.map((x, i) => `${i + 1}. ${x.titulo} — ${FUERZA[x.fuerza] || x.fuerza}, ${x.casos_ids.length} casos${x.implicacion ? '\n    → ' + x.implicacion : ''}`).join('\n')
  : (t ? 'Sin tendencias con 2 o más casos esta semana.' : '');
return [{
  json: {
    semana_desde: cfg.desde,
    semana_hasta: cfg.hasta,
    estado: j.estado,
    n_casos: semana.n_prompt,
    resumen_ejecutivo: t ? t.resumen_ejecutivo : '',
    tendencias_texto: texto,
    cautelas: t && t.cautelas ? t.cautelas.join('\n') : '',
    limitaciones: (t && t.limitaciones) || '',
    avisos: [...j.errores, ...j.ajustes].join(' | ').slice(0, 500),
    tendencias: js(t && t.tendencias),
    casos_destacados: js(t && t.casos_destacados),
    sectores_mas_activos: js(t && t.sectores_mas_activos),
    tecnologias_mas_citadas: js(t && t.tecnologias_mas_citadas),
    modelo: cfg.parametros.modelos.tendencias,
    fecha_generacion: new Date().toISOString(),
  },
}];
