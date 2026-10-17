// Una sola salida con las URLs ya guardadas como casos (la hoja puede estar vacía).
const urls = $input.all().map(i => i.json.url_normalizada).filter(Boolean);
return [{ json: { urls } }];
