// Lectura de la respuesta de la IA, igual para Gemini y Claude (y para el nodo nativo o la llamada HTTP).
function textoIA(j) {
  if (!j) return '';
  // Claude (nodo Anthropic): content = [{ type: 'text', text }]
  if (Array.isArray(j.content)) return j.content.filter(c => c.type === 'text').map(c => c.text).join('');
  // Gemini (llamada HTTP o nodo con "Simplify" desactivado): candidates[0].content.parts[].text
  if (Array.isArray(j.candidates) && j.candidates[0]) {
    const partes = (j.candidates[0].content && j.candidates[0].content.parts) || [];
    return partes.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('');
  }
  // Gemini (nodo con "Simplify" activado): content = { parts: [...] }
  if (j.content && Array.isArray(j.content.parts)) return j.content.parts.filter(p => typeof p.text === 'string' && !p.thought).map(p => p.text).join('');
  if (typeof j.mergedResponse === 'string') return j.mergedResponse;
  return '';
}

// Por qué terminó la respuesta (para avisar de un corte por límite de tokens).
function finIA(j) {
  if (!j) return '';
  if (j.stop_reason) return String(j.stop_reason);
  if (Array.isArray(j.candidates) && j.candidates[0] && j.candidates[0].finishReason) return String(j.candidates[0].finishReason);
  return j.finishReason ? String(j.finishReason) : '';
}

// Mensaje del error de la API cuando no hay respuesta (cuota agotada, sobrecarga, clave inválida…).
function errorIA(j) {
  const e = j && j.error;
  if (!e) return '';
  const m = typeof e === 'string' ? e : (e.message || JSON.stringify(e));
  const d = e && e.description ? ' — ' + e.description : ''; // p. ej. "API key not valid"
  return (String(m) + d).slice(0, 260);
}

// Texto de la respuesta o, si no hay, el motivo. Los errores de API empiezan siempre por "Sin respuesta del modelo".
function leerIA(j, errores) {
  const t = textoIA(j);
  if (!t) errores.push('Sin respuesta del modelo' + (errorIA(j) ? ': ' + errorIA(j) : ''));
  else if (/MAX_TOKENS|max_tokens/.test(finIA(j))) errores.push('Respuesta cortada por el límite de tokens (sube max_tokens en parametros.json)');
  return t;
}
