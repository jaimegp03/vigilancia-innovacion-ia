// Ensambla la edición completa a partir de la salida validada del editor y de los casos del día,
// la valida contra schemas/edicion.schema.json → $defs/edicion y la deja lista para guardar como archivo.
// __VALIDADOR__
// __LIB_EDICION__
const cfg = $('Cargar configuración').first().json;
const dia = $('Casos del día').first().json;
const salida = $input.first().json.salida;

const edicion = ensamblarEdicion({
  casos: dia.casos_todos, salida, fecha: cfg.fecha, numero: cfg.numero_edicion, esEjemplo: false,
  modelo: cfg.parametros.modelos.editor,
});
const r = validarContraDef(cfg.schema_edicion, 'edicion', edicion);
const errores = [...r.errores];
const todas = [edicion.portada, ...edicion.destacadas, ...edicion.secciones_por_sector.flatMap(s => s.noticias), ...edicion.senales_debiles];
todas.forEach(n => { if (!/^https?:\/\//i.test(n.url || '')) errores.push(`noticia ${n.id}: sin enlace http(s) a la fuente`); });
if (errores.length) throw new Error('La edición ensamblada no es válida: ' + errores.slice(0, 6).join(' | '));

const nombre = `${cfg.fecha}.json`;
const binario = await this.helpers.prepareBinaryData(Buffer.from(JSON.stringify(edicion, null, 2) + '\n', 'utf8'), nombre, 'application/json');
return [{
  json: {
    fecha: cfg.fecha, nombre_archivo: nombre, numero_edicion: edicion.numero_edicion, n_noticias: edicion.cifras.casos_totales,
    puntuacion_media: edicion.cifras.puntuacion_media, n_senales: edicion.senales_debiles.length, portada: edicion.portada.titular,
    ajustes: $input.first().json.ajustes || [],
  },
  binary: { data: binario },
}];
