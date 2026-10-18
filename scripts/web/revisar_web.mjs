// Revisión automática de web/index.html en un Chrome/Edge real (sin dependencias: habla con el navegador por CDP).
// Abre la página por file://, la prueba en escritorio y móvil, hace capturas y comprueba lo importante.
// Uso: node scripts/web/revisar_web.mjs [carpeta_capturas] [--html ruta/index.html]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const iHtml = args.indexOf('--html');
const html = path.resolve(RAIZ, iHtml >= 0 ? args[iHtml + 1] : 'web/index.html');
const outDir = path.resolve(args.find((a, i) => !a.startsWith('--') && (iHtml < 0 || i !== iHtml + 1)) || path.join(os.tmpdir(), 'capturas_web'));
fs.mkdirSync(outDir, { recursive: true });

const CANDIDATOS = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chrome = CANDIDATOS.find(p => fs.existsSync(p));
if (!chrome) { console.error('No encuentro Chrome ni Edge. Define CHROME_PATH.'); process.exit(1); }

const PUERTO = 9400 + Math.floor(Math.random() * 400);
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'revweb-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${PUERTO}`, `--user-data-dir=${perfil}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function conectar() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PUERTO}/json/list`); const l = await r.json(); const p = l.find(t => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) { /* aún arrancando */ }
    await dormir(250);
  }
  throw new Error('Chrome no arrancó');
}
const ws = new WebSocket(await conectar());
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); const consola = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const { ok, ko } = pend.get(m.id); pend.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); }
  else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) consola.push(`${m.params.type}: ${m.params.args.map(a => a.value || a.description).join(' ')}`);
  else if (m.method === 'Runtime.exceptionThrown') consola.push('excepción: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  else if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(m.params.entry.level)) consola.push(`${m.params.entry.level}: ${m.params.entry.text} ${m.params.entry.url || ''}`);
});
const send = (method, params = {}) => new Promise((ok, ko) => { const i = ++id; pend.set(i, { ok, ko }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'error en evaluate'); return r.result.value; };
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

async function captura(nombre, completa = false) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: completa });
  const f = path.join(outDir, nombre + '.png'); fs.writeFileSync(f, Buffer.from(r.data, 'base64')); return f;
}
async function abrir(ancho, alto, movil, extra = {}) {
  await send('Emulation.setDeviceMetricsOverride', { width: ancho, height: alto, deviceScaleFactor: 1, mobile: movil });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: extra.oscuro ? 'dark' : 'light' }, { name: 'prefers-reduced-motion', value: extra.reducido ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: pathToFileURL(html).href + (extra.hash || '') });
  await dormir(900);
}
const resultados = {}; const apunta = (k, v) => { resultados[k] = v; };
const cajaDe = sel => evalJs(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);

