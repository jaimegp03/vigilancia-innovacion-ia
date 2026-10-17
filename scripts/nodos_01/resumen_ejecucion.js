// ALMACENAMIENTO · construye la fila de la hoja "log_ejecuciones" con los contadores de la ejecución.
const cfg = $('Cargar configuración').first().json;
const seguro = f => { try { return f(); } catch (e) { return []; } };
const n = nodo => seguro(() => $(nodo).all()).filter(i => i.json && i.json.url).length;

const leidos = n('Normalizar artículos');
const tras_fecha = n('Filtrar por fecha');
const tras_palabras = n('Filtrar por palabras clave');
const tras_dedup = n('Deduplicar');
const a_procesar = n('Limitar lote diario');
const errores_feed = seguro(() => $('Errores de feed').all()).filter(i => i.json && i.json.feed_url);
const descargados = seguro(() => $('Extraer texto limpio').all()).filter(i => i.json && i.json.url);
const finales = seguro(() => $('Unir resultados').all()).filter(i => i.json && i.json.destino);

const por_etapa = e => finales.filter(i => i.json.destino === 'descartados' && i.json.etapa === e).length;
const guardados = finales.filter(i => i.json.destino === 'casos').length;
const omitidos = finales.filter(i => i.json.destino === 'omitidos').length;
const fin = new Date();

const fila = {
    run_id: cfg.run_id,
    workflow: '01_ingesta_diaria',
    fecha_inicio: cfg.inicio_iso,
    fecha_fin: fin.toISOString(),
    duracion_s: Math.round((fin - new Date(cfg.inicio_iso)) / 1000),
    ventana_dias: cfg.ventana_dias,
    fuentes_activas: cfg.fuentes.length,
    fuentes_con_error: errores_feed.length,
    consultas_busqueda: 0,
    filtrados_dominio_conocido: 0,
    articulos_leidos: leidos,
    filtrados_fecha: leidos - tras_fecha,
    filtrados_palabras_clave: tras_fecha - tras_palabras,
    duplicados: tras_palabras - tras_dedup,
    recortados_por_tope: tras_dedup - a_procesar,
    descargados_completos: descargados.filter(i => i.json.acceso === 'completo').length,
    descargados_parciales: descargados.filter(i => i.json.acceso === 'parcial').length,
    extraidos_ok: guardados + por_etapa('es_caso') + por_etapa('clasificacion'),
    no_son_caso: por_etapa('es_caso'),
    extraccion_invalida: por_etapa('extraccion'),
    clasificacion_invalida: por_etapa('clasificacion'),
    casos_guardados: guardados,
    errores: [...(errores_feed.slice(0, 10).map(e => `${e.json.fuente}: ${e.json.error}`)), ...(omitidos ? [`${omitidos} artículos omitidos por fallo de la API de IA (se reintentarán en la siguiente ejecución)`] : [])].join(' | '),
};
// Orden de columnas pensado para leer la hoja: primero lo importante, al final lo técnico.
const ORDEN = ["fecha_inicio","workflow","casos_guardados","articulos_leidos","filtrados_fecha","filtrados_palabras_clave","duplicados","recortados_por_tope","descargados_completos","descargados_parciales","extraidos_ok","no_son_caso","extraccion_invalida","clasificacion_invalida","fuentes_activas","fuentes_con_error","consultas_busqueda","filtrados_dominio_conocido","ventana_dias","duracion_s","errores","fecha_fin","run_id"];
return [{ json: Object.fromEntries(ORDEN.map(k => [k, fila[k]])) }];
