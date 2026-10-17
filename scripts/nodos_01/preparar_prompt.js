// Monta el mensaje de sistema y el de usuario a partir del archivo prompts/__PROMPT__.md
const cfg = $('Cargar configuración').first().json;

function partir(md) {
  const limpio = md.replace(/<!--[\s\S]*?-->/g, '');
  const iSys = limpio.indexOf('## SYSTEM');
  const iUsr = limpio.indexOf('## USER');
  if (iSys < 0 || iUsr < 0) throw new Error('El prompt debe tener las secciones "## SYSTEM" y "## USER"');
  return { sistema: limpio.slice(iSys + 9, iUsr).trim(), usuario: limpio.slice(iUsr + 7).trim() };
}
// Una sola pasada: lo que se inserta no se vuelve a interpretar como marcador.
const rellenar = (t, v) => t.replace(/\{\{(\w+)\}\}/g, (m, k) => (v[k] === undefined || v[k] === null ? '' : String(v[k])));

const { sistema, usuario } = partir(cfg.prompts.__PROMPT__);
return $input.all().map(it => {
  const j = it.json;
  const vars = __VARS__;
  return { json: { ...j, prompt_system: sistema, prompt_user: rellenar(usuario, vars) } };
});
