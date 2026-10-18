// Ensambla una edición completa (schemas/edicion.schema.json → $defs.edicion) a partir de:
//   · los casos del día (filas planas de la hoja "casos") y
//   · la salida del editor jefe (IA): selección de portada/destacadas/señales débiles, textos y análisis.
// La IA nunca escribe URLs, medios, fechas ni puntuaciones: todo eso se copia de los casos por su id.
// Este archivo se usa tal cual en el build/ejemplos (Node) y se incrusta en el nodo Code del workflow 04.
const SECTORES = ['banca_seguros', 'automocion', 'turismo_hosteleria', 'construccion_inmobiliario', 'gran_consumo_alimentacion', 'retail_comercio', 'salud_farma', 'energia_utilities', 'industria_manufactura', 'logistica_transporte', 'telecomunicaciones', 'educacion', 'sector_publico', 'medios_marketing', 'agricultura', 'tecnologia_software', 'otros'];
const TIPOS = ['producto_servicio', 'proceso_operaciones', 'atencion_cliente', 'marketing_ventas', 'analitica_prediccion', 'generacion_contenido', 'investigacion_desarrollo', 'seguridad_riesgo', 'otros'];
const MADUREZ = ['anuncio', 'piloto', 'produccion', 'escalado', 'no_indicado'];
const AFIRMACIONES = ['hecho_confirmado', 'afirmacion_empresa', 'opinion'];

const recorta = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const nota5 = total => Math.max(1, Math.min(5, Math.round((Number(total) || 0) / 20)));

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
    confianza: ['alta', 'media', 'baja'].includes(caso.confianza) ? caso.confianza : null,
    medio: recorta(caso.fuente || 'Fuente no indicada', 120),
    fecha_publicacion: String(caso.fecha_publicacion || '').slice(0, 40),
    url: caso.url ? String(caso.url).slice(0, 600) : null,
  };
}

function ensamblarEdicion({ casos, salida, fecha, numero, esEjemplo = false, modelo = null }) {
  const porId = new Map(casos.map(c => [String(c.id), c]));
  const textos = new Map(((salida && salida.noticias) || []).map(n => [String(n.caso_id), n]));
  const noticias = casos.map(c => noticiaDe(c, textos.get(String(c.id))));
  const noticiaPorId = new Map(noticias.map(n => [n.id, n]));
  if (!noticias.length) throw new Error('No hay casos para ensamblar la edición');

  const usados = new Set();
  const tomar = id => { const n = noticiaPorId.get(String(id)); if (n && !usados.has(n.id)) { usados.add(n.id); return n; } return null; };

  // Portada: la elegida por el editor; si no existe, el caso mejor puntuado.
  const mejor = [...noticias].sort((a, b) => b.puntuacion_100 - a.puntuacion_100)[0];
  const portada = tomar(salida && salida.portada_id) || tomar(mejor.id);
  const destacadas = ((salida && salida.destacadas_ids) || []).map(tomar).filter(Boolean).slice(0, 5);
  // Señales débiles: las elegidas por el editor; si no hay ninguna, los de nota 1-2 o confianza baja.
  let senales = ((salida && salida.senales_debiles_ids) || []).map(tomar).filter(Boolean).slice(0, 8);
  if (!senales.length) {
    senales = noticias.filter(n => !usados.has(n.id) && (n.puntuacion <= 2 || n.confianza === 'baja')).slice(0, 8);
    senales.forEach(n => usados.add(n.id));
  }
  const resto = noticias.filter(n => !usados.has(n.id)).sort((a, b) => b.puntuacion_100 - a.puntuacion_100);
  const secciones = [];
  for (const s of SECTORES) {
    const lista = resto.filter(n => n.sector === s);
    if (lista.length) secciones.push({ sector: s, noticias: lista });
  }
  secciones.sort((a, b) => b.noticias.length - a.noticias.length);

  const cuenta = (campo, valores) => valores.map(v => ({ [campo]: v, casos: noticias.filter(n => (n[campo] || (campo === 'tipo_innovacion' ? 'otros' : null)) === v).length })).filter(x => x.casos > 0);
  const cifras = {
    casos_totales: noticias.length,
    puntuacion_media: Math.round((noticias.reduce((a, n) => a + (n.puntuacion_100 || n.puntuacion * 20), 0) / noticias.length / 20) * 10) / 10,
    por_sector: cuenta('sector', SECTORES).sort((a, b) => b.casos - a.casos),
    por_tipo: cuenta('tipo_innovacion', TIPOS).sort((a, b) => b.casos - a.casos),
    por_afirmacion: cuenta('tipo_afirmacion', AFIRMACIONES),
  };

  return {
    fecha,
    numero_edicion: numero,
    es_ejemplo: !!esEjemplo,
    portada,
    destacadas,
    secciones_por_sector: secciones,
    cifras,
    senales_debiles: senales,
    analisis: recorta((salida && salida.analisis) || '', 1400),
    modelo_editor: modelo,
  };
}

if (typeof module !== 'undefined') module.exports = { ensamblarEdicion, noticiaDe, nota5, SECTORES, TIPOS, MADUREZ, AFIRMACIONES };
