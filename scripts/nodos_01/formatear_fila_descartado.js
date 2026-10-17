// ALMACENAMIENTO · fila de la hoja "descartados". Los artículos "omitidos" (fallo de la API de IA) no se guardan: se reintentarán.
return $input.all()
  .filter(it => it.json.destino === 'descartados')
  .map(it => ({
    json: {
      fecha: new Date().toISOString(),
      fuente: it.json.fuente,
      titular: it.json.titular,
      etapa: it.json.etapa,
      motivo: it.json.motivo,
      url: it.json.url,
      acceso: it.json.acceso,
      id: it.json.id,
      url_normalizada: it.json.url_normalizada,
    },
  }));
