// Filas de la hoja "casos" → casos de los últimos 7 días en formato compacto (una sola salida).
const cfg = $('Cargar configuración').first().json;
const p = cfg.parametros;
const limite = Date.now() - p.ventana_dias * 86400000;
const num = v => { const n = Number(v); return isNaN(n) ? null : n; };
const lista = v => String(v || '').split(';').map(s => s.trim()).filter(Boolean);
const json = v => { try { return JSON.parse(v); } catch (e) { return []; } };

const vistos = new Set();
const casos = $input.all()
  .map(i => i.json)
  .filter(r => r.id && r.titulo_caso)
  .filter(r => { const t = Date.parse(r.fecha_ingesta); return !isNaN(t) && t >= limite; })
  .filter(r => (vistos.has(r.id) ? false : vistos.add(r.id)))
  // Modo sectorial: solo casos del sector foco o con relevancia suficiente para él. En fase 1 (sector_foco = null) no filtra nada.
  .filter(r => !p.sector_foco || r.sector === p.sector_foco || (num(r.relevancia_sector) || 0) >= p.relevancia_sector_minima)
  .map(r => ({
    id: r.id, empresa: r.empresa || null, sector: r.sector || null, pais: r.pais || null,
    titulo_caso: r.titulo_caso, resumen: r.resumen || null, tecnologia_ia: lista(r.tecnologia_ia),
    tipo_innovacion: r.tipo_innovacion || null, madurez: r.madurez || null, metricas: json(r.metricas),
    categoria: r.categoria || null, puntuacion_total: num(r.puntuacion_total), evidencia: num(r.evidencia), relevancia_sector: num(r.relevancia_sector),
    etiquetas: lista(r.etiquetas), confianza: r.confianza || null,
    fuente: r.fuente, url: r.url, region_fuente: r.region_fuente || null,
  }))
  .sort((a, b) => (b.puntuacion_total || 0) - (a.puntuacion_total || 0) || (b.evidencia || 0) - (a.evidencia || 0));

// Al modelo de tendencias solo se le pasa lo necesario (sin URL) y con un tope para controlar coste.
const paraPrompt = casos.slice(0, p.max_casos_tendencias).map(({ url, fuente, region_fuente, ...resto }) => ({ ...resto, region: region_fuente }));
return [{
  json: {
    n_semana: casos.length,
    n_prompt: paraPrompt.length,
    ids_prompt: paraPrompt.map(c => c.id),
    casos_prompt: paraPrompt,
    casos_todos: casos,
  },
}];
