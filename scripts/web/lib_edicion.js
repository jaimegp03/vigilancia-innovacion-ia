// Ensambla una edición completa (schemas/edicion.schema.json → $defs.edicion) a partir de:
//   · los casos del día (filas planas de la hoja "casos") y
//   · la salida del editor jefe (IA): portada, destacadas, textos, claves, análisis y grupos de noticias repetidas.
// La IA nunca escribe URLs, medios, fechas ni puntuaciones: todo eso se copia de los casos por su id.
// Las reglas que deben ser objetivas las aplica el código, no la IA: agrupar la misma historia contada por varios medios,
// decidir qué son señales débiles y calcular las cifras.
// Este archivo se usa tal cual en el build/ejemplos (Node) y se incrusta en el nodo Code del workflow 04.
const SECTORES = ['banca_seguros', 'automocion', 'turismo_hosteleria', 'construccion_inmobiliario', 'gran_consumo_alimentacion', 'retail_comercio', 'salud_farma', 'energia_utilities', 'industria_manufactura', 'logistica_transporte', 'telecomunicaciones', 'educacion', 'sector_publico', 'medios_marketing', 'agricultura', 'tecnologia_software', 'aeroespacial_defensa', 'ciencia_id', 'deporte_ocio', 'servicios_profesionales', 'otros'];
const TIPOS = ['producto_servicio', 'proceso_operaciones', 'atencion_cliente', 'marketing_ventas', 'analitica_prediccion', 'generacion_contenido', 'investigacion_desarrollo', 'seguridad_riesgo', 'otros'];
const MADUREZ = ['anuncio', 'piloto', 'produccion', 'escalado', 'no_indicado'];
const AFIRMACIONES = ['hecho_confirmado', 'afirmacion_empresa', 'opinion'];
const TIPOS_FUENTE = ['revista', 'medio_economico', 'consultora', 'nota_prensa'];

const recorta = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const nota5 = total => Math.max(1, Math.min(5, Math.round((Number(total) || 0) / 20)));
const sinTildes = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const PARADAS = new Set(['para', 'como', 'desde', 'sobre', 'entre', 'con', 'una', 'uno', 'unos', 'unas', 'del', 'las', 'los', 'por', 'que', 'sus', 'este', 'esta', 'tras', 'mediante', 'nuevo', 'nueva', 'nuevos', 'nuevas', 'lanza', 'presenta', 'amplia', 'integra', 'usa', 'utiliza']);
const palabras = s => new Set(sinTildes(s).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !PARADAS.has(w)));

function noticiaDe(caso, texto) {
  const t = texto || {};
  const resumen = recorta(caso.resumen, 700);
  return {
    id: String(caso.id),
    titular: recorta(t.titular || caso.titulo_caso, 140),
    entradilla: recorta(t.entradilla || resumen, 320),
    resumen,
    impacto: recorta(t.impacto || caso.resultado || '', 320),
    sector: SECTORES.includes(caso.sector) ? caso.sector : 'otros',
    tipo_innovacion: TIPOS.includes(caso.tipo_innovacion) ? caso.tipo_innovacion : null,
    empresa: caso.empresa ? recorta(caso.empresa, 120) : null,
    pais: caso.pais ? recorta(caso.pais, 80) : null,
    madurez: MADUREZ.includes(caso.madurez) ? caso.madurez : null,
    tipo_afirmacion: AFIRMACIONES.includes(t.tipo_afirmacion) ? t.tipo_afirmacion : 'afirmacion_empresa',
    puntuacion: nota5(caso.puntuacion_total),
    puntuacion_100: Number.isFinite(Number(caso.puntuacion_total)) ? Math.round(Number(caso.puntuacion_total)) : null,
    novedad: Number.isInteger(Number(caso.novedad)) && Number(caso.novedad) >= 1 ? Math.min(5, Number(caso.novedad)) : null,
    evidencia: Number.isInteger(Number(caso.evidencia)) && Number(caso.evidencia) >= 1 ? Math.min(5, Number(caso.evidencia)) : null,
    vigilar: t.vigilar ? recorta(t.vigilar, 240) : null,
    confianza: ['alta', 'media', 'baja'].includes(caso.confianza) ? caso.confianza : null,
    medio: recorta(caso.fuente || 'Fuente no indicada', 120),
    tipo_fuente: TIPOS_FUENTE.includes(caso.tipo_fuente) ? caso.tipo_fuente : null,
    fecha_publicacion: String(caso.fecha_publicacion || '').slice(0, 40),
    url: caso.url ? String(caso.url).slice(0, 600) : null,
  };
}

// Une en grupos los casos que cuentan la misma historia: los que indica el editor y, como red de seguridad,
// los de la misma empresa con títulos muy parecidos.
function agrupar(casos, gruposEditor) {
  const padre = new Map(casos.map(c => [String(c.id), String(c.id)]));
  const raiz = x => { while (padre.get(x) !== x) { padre.set(x, padre.get(padre.get(x))); x = padre.get(x); } return x; };
  const unir = (a, b) => { const ra = raiz(a), rb = raiz(b); if (ra !== rb) padre.set(rb, ra); };
  for (const g of gruposEditor || []) {
    const ids = (g || []).map(String).filter(id => padre.has(id));
    for (let i = 1; i < ids.length; i++) unir(ids[0], ids[i]);
  }
  const pal = new Map(casos.map(c => [String(c.id), palabras(c.titulo_caso)]));
  for (let i = 0; i < casos.length; i++) {
    for (let j = i + 1; j < casos.length; j++) {
      const a = casos[i], b = casos[j];
      if (!a.empresa || sinTildes(a.empresa) !== sinTildes(b.empresa)) continue;
      const pa = pal.get(String(a.id)), pb = pal.get(String(b.id));
      const comun = [...pa].filter(w => pb.has(w)).length;
      const union = new Set([...pa, ...pb]).size || 1;
      if (comun / union >= 0.34) unir(String(a.id), String(b.id));
    }
  }
  const grupos = new Map();
  casos.forEach(c => { const r = raiz(String(c.id)); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(c); });
  return [...grupos.values()];
}

