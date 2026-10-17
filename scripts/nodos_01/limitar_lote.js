// Tope diario de artículos para controlar coste. Los más recientes van primero; el resto se verá en las siguientes ejecuciones.
const max = $('Cargar configuración').first().json.parametros.max_articulos_por_ejecucion;
const items = $input.all().filter(i => i.json.url);
if (items.length === 0) return [{ json: { vacio: true } }]; // marca para que el flujo pase directo al registro
return items.slice(0, max).map(i => ({ json: i.json }));
