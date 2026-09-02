# Cloud Functions — funciones de IA del panel de administrador

Ocho funciones activas (`onCall`, Firebase Functions v2), **TODAS exclusivas para administradores** (desde la Etapa 29 no queda ninguna abierta a usuarios normales — ver la nota sobre `cargarGlosarioPersonalIA` más abajo). De esas ocho, **7 llaman a Claude** (funciones de IA) y **1 no** (es solo lectura de datos ya existentes):

- `generarPreguntasIA` — arma el banco de preguntas de una lectura a partir de su texto.
- `moderarPropuestaIA` — da una opinión sobre si una propuesta de "Ser el protagonista de la historia" parece apropiada (nunca aprueba/rechaza nada por su cuenta).
- `generarLecturaOriginalIA` — INVENTA una historia 100% original (nunca copiada de una obra existente) que combina el o los géneros que el admin marca, junto con su banco de preguntas — mismas bandas de palabras/preguntas que ya usa el resto del proyecto (Etapa 29).
- `analizarDatosUsuariosIA` — 4ta función de IA (Etapa 37, autorizada explícitamente por el admin, amplía el límite de 3 de la Etapa 29). El CÓDIGO (no Claude) cuenta/agrupa los datos de usuarios según los filtros elegidos y le manda a Claude SOLO ese resumen ya compacto para que lo redacte — nunca la lista de usuarios uno por uno. Guarda cada consulta en la colección `analisisIA` (la "librería de respuestas").
- `extraerTextoDePdfGuardado` — devuelve el texto completo de un PDF guardado en Storage, SIN tocarlo con IA (no llama a Claude, es solo lectura) — el admin lo recorta a mano hasta dejar el fragmento exacto que quiere usar en "El Hilo del día". La IA nunca elige esa parte por su cuenta.
- `dividirFragmentoEnHiloIA` — divide el fragmento YA ELEGIDO por el admin en exactamente 5 partes narrativamente coherentes y en orden (el juego las desordena solo al mostrarlas; la base de datos siempre guarda el orden real).
- `extraerPalabraDeUrlIA` — lee una página de diccionario en línea (ej. RAE) y extrae SOLO la palabra y su definición, para el banco general de Ahorcado.
- `extraerPalabrasDeDocumentoIA` — lee un documento con una lista de palabras (con o sin definiciones) para el banco general de Ahorcado.

Todas verifican `request.auth` + membresía en la colección `administradores` de Firestore (mismo criterio que `esAdmin()` en el frontend, ver `lib/verificarAdmin.js`) **antes** de llamar a la API de Claude (excepto `extraerTextoDePdfGuardado`, que nunca la llama) — así nadie gasta presupuesto llamándolas sin permiso.

> **Registro de uso/costo (Etapa 37):** las 7 funciones que sí llaman a Claude registran automáticamente, después de cada llamada, cuántos tokens consumió ESA llamada (leyendo `response.usage.input_tokens`/`output_tokens`, que la API de Messages siempre devuelve) y calculan su costo aproximado con el precio de `claude-opus-5` (ver `lib/registrarUsoIA.js`), guardándolo en la colección `usoIA` — eso es lo que muestra "💰 Costos de IA". Es un CÁLCULO de esta app, no el número oficial y exacto de facturación de Anthropic — para ese, revisa directamente la Consola de Anthropic.

> **DESCONECTADA (Etapa 39): `obtenerCostoRealIA`.** Se intentó traer el gasto OFICIAL directo desde la Usage & Cost Admin API de Anthropic (necesitaba una Admin API Key aparte, `sk-ant-admin01-...`) pero no se pudo aprovisionar bien esa clave desde la Consola de Anthropic en ese momento — el admin decidió descartar esa vía por completo y quedarse solo con el cálculo propio de arriba. El código sigue en `lib/obtenerCostoRealIA.js` sin borrar, por si algún día se retoma, pero ya no está exportada. El botón "🔄 Consultar gasto real en Anthropic" y su lógica en `admin-costos.html`/`.js` también se quitaron, y el secreto `ANTHROPIC_ADMIN_API_KEY` (si ya lo configuraste) queda sin usar — no hace daño dejarlo, pero se puede borrar con `firebase functions:secrets:destroy ANTHROPIC_ADMIN_API_KEY` si prefieres no dejarlo suelto.

