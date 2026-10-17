// Incluir: titular o resumen del feed contiene alguna palabra clave. Excluir: el TITULAR contiene alguna palabra de exclusión.
const p = $('Cargar configuración').first().json.parametros;
const sensibles = new Set(p.siglas_sensibles_mayusculas || []);
const sinAcentos = s => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LIMITE_I = '(?<![\\p{L}\\p{N}])';
const LIMITE_D = '(?![\\p{L}\\p{N}])';

function construir(term) {
  return sensibles.has(term)
    ? { regex: new RegExp(LIMITE_I + escapar(term) + LIMITE_D, 'u'), literal: true }
    : { regex: new RegExp(LIMITE_I + escapar(sinAcentos(term.toLowerCase())) + LIMITE_D, 'u'), literal: false };
}
const incluir = p.palabras_clave_incluir.map(construir);
const excluir = p.palabras_clave_excluir.map(construir);
const coincide = (lista, texto) => {
  const norm = sinAcentos(texto.toLowerCase());
  return lista.some(k => k.regex.test(k.literal ? texto : norm));
};

return $input.all()
  .filter(i => i.json.url)
  .filter(i => {
    const texto = `${i.json.titular} ${i.json.resumen_feed}`;
    return coincide(incluir, texto) && !coincide(excluir, i.json.titular);
  })
  .map(i => ({ json: i.json }));
