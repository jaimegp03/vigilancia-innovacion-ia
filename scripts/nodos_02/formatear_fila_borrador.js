// ALMACENAMIENTO · fila de la hoja "borradores_redes" (una por caso). Siempre es un borrador pendiente de revisión humana.
// El orden de las claves es el de lectura recomendado en la hoja.
const cfg = $('Cargar configuración').first().json;
return $input.all().map(it => {
  const j = it.json;
  const b = j.borrador || {};
  const li = b.linkedin || {};
  const x = b.x || {};
  return {
    json: {
      estado: j.estado,
      semana_hasta: cfg.hasta,
      titulo_caso: j.titulo_caso,
      puntuacion_total: j.puntuacion_total,
      fuente: j.fuente,
      explicacion_sencilla: b.explicacion_sencilla || '',
      por_que_importa: b.por_que_importa || '',
      linkedin_texto: li.texto || '',
      x_texto: x.texto || '',
      idea_visual: b.idea_visual || '',
      avisos_revision: (b.avisos_revision || []).join(' | '),
      errores: j.errores.join(' | ').slice(0, 500),
      url: j.url,
      linkedin_hashtags: (li.hashtags || []).join(' '),
      x_hashtags: (x.hashtags || []).join(' '),
      caso_id: j.id,
      modelo: cfg.parametros.modelos.redes,
      fecha_generacion: new Date().toISOString(),
    },
  };
});
