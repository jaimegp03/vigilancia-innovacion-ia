// Salida de error del nodo RSS Read: se registra y el flujo sigue con las demás fuentes.
return $input.all().map((it, k) => {
  const f = $('Preparar fuentes').itemMatching(k).json;
  const err = it.json.error;
  const msg = typeof err === 'string' ? err : (err && (err.message || JSON.stringify(err))) || 'error desconocido';
  return { json: { fuente: f.nombre, feed_url: f.feed_url, error: String(msg).slice(0, 200) } };
});
