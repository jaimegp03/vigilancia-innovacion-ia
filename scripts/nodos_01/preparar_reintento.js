// Segundo (y último) intento: se reenvía el mismo prompt indicando qué falló en la respuesta anterior.
return $input.all().map(it => {
  const j = it.json;
  const fallos = (j.errores_validacion || []).slice(0, 8).map(e => '- ' + e).join('\n');
  return {
    json: {
      ...j,
      prompt_user: j.prompt_user + '\n\nTu respuesta anterior no cumplía el formato:\n' + fallos +
        '\n\nDevuelve de nuevo SOLO el objeto JSON corregido, con exactamente los campos y valores permitidos.',
    },
  };
});
