# Instalación y puesta en marcha

> Volver al [README](../README.md) · Siguiente: [configuración](configuracion.md)

## Instalación

Requisitos: Docker (con Compose). Para modificar los workflows o ejecutar las pruebas, Node.js 20 o superior.

1. Copia `.env.example` a `.env` y rellénalo:
   ```bash
   cp .env.example .env
   ```
   - `N8N_ENCRYPTION_KEY`: genera una con `openssl rand -hex 32`. **Guárdala**: si la pierdes o la cambias, n8n no podrá descifrar las credenciales guardadas.
   - `GOOGLE_SHEET_ID`: el tramo largo de la URL de tu hoja entre `/d/` y `/edit`.
   - `TELEGRAM_CHAT_ID`: ver [Telegram](#4-telegram).
   - Si el puerto 5678 está ocupado, cambia `N8N_PORT` (y `WEBHOOK_URL`).
2. Levanta n8n:
   ```bash
   docker compose up -d
   ```
3. Abre <http://localhost:5678> (o el puerto que hayas puesto) y crea la cuenta de administrador de tu n8n local.

`config/`, `prompts/`, `schemas/` y `workflows/` se montan en el contenedor en solo lectura (`/data/proyecto`). Los workflows **leen estos archivos en cada ejecución**, así que cambiar un prompt, un modelo o una palabra clave no exige reimportar nada.

## Credenciales que hay que crear en n8n

En n8n: **Credentials → Create credential**. Ninguna clave va en archivos del proyecto.

### 1. Google Gemini (proveedor por defecto, gratis)
- Tipo: **Google Gemini(PaLM) Api** (`googlePalmApi`). Deja el host por defecto (`https://generativelanguage.googleapis.com`).
- Clave: créala gratis, sin tarjeta, en [Google AI Studio → Get API key](https://aistudio.google.com/apikey).
- **Privacidad:** en la capa gratuita, Google puede usar lo que envías para mejorar sus productos. Aquí solo se envían artículos de prensa públicos y datos derivados de ellos, pero tenlo presente.
- **Cuotas (importante):** la capa gratuita limita las peticiones por minuto (RPM) y por día (RPD) **según el modelo**, y cambian con el tiempo. Mira los de tu cuenta en [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). En la cuenta con la que se probó (17-oct-2026): los modelos **Flash-Lite** (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) permitían 15 RPM y 500 RPD, mientras que los **Flash completos** (`gemini-3.6-flash`, `gemini-3.8-flash`…) solo 5 RPM y **20 RPD**. Por eso la extracción y la clasificación (decenas de llamadas al día) usan Flash-Lite, y los Flash completos se reservan para las tendencias y los borradores (6 llamadas a la semana). El workflow espacia las llamadas por tarea (`procesamiento.pausas_ia_ms`) para respetar los RPM y procesa como máximo 50 artículos al día (`max_articulos_por_ejecucion`). Si ves errores de cuota, baja ese tope, sube las pausas o cambia de modelo.

### 2. Anthropic (solo para la variante con Claude)
- Tipo: **Anthropic** (`anthropicApi`). Clave en la [consola de Anthropic](https://console.anthropic.com/); la API se paga por uso y exige comprar créditos. Pon un límite de gasto mensual.
- Para el workflow 03 hay que **habilitar la búsqueda web** en la configuración de privacidad de tu organización en la consola, y cada búsqueda se factura aparte.

### 3. Google Sheets (cuenta de servicio, la opción por defecto)
Los workflows de `workflows/` acceden a la hoja con una **cuenta de servicio** de Google Cloud: una "cuenta robot" que no caduca y no necesita iniciar sesión. (Con el acceso OAuth de usuario, si tu aplicación de Google está en modo "Prueba", el permiso **caduca cada 7 días**.)

1. En [Google Cloud](https://console.cloud.google.com/) crea o elige un proyecto y activa en él las APIs **Google Sheets** y **Google Drive**.
2. **IAM y administración → Cuentas de servicio → Crear cuenta de servicio** (sin roles). Anota su correo (`nombre@proyecto.iam.gserviceaccount.com`).
3. En esa cuenta: **Claves → Agregar clave → Crear clave nueva → JSON**. Se descarga un archivo con la clave privada: **es un secreto, no lo subas a ningún sitio**.
4. Crea el Google Sheet con **5 pestañas** llamadas exactamente: `casos`, `tendencias`, `borradores_redes`, `log_ejecuciones` y `descartados`. En cada una, importa la cabecera correspondiente de [`plantilla_sheets/`](../plantilla_sheets/) (**Archivo → Importar → Insertar hojas nuevas**: crea la pestaña con el nombre del archivo y las cabeceras ya repartidas en columnas). Los nombres de columna deben coincidir: n8n asigna los datos por nombre. Si prefieres otros nombres de pestaña, cámbialos en `config/parametros.json` → `hojas`.
5. **Comparte la hoja** con el correo de la cuenta de servicio como **Editor** (desmarca "Notificar").
6. En n8n: **Credentials → Create credential → Google Service Account API**. Rellena *Service Account Email* con el correo de la cuenta y *Private Key* con el valor de `private_key` del JSON (todo el texto, de `-----BEGIN PRIVATE KEY-----` a `-----END PRIVATE KEY-----`). Deja el resto por defecto.

**Alternativa: OAuth de usuario.** Si prefieres iniciar sesión con tu cuenta, genera los workflows con `GOOGLE_AUTH=oauth node scripts/generar_workflow_01.js` (y el 02 y el 03) y crea la credencial **Google Sheets OAuth2 API** siguiendo la guía de n8n (cliente OAuth en Google Cloud con la redirección `http://localhost:5678/rest/oauth2-credential/callback`, cambiando el puerto si usas otro). Recuerda que en modo "Prueba" caduca a los 7 días; para evitarlo hay que publicar la app en Google Auth Platform, lo que exige una página principal y una política de privacidad públicas. El navegador integrado de algunas apps bloquea la ventana de "Sign in with Google": hazlo en tu navegador normal.

### 4. Telegram
- Tipo: **Telegram API** (`telegramApi`). Crea un bot con [@BotFather](https://t.me/BotFather) (`/newbot`) y pega el token.
- Pulsa **Iniciar** en el chat con tu bot (si no, el bot no puede escribirte). Tu `TELEGRAM_CHAT_ID` es tu identificador numérico de usuario: en Telegram Web (`web.telegram.org/k`), al abrir "Mensajes guardados", ese número aparece en la dirección tras `#`. Ponlo en `.env` y reinicia con `docker compose up -d`.
- *Alternativa por email*: sustituye el nodo **Enviar a Telegram** del workflow 02 por un nodo de Gmail o SMTP; el campo `texto` ya contiene el mensaje (en HTML).

## Importar y activar los workflows

Por la interfaz: **Workflows → Import from file** y elige los archivos de `workflows/`. O por línea de comandos:
```bash
docker exec n8n-vigilancia-ia n8n import:workflow --input=/data/proyecto/workflows/01_ingesta_diaria.json
docker exec n8n-vigilancia-ia n8n import:workflow --input=/data/proyecto/workflows/02_informe_semanal.json
```

Después, en cada workflow (también puedes asignar las credenciales por script con `scripts/asignar_credenciales.js`, que escribe una copia con tus IDs sin tocar los archivos del repositorio):
1. Abre los nodos con credencial (**IA · …** con la de Gemini, **Leer/Guardar … (Google Sheets)** con la cuenta de servicio y **Enviar a Telegram**) y selecciona la credencial que creaste.
2. Prueba con **Execute workflow** (disparador manual). **Ejecuta primero el 01**.
3. Cuando funcione, **actívalo** (publícalo) para que corra con su programación.

**Primera ejecución del 01.** Usa una ventana de **30 días** (`ventana_dias_primera_ejecucion`) y procesa como máximo **50 artículos** por ejecución (`max_articulos_por_ejecucion`), los más recientes primero. Los demás se verán en las siguientes ejecuciones mientras sigan dentro de la ventana de 7 días. Con Gemini las llamadas van espaciadas, así que una ejecución de 50 artículos tarda unos 8–10 minutos.

**Si la API de IA falla** (cuota agotada, sobrecarga…), los artículos afectados se **omiten sin guardarlos** (no van a `descartados`) y se reintentan en la siguiente ejecución; el log anota cuántos fueron.

Para probar sin credenciales ni coste, en `tests/` hay versiones con la IA, las hojas y Telegram simulados (ver [Pruebas](pruebas.md)).

## Elegir el proveedor de IA

Los nodos de IA son distintos según el proveedor, así que hay dos juegos de workflows ya generados:

| | Gemini (por defecto) | Claude |
|---|---|---|
| Carpeta | `workflows/` | `workflows/variante_claude/` |
| Coste | Capa gratuita | De pago (créditos de la API) |
| Workflow 03 (búsqueda web) | No | Sí |
| Credencial de IA en n8n | Google Gemini(PaLM) Api | Anthropic |

Para pasar a Claude: crea la credencial de Anthropic, importa los workflows de `workflows/variante_claude/` y úsalos en lugar de los de Gemini (no actives los dos a la vez: escribirían los mismos casos). `config/parametros.json` guarda, por tarea, el modelo de cada proveedor (`modelos.<tarea>.gemini` y `.anthropic`); el campo `proveedor_ia` es solo informativo, porque el proveedor lo fija el workflow que importes.

**Por qué el 03 no está con Gemini:** su búsqueda con Google devuelve enlaces temporales de redirección en lugar de la dirección real del artículo, y harían falta pasos extra (resolver la redirección) que no he podido probar sin una clave real. Si lo necesitas, pásate a Claude.
