// ALMACENAMIENTO · fila de la hoja "log_ejecuciones" (mismas columnas que el workflow 01; aquí "artículos leídos" = candidatos devueltos por la búsqueda).
const cfg = $('Cargar configuración').first().json;
const seguro = f => { try { return f(); } catch (e) { return []; } };
const n = nodo => seguro(() => $(nodo).all()).filter(i => i.json && i.json.url).length;

const candidatos = n('Extraer candidatos');
const tras_dominios = n('Filtrar dominios conocidos');
const tras_dedup = n('Deduplicar candidatos');
const a_procesar = n('Limitar lote diario');
const consultas_fallidas = seguro(() => $('Extraer candidatos').all()).filter(i => i.json && i.json.error);
const descargados = seguro(() => $('Extraer texto limpio').all()).filter(i => i.json && i.json.url);
const finales = seguro(() => $('Unir resultados').all()).filter(i => i.json && i.json.destino);

const por_etapa = e => finales.filter(i => i.json.destino === 'descartados' && i.json.etapa === e).length;
const guardados = finales.filter(i => i.json.destino === 'casos').length;
const omitidos = finales.filter(i => i.json.destino === 'omitidos').length;
const fin = new Date();

const fila = {
    run_id: cfg.run_id,
    workflow: '03_descubrimiento',
    fecha_inicio: cfg.inicio_iso,
    fecha_fin: fin.toISOString(),
    duracion_s: Math.round((fin - new Date(cfg.inicio_iso)) / 1000),
    ventana_dias: cfg.ventana_dias,
    fuentes_activas: 0,
    fuentes_con_error: consultas_fallidas.length,
    consultas_busqueda: cfg.consultas.length,
    filtrados_dominio_conocido: candidatos - tras_dominios,
    articulos_leidos: candidatos,
    filtrados_fecha: 0,
    filtrados_palabras_clave: 0,
    duplicados: tras_dominios - tras_dedup,
    recortados_por_tope: tras_dedup - a_procesar,
    descargados_completos: descargados.filter(i => i.json.acceso === 'completo').length,
    descargados_parciales: descargados.filter(i => i.json.acceso === 'parcial').length,
    extraidos_ok: guardados + por_etapa('es_caso') + por_etapa('clasificacion'),
    no_son_caso: por_etapa('es_caso'),
    extraccion_invalida: por_etapa('extraccion'),
    clasificacion_invalida: por_etapa('clasificacion'),
    casos_guardados: guardados,
    errores: [...(consultas_fallidas.slice(0, 10).map(e => `${e.json.consulta}: ${e.json.error}`)), ...(omitidos ? [`${omitidos} artículos omitidos por fallo de la API de IA (se reintentarán en la siguiente ejecución)`] : [])].join(' | '),
};
// Orden de columnas pensado para leer la hoja: primero lo importante, al final lo técnico.
const ORDEN = ["fecha_inicio","workflow","casos_guardados","articulos_leidos","filtrados_fecha","filtrados_palabras_clave","duplicados","recortados_por_tope","descargados_completos","descargados_parciales","extraidos_ok","no_son_caso","extraccion_invalida","clasificacion_invalida","fuentes_activas","fuentes_con_error","consultas_busqueda","filtrados_dominio_conocido","ventana_dias","duracion_s","errores","fecha_fin","run_id"];
return [{ json: Object.fromEntries(ORDEN.map(k => [k, fila[k]])) }];