try {
  // ---------- ESCRITORIO ----------
  await abrir(1440, 900, false);
  apunta('escritorio.titulo', await evalJs('document.title'));
  apunta('escritorio.logo', await evalJs("document.querySelector('#logo').innerText"));
  apunta('escritorio.eslogan', await evalJs("document.querySelector('#eslogan').innerText"));
  apunta('escritorio.robots', await evalJs("(document.querySelector('meta[name=robots]')||{}).content||null"));
  apunta('escritorio.ediciones_en_selector', await evalJs("document.querySelectorAll('#sel-edicion option').length"));
  apunta('escritorio.banner_ejemplo_visible', await evalJs("getComputedStyle(document.querySelector('#banner-ejemplo')).display!=='none'"));
  apunta('escritorio.scroll_horizontal', await evalJs('document.documentElement.scrollWidth>innerWidth+1'));
  apunta('escritorio.logo_en_una_linea', await evalJs("(()=>{const h=document.querySelector('#logo');return h.getBoundingClientRect().height<h.firstElementChild.getBoundingClientRect().height*1.6})()"));
  await captura('escritorio_1_portada');
  await captura('escritorio_0_pagina_completa', true);

  // Escena fija: 3 posiciones de progreso
  const info = await evalJs("(()=>{const e=document.querySelector('#escena-in');if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top+scrollY,alto:e.offsetHeight,n:document.querySelectorAll('#escena-in .panel').length}})()");
  apunta('escritorio.escena', info);
  if (info) {
    const estados = [];
    for (let k = 0; k < info.n; k++) {
      const y = info.top + (info.alto - 900) * ((k + .5) / info.n);
      await evalJs(`window.scrollTo(0,${y})`); await dormir(700);
      estados.push(await evalJs("Array.from(document.querySelectorAll('#escena-in .caps li')).map(l=>l.dataset.e).join(',')"));
      if (k === 0 || k === info.n - 1) await captura('escritorio_2_escena_cap' + (k + 1));
    }
    apunta('escritorio.escena_estados_por_capitulo', estados);
  }
  // Lista con vista previa: hover sobre la 3.ª fila
  await evalJs("document.querySelector('#sectores').scrollIntoView({block:'start'})"); await dormir(500);
  const filaB = await cajaDe('#sectores .fila:nth-of-type(3)') || await cajaDe('#sectores .fila');
  if (filaB) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: filaB.x, y: filaB.y }); await dormir(600);
    apunta('escritorio.hover', await evalJs("({activa:document.querySelector('#sectores .fila.activa .cab h4').innerText, vista:document.querySelector('#vista h3').innerText})"));
    await captura('escritorio_3_sectores_hover');
  }
  await evalJs("document.querySelector('#cifras').scrollIntoView({block:'start'})"); await dormir(300); await captura('escritorio_4_cifras');
  await evalJs("document.querySelector('#archivo').scrollIntoView({block:'start'})"); await dormir(300);
  await evalJs("(()=>{const i=document.querySelector('#f-q');i.value='energía';i.dispatchEvent(new Event('input'))})()"); await dormir(300);
  apunta('escritorio.busqueda_energia_resultados', await evalJs("document.querySelectorAll('#arch-cont .res li').length"));
  await captura('escritorio_5_archivo_busqueda');
  await evalJs("(()=>{const i=document.querySelector('#f-q');i.value='';i.dispatchEvent(new Event('input'))})()");
  // Cambiar de edición con el selector
  await evalJs("(()=>{const s=document.querySelector('#sel-edicion');s.value=s.options[s.options.length-1].value;s.dispatchEvent(new Event('change'))})()"); await dormir(500);
  apunta('escritorio.edicion_antigua', await evalJs("document.querySelector('#num-edicion').innerText+' | '+location.hash"));

  // Modo oscuro
  await abrir(1440, 900, false, { oscuro: true }); await captura('escritorio_6_oscuro');
  // Reducción de movimiento
  await abrir(1440, 900, false, { reducido: true });
  apunta('reducido.transiciones_panel', await evalJs("getComputedStyle(document.querySelector('.panel')).transitionDuration"));

  // ---------- MÓVIL ----------
  await abrir(390, 844, true);
  apunta('movil.scroll_horizontal', await evalJs('document.documentElement.scrollWidth>innerWidth+1'));
  apunta('movil.logo_en_dos_lineas', await evalJs("(()=>{const h=document.querySelector('#logo');return getComputedStyle(h).flexDirection==='column'})()"));
  apunta('movil.escena_apilada', await evalJs("getComputedStyle(document.querySelector('#escena-in .stage')).position!=='sticky'&&getComputedStyle(document.querySelector('#escena-in .panel')).opacity==='1'"));
  await captura('movil_1_portada'); await captura('movil_0_pagina_completa', true);
  await evalJs("document.querySelector('#escena').scrollIntoView({block:'start'})"); await dormir(300); await captura('movil_2_escena');
  await evalJs("document.querySelector('#sectores').scrollIntoView({block:'start'})"); await dormir(300);
  const filaM = await cajaDe('#sectores .fila');
  if (filaM) {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: filaM.x, y: filaM.y }] }); await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await dormir(500);
    apunta('movil.fila_expandida_visible', await evalJs("(()=>{const f=document.querySelector('#sectores .fila.activa .det');return !!f&&getComputedStyle(f).display!=='none'})()"));
    await captura('movil_3_sectores_toque');
  }
  await evalJs("window.scrollTo(0,700)"); await dormir(500);
  apunta('movil.barra_compacta_visible', await evalJs("document.querySelector('#compacta').classList.contains('on')"));
  await captura('movil_4_barra_compacta');

  // ---------- NOMBRES DISTINTOS ----------
  for (const [clave, nombre] of [['corto', 'Tecnoticias IA'], ['largo', 'Observatorio Iberoamericano de Innovación y Transformación Digital con Inteligencia Artificial IA']]) {
    for (const [dispo, a, h, m] of [['escritorio', 1440, 900, false], ['movil', 390, 844, true]]) {
      await abrir(a, h, m);
      await evalJs(`(()=>{const l=document.querySelector('#logo');const p=${JSON.stringify(nombre)}.split(' ');l.innerHTML='';const mk=(c,t)=>{const s=document.createElement('span');s.className=c;s.textContent=t;l.appendChild(s)};mk('p1',p[0]);mk('p2',p.slice(1,-1).join(' '));mk('p3',p[p.length-1]);})()`);
      await dormir(200);
      apunta(`nombre_${clave}.${dispo}.desborda`, await evalJs('document.documentElement.scrollWidth>innerWidth+1'));
      await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: a, height: Math.min(h, 420), scale: 1 } }).then(r => fs.writeFileSync(path.join(outDir, `nombre_${clave}_${dispo}.png`), Buffer.from(r.data, 'base64')));
    }
  }
} finally {
  apunta('consola_errores_y_avisos', consola);
  console.log(JSON.stringify(resultados, null, 2));
  console.log('Capturas en: ' + outDir);
  try { ws.close(); } catch (e) { /* nada */ }
  proc.kill();
  await dormir(500);
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) { /* nada */ }
}