> **DESCONECTADA (Etapa 28): `extraerLecturaDeDocumentoIA`.** El admin pidió quitar por completo la opción de crear lecturas subiendo un documento (una sola o varias de golpe). El código sigue en `lib/extraerLecturaDeDocumentoIA.js` (y su esquema, `lib/esquemaLecturaExtraida.js` — este último SÍ sigue en uso, lo reusa `generarLecturaOriginalIA`) sin borrar, por si algún día se retoma, pero ya no está exportada en `index.js` — al desplegar, deja de existir como función en la nube (no se puede llamar, no consume nada). Su envoltorio del lado del navegador (`extraerLecturaDeDocumentoConIA`, en `../admin-ia.js`) y el botón "subir documento" del editor de lecturas también quedaron comentados/quitados. Para reactivarla: descomenta el `require`/`export` en `index.js`, el envoltorio en `admin-ia.js`, y vuelve a agregar el botón en el formulario de lectura (`admin.js`).
>
> El banco de palabras de Ahorcado tiene una alternativa SIN IA para cargas masivas: "Importar desde Excel" (ver más abajo) — lee un `.xlsx` directamente en el navegador con SheetJS, sin pasar por ninguna Cloud Function.

> **DESCONECTADA (Etapa 29): `cargarGlosarioPersonalIA`.** Era la ÚNICA función abierta a cualquier usuario autenticado (no solo admins): le dejaba subir un documento y usar IA para armar su propio glosario personal de Ahorcado (privado, 2 MB / 100 palabras / 3 cargas al día). El admin pidió que los usuarios **ya no puedan subir ningún documento ni usar IA** — eso queda exclusivo del panel de administrador. El código sigue en `lib/cargarGlosarioPersonalIA.js` sin borrar, pero ya no está exportada. Su envoltorio del lado del navegador (`subirGlosarioPersonalConIA`, en `../ahorcado-ia.js`) ya no se carga en `ahorcado.html`, y todo el selector "banco general / glosario personal" se quitó de `ahorcado.js` — ahora Ahorcado juega SIEMPRE con el banco general (`bancoPalabras`), que el admin llena a mano, con IA (URL/documento) o importando un Excel. La carpeta de Storage que usaba (`fuentesGlosarioPersonal/{uid}/`) también quedó cerrada, ver `storage.rules`.

## Requisitos

- Plan **Blaze** activo en el proyecto de Firebase (`lectura-3d24a`). Sin esto, `firebase deploy` falla con un aviso de facturación — revísalo en la Consola de Firebase → ⚙️ Configuración del proyecto → Uso y facturación, o en https://console.firebase.google.com/project/lectura-3d24a/usage.
- Node.js 22 instalado localmente (para poder correr `npm install` aquí adentro; Cloud Functions usa su propio Node 22 en la nube sin importar qué versión tengas local, pero conviene que coincidan).
- Firebase CLI: `npm install -g firebase-tools`.

## Primera vez — pasos en orden

```bash
# 1. Desde la raíz del proyecto (donde está firebase.json), inicia sesión
#    (abre el navegador para el login de Google — no se puede automatizar).
firebase login

# 2. Instala las dependencias de las funciones
cd functions
npm install
cd ..

# 3. Configura la clave de la API de Anthropic como secreto de Firebase
#    (Google Secret Manager — NUNCA queda en el código ni en git).
#    Te va a pedir que pegues la clave; no se muestra en pantalla.
firebase functions:secrets:set ANTHROPIC_API_KEY

# 4. Despliega funciones Y las reglas de Storage juntas
firebase deploy --only functions,storage
```

Si en el paso 3 ya existía un valor y quieres cambiarlo, corre el mismo comando otra vez — crea una nueva versión del secreto (Firebase la usa automáticamente en el próximo despliegue).

> **Nota sobre `extraerLecturaDeDocumentoIA` — soporte de Word (.docx) pausado:** aplica solo si algún día se reactiva esta función (hoy está desconectada, ver arriba). `mammoth` (la librería para leer .docx) falló repetidamente al descargarse desde `registry.npmjs.org` — se quitó de `package.json`. Para reactivarlo: agrega de nuevo `"mammoth": "^1.8.0"` a `dependencies` aquí abajo, corre `npm install` dentro de `functions/`, y vuelve a desplegar.

