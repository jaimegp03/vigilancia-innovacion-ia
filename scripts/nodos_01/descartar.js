// Marca el artículo para la hoja "descartados". Datos mínimos: no se guarda el texto del artículo.
// Si la causa es un fallo de la API de IA (sin respuesta), el artículo se "omite": no se guarda y se reintentará en la siguiente ejecución.
return $input.all().map(it => {
  const j = it.json;
  const motivo = __MOTIVO__;
  const falloApi = (j.errores_validacion || []).some(e => e.startsWith('Sin respuesta del modelo'));
  return {
    json: {
      id: j.id, url: j.url, url_normalizada: j.url_normalizada, titular: j.titular, fuente: j.fuente,
      acceso: j.acceso, destino: falloApi ? 'omitidos' : 'descartados', etapa: '__ETAPA__', motivo: String(motivo).slice(0, 300),
    },
  };
});
