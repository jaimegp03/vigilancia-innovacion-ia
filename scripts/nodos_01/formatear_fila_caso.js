// ALMACENAMIENTO · fila plana de la hoja "casos" (mismas columnas si cambias a Postgres).
// El orden de las claves es el de lectura recomendado en la hoja: primero lo importante, al final lo técnico.
return $input.all().map(it => {
  const { metadatos: m, extraccion: e, clasificacion: c } = it.json.caso;
  return {
    json: {
      puntuacion_total: c.puntuacion_total,
      titulo_caso: e.titulo_caso,
      empresa: e.empresa,
      sector: e.sector,
      pais: e.pais,
      categoria: c.categoria,
      resumen: e.resumen,
      resultado: e.resultado,
      tecnologia_ia: (e.tecnologia_ia || []).join('; '),
      tipo_innovacion: e.tipo_innovacion,
      madurez: e.madurez,
      novedad: c.novedad,
      impacto: c.impacto,
      replicabilidad: c.replicabilidad,
      evidencia: c.evidencia,
      relevancia_sector: c.relevancia_sector,
      confianza: e.confianza,
      etiquetas: (c.etiquetas || []).join('; '),
      justificacion: c.justificacion,
      fuente: m.fuente,
      titular: m.titular,
      url: m.url,
      fecha_publicacion: m.fecha_publicacion,
      fecha_ingesta: m.fecha_ingesta,
      idioma: m.idioma,
      acceso: m.acceso,
      origen: m.origen,
      metricas: JSON.stringify(e.metricas || []),
      consulta: m.consulta || '',
      tipo_fuente: m.tipo_fuente,
      region_fuente: m.region_fuente,
      id: m.id,
      url_normalizada: m.url_normalizada,
      modelo_extraccion: m.modelo_extraccion,
      modelo_clasificacion: m.modelo_clasificacion,
    },
  };
});