## Después de la primera vez

Repite el paso 4 cuando cambies algo en `functions/` o en `storage.rules`:

```bash
firebase deploy --only functions,storage
```

## Ver logs (para depurar errores de la IA)

```bash
firebase functions:log
```

o en la Consola de Firebase → Functions → selecciona la función → pestaña "Registros".

## Estructura

```
functions/
  index.js                    — exporta las ocho funciones activas
  admin-init.js                — inicializa el Admin SDK (Firestore + Storage) una sola vez
  lib/
    verificarAdmin.js           — chequeo compartido: ¿quién llama es admin?
    cantidadPreguntas.js        — cuántas preguntas/palabras pedirle a Claude (premios: por
                                   nivel, igual que protagonista.js; mejora: rango fijo de
                                   palabras + 3 preguntas). También lo usa generarLecturaOriginalIA.
    registrarUsoIA.js           — helper compartido (Etapa 37): después de cada llamada a Claude,
                                   calcula el costo (tokens × precio de claude-opus-5) y lo guarda
                                   en la colección "usoIA" — lo llaman las 7 funciones de IA.
    extraerTextoStorage.js      — helper compartido: descarga+extrae texto de
                                   Storage (PDF/.docx/.txt) — solo lo usa ya la función
                                   DESCONECTADA extraerLecturaDeDocumentoIA
    extraccionListaPalabras.js  — helper compartido: le pide a Claude una lista de
                                   palabras+definiciones (admin; antes también glosario personal)
    esquemaPreguntas.js         — esquema Zod del banco de preguntas
    esquemaModeracion.js        — esquema Zod del veredicto de moderación
    esquemaLecturaExtraida.js   — esquema Zod de título+texto+preguntas (lo usa
                                   generarLecturaOriginalIA Y la función DESCONECTADA)
    esquemaHiloDia.js           — esquema Zod de los 5 fragmentos de El Hilo del día
    esquemaPalabra.js           — esquema Zod de palabra(s) + definición para Ahorcado
    generarPreguntasIA.js
    moderarPropuestaIA.js
    generarLecturaOriginalIA.js
    analizarDatosUsuariosIA.js  — 4ta función de IA (Etapa 37)
    obtenerCostoRealIA.js       — DESCONECTADA, no exportada (Etapa 39, ver nota arriba)
    extraerLecturaDeDocumentoIA.js   — DESCONECTADA, no exportada (ver nota arriba)
    extraerTextoDePdfGuardado.js
    dividirFragmentoEnHiloIA.js
    extraerPalabraDeUrlIA.js
    extraerPalabrasDeDocumentoIA.js
    cargarGlosarioPersonalIA.js      — DESCONECTADA, no exportada (ver nota arriba)
```

Tres carpetas en Storage (ver `storage.rules`), TODAS exclusivas de administradores:

- `fuentesLecturas/` — SIN USO desde la Etapa 28 (nada la sube ni la lee ya que `extraerLecturaDeDocumentoIA` está desconectada) — la regla se dejó tal cual, sin borrar, por si se reactiva. Máximo 15 MB, PDF/.docx/.txt.
- `pdfsHiloDelDia/` — PDFs que el admin guarda como fuente reusable para "El Hilo del día" (Etapa 23). PERMANENTES: se quedan hasta que el admin los borre a mano. Máximo 20 MB, solo PDF.
- `fuentesPalabras/` — documento con una lista de palabras para el banco general de Ahorcado (Etapa 24, admin). TRANSITORIO. Máximo 10 MB, PDF/.docx/.txt.

`fuentesGlosarioPersonal/{uid}/` — CERRADA desde la Etapa 29 (ver nota arriba). Su regla quedó comentada en `storage.rules`, sin borrar.

Todos los archivos "TRANSITORIOS" los borra la Cloud Function correspondiente ella misma apenas termina de leerlos — nunca quedan guardados de forma permanente.

## Modelo usado

`claude-opus-5` (el modelo más capaz disponible actualmente) para las funciones que llaman a Claude. Si en algún momento quieres bajar el costo (por ejemplo a `claude-sonnet-5`, más barato pero algo menos capaz), es un solo cambio de línea en cada archivo de `lib/` — no hace falta tocar nada del frontend.
