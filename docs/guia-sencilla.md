# Guía sencilla: qué hace este sistema y qué tienes que hacer tú

*Escrita para usarla sin conocimientos técnicos. Si algo no se entiende, el [glosario](#glosario-palabras-raras-explicadas) del final lo explica. La documentación técnica está en el [README](../README.md).*

---

## 1. ¿Qué es esto, en pocas palabras?

Imagina que contratas a un **ayudante** que hace tres cosas por ti:

1. **Cada día lee la prensa** de tecnología y negocios (unos 45 medios, en español e inglés).
2. **Apunta en una hoja de cálculo** solo las noticias donde una empresa real usa inteligencia artificial (los llamamos *casos*), con un resumen y una nota de 0 a 100.
3. **Cada lunes te manda un informe por Telegram**: qué tendencias hay, cuáles son los 5 mejores casos y un **borrador de publicación** para LinkedIn y para X de cada uno.

**Lo importante:** el ayudante **nunca publica nada por su cuenta**. Los borradores son propuestas; tú decides si los usas, los cambias o los tiras.

**Cuesta 0 €**: funciona con la versión gratuita de Gemini (la IA de Google).

---

## 2. Qué pasa y cuándo

| Cuándo | Qué hace el sistema solo | Qué haces tú |
|---|---|---|
| **Cada día a las 07:00** | Lee la prensa, descarta lo que no sirve, apunta los casos nuevos en la hoja y **te avisa por Telegram** con un resumen del día. | Nada (echa un vistazo al aviso si quieres). |
| **Cada lunes a las 07:30** | Prepara el informe y los 5 borradores y te los envía por Telegram. | **Leer el mensaje y revisar los borradores** (unos 10 minutos). |
| **Siempre** | Guarda un registro de cada ejecución. | Mirarlo solo si algo parece raro. |

> **Condición:** para que todo esto ocurra, **el ordenador tiene que estar encendido** (o en suspensión con un despertador programado), con la **sesión de Windows iniciada** (puede estar bloqueada) y **Docker Desktop abierto**. Si a las 07:00 el ordenador no está activo, ese día no se lee la prensa (no se pierde nada: al día siguiente se recupera lo atrasado), pero **el informe del lunes no se recupera**.

---

## 3. Tu rutina de los lunes (10 minutos)

1. **Abre Telegram.** Tendrás varios mensajes del bot *Vigilancia IA*:
   - El **primero** es el informe: un resumen, las tendencias y los 5 casos destacados (cada uno con una frase que cuenta de qué va).
   - Los **siguientes** son los borradores, uno por mensaje (LinkedIn y X).
2. **Lee cada borrador.** Empieza por el apartado **🧩 "En palabras sencillas"**: te cuenta la noticia como si te la explicaran en la calle, y **🎯 "Por qué importa"** te dice qué significa. Después fíjate en el aviso **"Antes de publicar, revisa"**: te dice qué comprobar.
3. **Comprueba los datos importantes** (cifras, nombres) abriendo el enlace del artículo original. La IA resume bien, pero **se puede equivocar con un número**.
4. Si te gusta, **copia el texto** (está en un recuadro fácil de copiar), retócalo a tu manera y publícalo tú.
5. En la hoja **`borradores_redes`**, cambia la columna **`estado`** a la palabra **`publicado`** en los que uses: la celda se pondrá verde y sabrás cuáles ya has usado.

---

## 4. Las hojas, explicadas

Todo se guarda en una hoja de Google llamada **"Vigilancia IA"**, con 5 pestañas. No hace falta tocar nada en ellas; son para que consultes.

| Pestaña | Qué es, en sencillo | Cuándo mirarla |
|---|---|---|
| **casos** | La lista de todos los casos encontrados. Arriba aparecen la **nota (0-100)**, el título, la empresa, el sector y el resumen. | Cuando quieras ver casos concretos o buscar ejemplos. |
| **tendencias** | El informe semanal en forma de tabla: un resumen y las tendencias de cada semana. | Para consultar informes antiguos. |
| **borradores_redes** | Los borradores de publicaciones de cada lunes, con la explicación sencilla de cada noticia. | **Cada lunes**, para revisar y copiar. |
| **log_ejecuciones** | El "diario" del ayudante: cuántos artículos leyó, cuántos casos encontró, si hubo errores. | Solo si algo no cuadra. |
| **descartados** | Las noticias que el ayudante miró y **rechazó**, con el motivo. | Si crees que se ha dejado fuera algo importante. |

**Truco:** las flechitas de las cabeceras sirven para **filtrar y ordenar** (por ejemplo, ver solo un sector). Hay columnas técnicas **ocultas** a propósito para que se lea mejor; no las necesitas.

### Qué significan los colores

- **La nota (0-100):** roja o naranja = caso flojo; amarilla = normal; **verde = buen caso**.
- **Confianza:** verde = alta, amarillo = media, rojo = baja (el ayudante solo vio el titular, no el artículo entero).
- **Estado de un borrador:**
  - 🟡 **pendiente_revision** = listo para que lo leas (todos los borradores pasan por aquí).
  - 🔴 **revisar_formato** = algo técnico no cuadró (casi siempre falta el enlace). Mira la columna **errores**, arréglalo a mano y úsalo.
  - 🟢 **publicado** = tú lo has marcado como usado.

---

## 4 bis. La web «Tecnoticias e Innovación IA»

Cada mañana, después de leer la prensa, el sistema monta una **edición** como la de un periódico con las noticias del día y la guarda en un único archivo: **`web/index.html`** (dentro de la carpeta del proyecto). **Ábrelo con doble clic**: no necesita internet.

- Arriba verás la **portada** y las noticias destacadas; más abajo, las **cifras del día**, las noticias **por sectores** (pasa el ratón por una para ampliarla) y las **señales débiles** (noticias poco fiables, a vigilar).
- Cada noticia tiene su **nota de 1 a 5**, una etiqueta que dice si es un **hecho confirmado**, una **afirmación de la empresa** o una **opinión**, y el **enlace a la fuente**.
- En **Archivo** puedes abrir cualquier edición anterior y buscar por empresa, país o sector.
- También te llega un aviso por Telegram cuando la edición está lista.

Por ahora la web es **solo tuya** (en tu ordenador); no se publica en internet salvo que tú lo decidas (ver [la web](web.md)).

## 5. ¿Qué es un caso y por qué hay noticias descartadas?

Un **caso** es una noticia donde **una empresa concreta usa la IA para algo concreto** (por ejemplo: "Kone da un asistente de IA a sus técnicos").

**No** son casos (y por eso aparecen en *descartados*): opiniones, noticias sobre leyes, demandas, sueldos, fallos de las propias empresas de IA o productos de consumo. Es normal que **más de la mitad** de las noticias se descarten: la prensa habla mucho de IA, pero pocos artículos describen un caso real.

---

## 6. Si algo no funciona

| Qué notas | Qué hacer (en orden) |
|---|---|
| **El lunes no llega el mensaje de Telegram** | 1. ¿Estaba el ordenador encendido? 2. Abre **Docker Desktop** y mira que `n8n-vigilancia-ia` esté en verde. Si no, púlsale **Start**. |
| **Hace días que no se añaden casos** | Lo mismo: ordenador encendido y Docker abierto. Después mira la pestaña **log_ejecuciones**: si pone errores, léelos. |
| **En el log pone "omitidos por fallo de la API de IA"** | Es normal de vez en cuando: se acabó la cuota gratuita de ese día. Se reintentan al día siguiente solos. |
| **Un borrador sale en rojo ("revisar_formato")** | Mira la columna **errores**, corrígelo a mano (casi siempre es pegar el enlace) y úsalo. |
| **Un borrador sale vacío** | La IA no respondió ese día. Escríbelo tú o espera al lunes siguiente. |
| **Te avisa de que Google ha caducado el acceso** | Ya no debería pasar. Si ocurre, pídele a Claude: *"revisa el acceso de Google a la hoja"*. |

**Regla de oro:** si dudas, **no toques nada** y pregúntale a Claude. Describe lo que ves (mejor con una captura).

---

## 7. Cosas que puedes pedir que se cambien

No hace falta saber programar: **pídeselo a Claude** con frases como estas.

- *"Quiero que me avise a otra hora"* o *"que el informe llegue otro día"*.
- *"Quiero que el sistema se centre solo en banca y seguros"* (modo sectorial).
- *"Añade este medio como fuente: [enlace]"*.
- *"Los borradores son demasiado formales / largos / con muchos emojis"*.
- *"Entran noticias que no son casos de verdad, afina el filtro"*.
- *"Quiero recibir el informe también por correo"*.

---

## 8. Lo que el sistema NO hace

- **No publica** en tus redes. Siempre lo haces tú.
- **No garantiza** que cada cifra sea correcta: revísalas antes de publicar.
- **No lee todo internet**: solo los ~45 medios configurados.
- **No funciona con el ordenador apagado.**
- **No tiene acceso** a tu correo, tus fotos ni otras cosas de tu cuenta de Google: solo ve la hoja "Vigilancia IA".

---

## Glosario: palabras raras explicadas

| Palabra | Qué significa, en cristiano |
|---|---|
| **n8n** | El programa que hace de "capataz": ejecuta los pasos en orden y a su hora. Es lo que corre en tu ordenador. |
| **Workflow (flujo)** | Una receta de pasos que n8n sigue sola. Tienes dos activas: una diaria (leer prensa) y una semanal (informe). |
| **Docker / contenedor** | La "caja" donde vive n8n dentro de tu ordenador. Docker Desktop es el programa que la mantiene encendida. |
| **IA / Gemini** | La inteligencia artificial de Google que lee los artículos y escribe los resúmenes y borradores. |
| **Credencial** | Una "llave" guardada de forma segura para que n8n pueda entrar a Gemini, a la hoja o a Telegram. |
| **API / clave de API** | La puerta por la que un programa habla con otro, y la contraseña para usarla. |
| **Cuota** | El límite gratuito de uso de la IA por día o por minuto. Si se agota, se espera al día siguiente. |
| **Prompt** | Las instrucciones escritas que se le dan a la IA ("extrae estos datos", "escribe un post así"). Están en la carpeta `prompts`. |
| **Cuenta de servicio** | Un "usuario robot" de Google que solo tiene acceso a tu hoja, para que el sistema escriba en ella sin pedirte permiso cada semana. |
| **Feed (RSS)** | La lista de noticias recientes que cada medio ofrece a los programas. Así lee la prensa el sistema. |
| **Deduplicar** | Evitar contar dos veces la misma noticia. |
| **Hoja de cálculo / Google Sheets** | Donde se guarda todo. Es como un Excel en internet. |
| **Bot de Telegram** | La "persona" automática que te escribe los mensajes. |

---

*¿Falta algo que no se entienda? Dímelo y lo añadimos a esta guía.*
