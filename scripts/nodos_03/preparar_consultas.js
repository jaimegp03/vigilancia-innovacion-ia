// Un ítem por consulta de búsqueda; el nodo de IA las procesa de una en una (concurrencia 1, para no disparar el coste).
const cfg = $('Cargar configuración').first().json;
return cfg.consultas.map(c => ({ json: c }));
