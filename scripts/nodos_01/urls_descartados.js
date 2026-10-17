// Une las URLs de "casos" y de "descartados": un artículo descartado no se vuelve a pagar al día siguiente.
const casos = $('URLs conocidas (casos)').first().json.urls;
const descartadas = $input.all().map(i => i.json.url_normalizada).filter(Boolean);
return [{
  json: {
    n_casos: casos.length,
    n_descartados: descartadas.length,
    urls: [...new Set([...casos, ...descartadas])],
  },
}];
