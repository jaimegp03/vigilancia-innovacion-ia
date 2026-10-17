// Un ítem por fuente activa; el nodo RSS Read los procesa de uno en uno (concurrencia 1).
const cfg = $('Cargar configuración').first().json;
return cfg.fuentes.map((f, idx) => ({ json: { ...f, idx } }));
