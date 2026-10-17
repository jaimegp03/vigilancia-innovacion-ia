// Prepara (1) los valores de cada hoja con las columnas en el orden de lectura recomendado y
// (2) las peticiones de formato de la API de Google Sheets (cabeceras, colores, anchos, filtros, formato condicional).
// Es idempotente: se puede ejecutar varias veces; limpia el formato anterior antes de aplicar el nuevo.
// Los nombres de columna NO cambian (n8n asigna los datos por nombre), solo su posición y su aspecto.
const meta = $('Leer metadatos').first().json;
const valores = $('Leer valores').first().json;
const FILAS = 2000; // el formato cubre hasta esta fila; las filas nuevas heredan estilo, alternancia de color y reglas

const hex = h => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
const letra = i => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const AZUL = '#1F3A5F';

// Diseño por hoja: orden de columnas, columnas ocultas (técnicas), anchos en píxeles, columnas con texto multilínea y centradas.
const DISENO = {
  casos: {
    color: '#4285F4', congelarColumnas: 2, altoFila: 72,
    orden: ['puntuacion_total', 'titulo_caso', 'empresa', 'sector', 'pais', 'categoria', 'resumen', 'resultado', 'tecnologia_ia', 'tipo_innovacion', 'madurez', 'novedad', 'impacto', 'replicabilidad', 'evidencia', 'relevancia_sector', 'confianza', 'etiquetas', 'justificacion', 'fuente', 'titular', 'url', 'fecha_publicacion', 'fecha_ingesta', 'idioma', 'acceso', 'origen', 'metricas', 'consulta', 'tipo_fuente', 'region_fuente', 'id', 'url_normalizada', 'modelo_extraccion', 'modelo_clasificacion'],
    ocultas: ['metricas', 'consulta', 'tipo_fuente', 'region_fuente', 'id', 'url_normalizada', 'modelo_extraccion', 'modelo_clasificacion'],
    anchos: { puntuacion_total: 82, titulo_caso: 280, empresa: 150, sector: 150, pais: 100, categoria: 175, resumen: 420, resultado: 260, tecnologia_ia: 170, tipo_innovacion: 160, madurez: 95, novedad: 80, impacto: 80, replicabilidad: 95, evidencia: 80, relevancia_sector: 95, confianza: 85, etiquetas: 190, justificacion: 330, fuente: 150, titular: 280, url: 210, fecha_publicacion: 160, fecha_ingesta: 160, idioma: 65, acceso: 85, origen: 90 },
    multilinea: ['titulo_caso', 'resumen', 'resultado', 'tecnologia_ia', 'etiquetas', 'justificacion', 'titular'],
    centradas: ['puntuacion_total', 'novedad', 'impacto', 'replicabilidad', 'evidencia', 'relevancia_sector', 'confianza', 'idioma', 'acceso', 'madurez', 'origen'],
  },
  tendencias: {
    color: '#F29900', congelarColumnas: 0, altoFila: 170,
    orden: ['semana_desde', 'semana_hasta', 'estado', 'n_casos', 'resumen_ejecutivo', 'tendencias_texto', 'cautelas', 'limitaciones', 'avisos', 'tendencias', 'casos_destacados', 'sectores_mas_activos', 'tecnologias_mas_citadas', 'modelo', 'fecha_generacion'],
    ocultas: ['tendencias', 'casos_destacados', 'sectores_mas_activos', 'tecnologias_mas_citadas'],
    anchos: { semana_desde: 100, semana_hasta: 100, estado: 80, n_casos: 75, resumen_ejecutivo: 430, tendencias_texto: 540, cautelas: 280, limitaciones: 210, avisos: 230, modelo: 140, fecha_generacion: 160 },
    multilinea: ['resumen_ejecutivo', 'tendencias_texto', 'cautelas', 'limitaciones', 'avisos'],
    centradas: ['estado', 'n_casos', 'semana_desde', 'semana_hasta'],
  },
  borradores_redes: {
    color: '#0F9D58', congelarColumnas: 0, altoFila: 180,
    orden: ['estado', 'semana_hasta', 'titulo_caso', 'puntuacion_total', 'fuente', 'explicacion_sencilla', 'por_que_importa', 'linkedin_texto', 'x_texto', 'idea_visual', 'avisos_revision', 'errores', 'url', 'linkedin_hashtags', 'x_hashtags', 'caso_id', 'modelo', 'fecha_generacion'],
    ocultas: ['caso_id'],
    anchos: { estado: 140, semana_hasta: 100, titulo_caso: 260, puntuacion_total: 82, fuente: 140, explicacion_sencilla: 380, por_que_importa: 260, linkedin_texto: 540, x_texto: 320, idea_visual: 260, avisos_revision: 250, errores: 210, url: 210, linkedin_hashtags: 150, x_hashtags: 130, modelo: 140, fecha_generacion: 160 },
    multilinea: ['titulo_caso', 'explicacion_sencilla', 'por_que_importa', 'linkedin_texto', 'x_texto', 'idea_visual', 'avisos_revision', 'errores'],
    centradas: ['estado', 'puntuacion_total', 'semana_hasta'],
  },
  log_ejecuciones: {
    color: '#7C8A99', congelarColumnas: 2, altoFila: 30,
    orden: ['fecha_inicio', 'workflow', 'casos_guardados', 'articulos_leidos', 'filtrados_fecha', 'filtrados_palabras_clave', 'duplicados', 'recortados_por_tope', 'descargados_completos', 'descargados_parciales', 'extraidos_ok', 'no_son_caso', 'extraccion_invalida', 'clasificacion_invalida', 'fuentes_activas', 'fuentes_con_error', 'consultas_busqueda', 'filtrados_dominio_conocido', 'ventana_dias', 'duracion_s', 'errores', 'fecha_fin', 'run_id'],
    ocultas: ['run_id'],
    anchos: { fecha_inicio: 165, workflow: 160, errores: 460, fecha_fin: 165 },
    anchoPorDefecto: 105,
    multilinea: ['errores'],
    centradas: ['casos_guardados', 'articulos_leidos', 'filtrados_fecha', 'filtrados_palabras_clave', 'duplicados', 'recortados_por_tope', 'descargados_completos', 'descargados_parciales', 'extraidos_ok', 'no_son_caso', 'extraccion_invalida', 'clasificacion_invalida', 'fuentes_activas', 'fuentes_con_error', 'consultas_busqueda', 'filtrados_dominio_conocido', 'ventana_dias', 'duracion_s'],
  },
  descartados: {
    color: '#DB4437', congelarColumnas: 0, altoFila: 52,
    orden: ['fecha', 'fuente', 'titular', 'etapa', 'motivo', 'url', 'acceso', 'id', 'url_normalizada'],
    ocultas: ['id', 'url_normalizada'],
    anchos: { fecha: 160, fuente: 150, titular: 340, etapa: 115, motivo: 540, url: 230, acceso: 85 },
    multilinea: ['titular', 'motivo'],
    centradas: ['etapa', 'acceso'],
  },
};

