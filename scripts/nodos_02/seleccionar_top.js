// Los casos mejor puntuados de la semana (ya vienen ordenados por puntuación y evidencia).
const cfg = $('Cargar configuración').first().json;
const semana = $('Casos de la semana').first().json;
return semana.casos_todos.slice(0, cfg.parametros.n_posts_semanales).map((c, i) => {
  const { url, fuente, region_fuente, ...paraPrompt } = c;
  return { json: { id: c.id, posicion: i + 1, titulo_caso: c.titulo_caso, fuente, url, puntuacion_total: c.puntuacion_total, caso_prompt: paraPrompt } };
});
