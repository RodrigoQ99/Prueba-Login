# Cloud Functions — funciones de IA del panel de administrador

Ocho funciones (`onCall`, Firebase Functions v2). **Siete son exclusivas para administradores:**

- `generarPreguntasIA` — arma el banco de preguntas de una lectura a partir de su texto.
- `moderarPropuestaIA` — da una opinión sobre si una propuesta de "Ser el protagonista de la historia" parece apropiada (nunca aprueba/rechaza nada por su cuenta).
- `extraerLecturaDeDocumentoIA` — lee un documento (PDF/.docx/.txt) que el admin subió a Firebase Storage y arma título + texto + banco de preguntas para llenar el formulario de creación de lectura. El documento puede traer UNA o VARIAS lecturas (ej. 10 historias con sus propias preguntas cada una) — siempre devuelve un arreglo; si ya traían preguntas con la respuesta correcta marcada, las copia tal cual (no las parafrasea); a las que les falten, se las genera.
- `extraerTextoDePdfGuardado` — devuelve el texto completo de un PDF guardado en Storage, SIN tocarlo con IA (no llama a Claude, es solo lectura) — el admin lo recorta a mano hasta dejar el fragmento exacto que quiere usar en "El Hilo del día". La IA nunca elige esa parte por su cuenta.
- `dividirFragmentoEnHiloIA` — divide el fragmento YA ELEGIDO por el admin en exactamente 5 partes narrativamente coherentes y en orden (el juego las desordena solo al mostrarlas; la base de datos siempre guarda el orden real).
- `extraerPalabraDeUrlIA` — lee una página de diccionario en línea (ej. RAE) y extrae SOLO la palabra y su definición, para el banco general de Ahorcado.
- `extraerPalabrasDeDocumentoIA` — lee un documento con una lista de palabras (con o sin definiciones) para el banco general de Ahorcado.

Todas las de arriba verifican `request.auth` + membresía en la colección `administradores` de Firestore (mismo criterio que `esAdmin()` en el frontend, ver `lib/verificarAdmin.js`) **antes** de llamar a la API de Claude (excepto `extraerTextoDePdfGuardado`, que nunca la llama) — así nadie gasta presupuesto llamándolas sin permiso.

**La octava, `cargarGlosarioPersonalIA`, es la ÚNICA excepción** — abierta a cualquier usuario autenticado (no solo admins), para que cada quien suba su propio glosario y juegue Ahorcado con sus palabras (privado, nunca mezclado con el banco general). Tiene límites de costo/abuso impuestos del lado del servidor (no se pueden evadir desde el navegador): máximo 2 MB por archivo, 100 palabras procesadas por carga, y 3 cargas por día por usuario (contador guardado en `usuarios/{uid}.usoGlosarioPersonalIA`, revisado con una transacción de Firestore).

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

> **Nota sobre `extraerLecturaDeDocumentoIA` — soporte de Word (.docx) pausado:** `mammoth` (la librería para leer .docx) falló repetidamente al descargarse desde `registry.npmjs.org` (mismo error en este entorno y en la computadora real) — por ahora lo quité de `package.json` para no bloquear la instalación de todo lo demás. **Mientras tanto, subir PDF o .txt funciona normal** — la función carga cada librería solo cuando hace falta (ver `extraerTextoDelArchivo` en `extraerLecturaDeDocumentoIA.js`), así que Word simplemente muestra "no disponible por ahora" en vez de romper nada. Para reactivarlo más adelante: agrega de nuevo `"mammoth": "^1.8.0"` a `dependencies` aquí abajo, corre `npm install` dentro de `functions/`, y vuelve a desplegar.

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
  index.js                    — exporta las ocho funciones
  admin-init.js                — inicializa el Admin SDK (Firestore + Storage) una sola vez
  lib/
    verificarAdmin.js           — chequeo compartido: ¿quién llama es admin?
    cantidadPreguntas.js        — cuántas preguntas pedirle a Claude (premios: por
                                   cantidad de palabras, igual que protagonista.js;
                                   mejora: 3 fijas)
    extraerTextoStorage.js      — helper compartido: descarga+extrae texto de
                                   Storage (PDF/.docx/.txt), usado por varias funciones
    extraccionListaPalabras.js  — helper compartido: le pide a Claude una lista de
                                   palabras+definiciones (admin y glosario personal)
    esquemaPreguntas.js         — esquema Zod del banco de preguntas
    esquemaModeracion.js        — esquema Zod del veredicto de moderación
    esquemaLecturaExtraida.js   — esquema Zod de título+texto+preguntas extraídos
    esquemaHiloDia.js           — esquema Zod de los 5 fragmentos de El Hilo del día
    esquemaPalabra.js           — esquema Zod de palabra(s) + definición para Ahorcado
    generarPreguntasIA.js
    moderarPropuestaIA.js
    extraerLecturaDeDocumentoIA.js
    extraerTextoDePdfGuardado.js
    dividirFragmentoEnHiloIA.js
    extraerPalabraDeUrlIA.js
    extraerPalabrasDeDocumentoIA.js
    cargarGlosarioPersonalIA.js
```

Cuatro carpetas en Storage (ver `storage.rules`) — todas exclusivas de administradores EXCEPTO la última:

- `fuentesLecturas/` — documento que el admin sube para crear una lectura (Etapa 22). TRANSITORIO. Máximo 15 MB, PDF/.docx/.txt.
- `pdfsHiloDelDia/` — PDFs que el admin guarda como fuente reusable para "El Hilo del día" (Etapa 23). PERMANENTES: se quedan hasta que el admin los borre a mano. Máximo 20 MB, solo PDF.
- `fuentesPalabras/` — documento con una lista de palabras para el banco general de Ahorcado (Etapa 24, admin). TRANSITORIO. Máximo 10 MB, PDF/.docx/.txt.
- `fuentesGlosarioPersonal/{uid}/` — documento con el glosario personal de UN usuario (Etapa 24, cualquiera). TRANSITORIO. Cada quien SOLO puede tocar su propia subcarpeta ({uid} = su propio uid). Máximo 2 MB, PDF/.docx/.txt.

Todos los archivos "TRANSITORIOS" los borra la Cloud Function correspondiente ella misma apenas termina de leerlos — nunca quedan guardados de forma permanente.

## Modelo usado

`claude-opus-5` (el modelo más capaz disponible actualmente) para las funciones que llaman a Claude. Si en algún momento quieres bajar el costo (por ejemplo a `claude-sonnet-5`, más barato pero algo menos capaz), es un solo cambio de línea en cada archivo de `lib/` — no hace falta tocar nada del frontend.