const texto = (v, col) => (v === undefined || v === null ? '' : v);
const datos = [];
const peticiones = [];
const resumen = {};

for (const hoja of meta.sheets) {
  const nombre = hoja.properties.title;
  const d = DISENO[nombre];
  if (!d) continue;
  const sid = hoja.properties.sheetId;
  const rango = (valores.valueRanges || []).find(r => r.range.replace(/^'|'(?=!)/g, '').startsWith(nombre + '!'));
  const filas = (rango && rango.values) || [];
  const cabeceraActual = (filas[0] || []).map(String);
  const nuevaCab = [...d.orden, ...cabeceraActual.filter(c => c && !d.orden.includes(c))]; // las columnas desconocidas se conservan al final
  const indiceViejo = Object.fromEntries(cabeceraActual.map((c, i) => [c, i]));
  const matriz = [nuevaCab];
  for (const f of filas.slice(1)) matriz.push(nuevaCab.map(c => (c in indiceViejo ? texto(f[indiceViejo[c]], c) : '')));
  datos.push({ range: `${nombre}!A1`, majorDimension: 'ROWS', values: matriz });
  resumen[nombre] = { columnas: nuevaCab.length, filas_de_datos: filas.length ? filas.length - 1 : 0 };

  const n = nuevaCab.length;
  const col = c => nuevaCab.indexOf(c);
  const rg = (c0, c1, f0 = 1, f1 = FILAS) => ({ sheetId: sid, startRowIndex: f0, endRowIndex: f1, startColumnIndex: c0, endColumnIndex: c1 });
  const columnaEntera = c => rg(c, c + 1);

  // 0) limpiar formato anterior (bandas y reglas condicionales)
  for (const b of hoja.bandedRanges || []) peticiones.push({ deleteBanding: { bandedRangeId: b.bandedRangeId } });
  for (let i = (hoja.conditionalFormats || []).length - 1; i >= 0; i--) peticiones.push({ deleteConditionalFormatRule: { sheetId: sid, index: i } });

  // 1) propiedades de la hoja
  peticiones.push({ updateSheetProperties: { properties: { sheetId: sid, tabColorStyle: { rgbColor: hex(d.color) }, gridProperties: { rowCount: Math.max(FILAS, hoja.properties.gridProperties.rowCount), columnCount: Math.max(n, hoja.properties.gridProperties.columnCount), frozenRowCount: 1, frozenColumnCount: d.congelarColumnas } }, fields: 'tabColorStyle,gridProperties(rowCount,columnCount,frozenRowCount,frozenColumnCount)' } });

  // 2) formato base del cuerpo
  peticiones.push({ repeatCell: { range: rg(0, n), cell: { userEnteredFormat: { textFormat: { fontFamily: 'Roboto', fontSize: 10, foregroundColor: hex('#202124'), bold: false }, verticalAlignment: 'TOP', horizontalAlignment: 'LEFT', wrapStrategy: 'CLIP' } }, fields: 'userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment,wrapStrategy)' } });
  for (const c of d.multilinea) if (col(c) >= 0) peticiones.push({ repeatCell: { range: columnaEntera(col(c)), cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat.wrapStrategy' } });
  for (const c of ['semana_desde', 'semana_hasta']) if (col(c) >= 0) peticiones.push({ repeatCell: { range: columnaEntera(col(c)), cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'yyyy-mm-dd' } } }, fields: 'userEnteredFormat.numberFormat' } });
  for (const c of d.centradas) if (col(c) >= 0) peticiones.push({ repeatCell: { range: columnaEntera(col(c)), cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } }, fields: 'userEnteredFormat.horizontalAlignment' } });
  if (col('puntuacion_total') >= 0) peticiones.push({ repeatCell: { range: columnaEntera(col('puntuacion_total')), cell: { userEnteredFormat: { textFormat: { fontFamily: 'Roboto', fontSize: 12, bold: true, foregroundColor: hex('#202124') }, verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat(textFormat,verticalAlignment)' } });
  for (const c of ['titulo_caso', 'titular']) if (col(c) >= 0 && nombre !== 'descartados') peticiones.push({ repeatCell: { range: columnaEntera(col(c)), cell: { userEnteredFormat: { textFormat: { fontFamily: 'Roboto', fontSize: 10, bold: true, foregroundColor: hex('#202124') } } }, fields: 'userEnteredFormat.textFormat' } });

  // 3) cabecera
  peticiones.push({ repeatCell: { range: rg(0, n, 0, 1), cell: { userEnteredFormat: { backgroundColor: hex(AZUL), textFormat: { fontFamily: 'Roboto', fontSize: 10, bold: true, foregroundColor: hex('#FFFFFF') }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)' } });

  // 4) alturas y anchos
  peticiones.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'ROWS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 48 }, fields: 'pixelSize' } });
  // Altura de las filas: ajuste automático al contenido (así las filas nuevas también se ven bien y las vacías no ocupan sitio).
  peticiones.push({ autoResizeDimensions: { dimensions: { sheetId: sid, dimension: 'ROWS', startIndex: 1, endIndex: FILAS } } });
  nuevaCab.forEach((c, i) => {
    peticiones.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: d.anchos[c] || d.anchoPorDefecto || 130, hiddenByUser: d.ocultas.includes(c) }, fields: 'pixelSize,hiddenByUser' } });
  });

  // 5) filas alternas y filtro
  peticiones.push({ addBanding: { bandedRange: { range: rg(0, n, 0, FILAS), rowProperties: { headerColorStyle: { rgbColor: hex(AZUL) }, firstBandColorStyle: { rgbColor: hex('#FFFFFF') }, secondBandColorStyle: { rgbColor: hex('#F1F5FB') } } } } });
  peticiones.push({ setBasicFilter: { filter: { range: { sheetId: sid, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: n } } } });
  peticiones.push({ updateBorders: { range: rg(0, n), innerHorizontal: { style: 'SOLID', width: 1, colorStyle: { rgbColor: hex('#DDE3EC') } }, bottom: { style: 'SOLID', width: 1, colorStyle: { rgbColor: hex('#DDE3EC') } } } });

  // 6) formato condicional (se añade con índice 0, de modo que la última regla añadida queda arriba)
  const regla = (c, def) => { if (col(c) >= 0) peticiones.push({ addConditionalFormatRule: { index: 0, rule: { ranges: [columnaEntera(col(c))], ...def } } }); };
  const degradado = (c, mn, md, mx, cMin, cMid, cMax) => regla(c, { gradientRule: { minpoint: { colorStyle: { rgbColor: hex(cMin) }, type: 'NUMBER', value: String(mn) }, ...(md === null ? {} : { midpoint: { colorStyle: { rgbColor: hex(cMid) }, type: 'NUMBER', value: String(md) } }), maxpoint: { colorStyle: { rgbColor: hex(cMax) }, type: 'NUMBER', value: String(mx) } } });
  const igual = (c, valor, fondo, tinta) => regla(c, { booleanRule: { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: valor }] }, format: { backgroundColorStyle: { rgbColor: hex(fondo) }, textFormat: { foregroundColorStyle: { rgbColor: hex(tinta) }, bold: true } } } });
  const formula = (c, f, fondo, tinta) => regla(c, { booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: f }] }, format: { backgroundColorStyle: { rgbColor: hex(fondo) }, textFormat: { foregroundColorStyle: { rgbColor: hex(tinta) }, bold: true } } } });

  if (nombre === 'casos') {
    degradado('puntuacion_total', 40, 65, 90, '#F4C7C3', '#FFF2CC', '#B7E1CD');
    for (const c of ['novedad', 'impacto', 'replicabilidad', 'evidencia', 'relevancia_sector']) degradado(c, 1, null, 5, '#FFFFFF', null, '#A8D5BA');
    igual('confianza', 'alta', '#D9EAD3', '#274E13'); igual('confianza', 'media', '#FFF2CC', '#7F6000'); igual('confianza', 'baja', '#F4CCCC', '#990000');
    igual('acceso', 'parcial', '#FCE5CD', '#B45F06');
  }
  if (nombre === 'tendencias') { igual('estado', 'ok', '#D9EAD3', '#274E13'); igual('estado', 'invalida', '#F4CCCC', '#990000'); }
  if (nombre === 'borradores_redes') {
    igual('estado', 'pendiente_revision', '#FFF2CC', '#7F6000'); igual('estado', 'revisar_formato', '#F4CCCC', '#990000'); igual('estado', 'publicado', '#D9EAD3', '#274E13');
    degradado('puntuacion_total', 40, 65, 90, '#F4C7C3', '#FFF2CC', '#B7E1CD');
  }
  if (nombre === 'descartados') { igual('etapa', 'es_caso', '#EEEEEE', '#444444'); igual('etapa', 'extraccion', '#F4CCCC', '#990000'); igual('etapa', 'clasificacion', '#FCE5CD', '#B45F06'); }
  if (nombre === 'log_ejecuciones') {
    formula('errores', `=LEN($${letra(col('errores'))}2)>0`, '#FCE5CD', '#B45F06');
    formula('fuentes_con_error', `=$${letra(col('fuentes_con_error'))}2>0`, '#FCE5CD', '#B45F06');
    formula('casos_guardados', `=$${letra(col('casos_guardados'))}2>0`, '#D9EAD3', '#274E13');
  }
}

return [{ json: { valores: { valueInputOption: 'RAW', data: datos }, formato: { requests: peticiones }, resumen } }];