function ensamblarEdicion({ casos, salida, fecha, numero, esEjemplo = false, modelo = null, generadaEn = null }) {
  if (!casos.length) throw new Error('No hay casos para ensamblar la edición');
  const textos = new Map(((salida && salida.noticias) || []).map(n => [String(n.caso_id), n]));
  const peso = c => Number(c.puntuacion_total) || 0;

  // 1) Una noticia por historia: se queda el caso mejor puntuado y los demás pasan a "otras fuentes".
  const noticias = agrupar(casos, salida && salida.historias_repetidas).map(grupo => {
    const orden = [...grupo].sort((a, b) => peso(b) - peso(a));
    const n = noticiaDe(orden[0], textos.get(String(orden[0].id)));
    const otras = orden.slice(1).filter(c => c.url && c.url !== orden[0].url).map(c => ({
      medio: recorta(c.fuente || 'Fuente no indicada', 120), url: String(c.url).slice(0, 600),
      ...(c.fecha_publicacion ? { fecha_publicacion: String(c.fecha_publicacion).slice(0, 40) } : {}),
    }));
    if (otras.length) n.otras_fuentes = otras.slice(0, 8);
    n._ids = orden.map(c => String(c.id));
    return n;
  });
  const porId = new Map();
  noticias.forEach(n => n._ids.forEach(id => porId.set(id, n)));

  const usados = new Set();
  const tomar = id => { const n = porId.get(String(id)); if (n && !usados.has(n.id)) { usados.add(n.id); return n; } return null; };

  // 2) Portada y destacadas: las elige el editor; si falta la portada, el mejor caso.
  const mejor = [...noticias].sort((a, b) => b.puntuacion_100 - a.puntuacion_100)[0];
  const portada = tomar(salida && salida.portada_id) || tomar(mejor.id);
  const destacadas = ((salida && salida.destacadas_ids) || []).map(tomar).filter(Boolean).slice(0, 5);

  // 3) Señales débiles: lo muy novedoso que todavía tiene poca evidencia (o es solo un anuncio). Lo poco novedoso
  //    y poco probado es ruido y no se destaca. Regla objetiva aplicada por el código, no por la IA.
  const debil = n => n.novedad !== null && n.novedad >= 4 && ((n.evidencia !== null && n.evidencia <= 3) || n.madurez === 'anuncio');
  const senales = noticias.filter(n => !usados.has(n.id) && debil(n)).sort((a, b) => b.novedad - a.novedad || (a.evidencia || 0) - (b.evidencia || 0)).slice(0, 6);
  senales.forEach(n => usados.add(n.id));

  const resto = noticias.filter(n => !usados.has(n.id)).sort((a, b) => b.puntuacion_100 - a.puntuacion_100);
  const secciones = [];
  for (const s of SECTORES) {
    const lista = resto.filter(n => n.sector === s);
    if (lista.length) secciones.push({ sector: s, noticias: lista });
  }
  secciones.sort((a, b) => b.noticias.length - a.noticias.length);

  // 4) Cifras de la edición, calculadas (no las escribe la IA).
  const cuenta = (campo, valores) => valores.map(v => ({ [campo]: v, casos: noticias.filter(n => (n[campo] || (campo === 'tipo_innovacion' ? 'otros' : null)) === v).length })).filter(x => x.casos > 0);
  const medios = new Set(), paises = new Set();
  noticias.forEach(n => { medios.add(n.medio); (n.otras_fuentes || []).forEach(o => medios.add(o.medio)); if (n.pais) paises.add(n.pais); });
  const media100 = noticias.reduce((a, n) => a + (n.puntuacion_100 !== null ? n.puntuacion_100 : n.puntuacion * 20), 0) / noticias.length;
  const cifras = {
    casos_totales: noticias.length,
    puntuacion_media: Math.round((media100 / 20) * 10) / 10,
    puntuacion_media_100: Math.round(media100),
    medios_distintos: medios.size,
    paises_distintos: paises.size,
    por_sector: cuenta('sector', SECTORES).sort((a, b) => b.casos - a.casos),
    por_tipo: cuenta('tipo_innovacion', TIPOS).sort((a, b) => b.casos - a.casos),
    por_afirmacion: cuenta('tipo_afirmacion', AFIRMACIONES),
    por_madurez: cuenta('madurez', MADUREZ).filter(x => x.madurez !== 'no_indicado'),
  };

  const limpia = n => { delete n._ids; return n; };
  const claves = ((salida && salida.claves) || []).map(c => recorta(c, 220)).filter(Boolean).slice(0, 3);
  return {
    fecha,
    numero_edicion: numero,
    es_ejemplo: !!esEjemplo,
    generada_en: generadaEn,
    claves,
    portada: limpia(portada),
    destacadas: destacadas.map(limpia),
    secciones_por_sector: secciones.map(s => ({ sector: s.sector, noticias: s.noticias.map(limpia) })),
    cifras,
    senales_debiles: senales.map(limpia),
    analisis: recorta((salida && salida.analisis) || '', 1400),
    modelo_editor: modelo,
  };
}

if (typeof module !== 'undefined') module.exports = { ensamblarEdicion, noticiaDe, nota5, agrupar, SECTORES, TIPOS, MADUREZ, AFIRMACIONES };
