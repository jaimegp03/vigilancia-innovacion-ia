// Validador mínimo de JSON Schema (sin dependencias) para usar igual en local y dentro de un nodo Code de n8n.
// Soporta: $ref local (#/$defs/...), type (string o lista), enum, required, properties,
// additionalProperties:false, items, minimum, maximum, maxLength, maxItems, oneOf.
// Uso local: node scripts/validar_esquema.js <extraccion|clasificacion|metadatos> <fichero.json>

function resolver(raiz, ref) {
  return ref.replace(/^#\//, '').split('/').reduce((o, k) => o[k], raiz);
}

function tipoDe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v; // string, number, boolean, object
}

function coincideTipo(v, t) {
  const real = tipoDe(v);
  return real === t || (t === 'number' && real === 'integer');
}

function validar(raiz, esquema, valor, ruta, errores) {
  if (esquema.$ref) return validar(raiz, resolver(raiz, esquema.$ref), valor, ruta, errores);

  if (esquema.oneOf) {
    const aciertos = esquema.oneOf.filter(s => {
      const e = [];
      validar(raiz, s, valor, ruta, e);
      return e.length === 0;
    });
    if (aciertos.length !== 1) errores.push(`${ruta}: no cumple exactamente una de las opciones permitidas`);
    return;
  }

  if (esquema.type) {
    const tipos = Array.isArray(esquema.type) ? esquema.type : [esquema.type];
    if (!tipos.some(t => coincideTipo(valor, t))) {
      errores.push(`${ruta}: tipo ${tipoDe(valor)} no permitido (esperado ${tipos.join('|')})`);
      return;
    }
  }
  if (esquema.enum && !esquema.enum.includes(valor)) errores.push(`${ruta}: valor "${valor}" fuera de la lista permitida`);
  if (typeof valor === 'number') {
    if (esquema.minimum !== undefined && valor < esquema.minimum) errores.push(`${ruta}: ${valor} < ${esquema.minimum}`);
    if (esquema.maximum !== undefined && valor > esquema.maximum) errores.push(`${ruta}: ${valor} > ${esquema.maximum}`);
  }
  if (typeof valor === 'string' && esquema.maxLength !== undefined && valor.length > esquema.maxLength) {
    errores.push(`${ruta}: ${valor.length} caracteres (máx. ${esquema.maxLength})`);
  }
  if (Array.isArray(valor)) {
    if (esquema.maxItems !== undefined && valor.length > esquema.maxItems) errores.push(`${ruta}: ${valor.length} elementos (máx. ${esquema.maxItems})`);
    if (esquema.items) valor.forEach((x, i) => validar(raiz, esquema.items, x, `${ruta}[${i}]`, errores));
  }
  if (tipoDe(valor) === 'object') {
    (esquema.required || []).forEach(k => { if (!(k in valor)) errores.push(`${ruta}.${k}: campo obligatorio ausente`); });
    const props = esquema.properties || {};
    for (const k of Object.keys(valor)) {
      if (props[k]) validar(raiz, props[k], valor[k], `${ruta}.${k}`, errores);
      else if (esquema.additionalProperties === false) errores.push(`${ruta}.${k}: campo no permitido`);
    }
  }
}

// Los modelos de IA se pasan de longitud con frecuencia (p. ej. 205 caracteres donde el esquema admite 200). Eso no es un fallo
// de contenido, así que antes de validar se recortan en el sitio los textos y listas que exceden maxLength / maxItems.
function recortarExcesos(raiz, esquema, valor) {
  if (!esquema || valor === null || typeof valor !== 'object') return valor;
  if (esquema.$ref) return recortarExcesos(raiz, resolver(raiz, esquema.$ref), valor);
  if (esquema.oneOf) {
    const rama = esquema.oneOf.find(s => !s.type || coincideTipo(valor, s.type) || s.$ref);
    return rama ? recortarExcesos(raiz, rama, valor) : valor;
  }
  if (Array.isArray(valor)) {
    if (esquema.maxItems !== undefined && valor.length > esquema.maxItems) valor.length = esquema.maxItems;
    valor.forEach((x, i) => {
      if (esquema.items && typeof x === 'string' && esquema.items.maxLength !== undefined && x.length > esquema.items.maxLength) {
        valor[i] = x.slice(0, esquema.items.maxLength - 1) + '…';
      } else if (esquema.items) recortarExcesos(raiz, esquema.items, x);
    });
    return valor;
  }
  const props = esquema.properties || {};
  for (const k of Object.keys(valor)) {
    const s = props[k];
    if (!s) continue;
    const v = valor[k];
    if (typeof v === 'string' && s.maxLength !== undefined && v.length > s.maxLength) valor[k] = v.slice(0, s.maxLength - 1) + '…';
    else recortarExcesos(raiz, s, v);
  }
  return valor;
}

// Devuelve { ok, errores } validando `dato` contra $defs[nombreDef] del esquema (tras recortar textos demasiado largos).
function validarContraDef(esquema, nombreDef, dato) {
  const errores = [];
  recortarExcesos(esquema, esquema.$defs[nombreDef], dato);
  validar(esquema, esquema.$defs[nombreDef], dato, nombreDef, errores);
  // Regla de coherencia que el esquema no expresa: es_caso=false exige motivo.
  if (nombreDef === 'extraccion' && dato && dato.es_caso === false && !dato.motivo_no_caso) {
    errores.push('extraccion.motivo_no_caso: obligatorio cuando es_caso=false');
  }
  return { ok: errores.length === 0, errores };
}

if (typeof module !== 'undefined') module.exports = { validarContraDef };

if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const [def, fichero] = process.argv.slice(2);
  const esquema = JSON.parse(fs.readFileSync(__dirname + '/../schemas/caso.schema.json', 'utf8'));
  const r = validarContraDef(esquema, def, JSON.parse(fs.readFileSync(fichero, 'utf8')));
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.ok ? 0 : 1);
}
