# Cloud Functions — funciones de IA del panel de administrador

Tres funciones (`onCall`, Firebase Functions v2), **exclusivas para administradores**:

- `generarPreguntasIA` — arma el banco de preguntas de una lectura a partir de su texto.
- `moderarPropuestaIA` — da una opinión sobre si una propuesta de "Ser el protagonista de la historia" parece apropiada (nunca aprueba/rechaza nada por su cuenta).
- `extraerLecturaDeDocumentoIA` — lee un documento (PDF/.docx/.txt) que el admin subió a Firebase Storage y arma título + texto + banco de preguntas para llenar el formulario de creación de lectura (si el documento no traía preguntas, las genera igual, con la misma lógica de `cantidadPreguntas.js`).

Las tres verifican `request.auth` + membresía en la colección `administradores` de Firestore (mismo criterio que `esAdmin()` en el frontend, ver `lib/verificarAdmin.js`) **antes** de llamar a la API de Claude — así nadie gasta presupuesto llamándolas sin permiso.

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
  index.js                    — exporta las tres funciones
  admin-init.js                — inicializa el Admin SDK (Firestore + Storage) una sola vez
  lib/
    verificarAdmin.js           — chequeo compartido: ¿quién llama es admin?
    cantidadPreguntas.js        — cuántas preguntas pedirle a Claude (premios: por
                                   cantidad de palabras, igual que protagonista.js;
                                   mejora: 3 fijas)
    esquemaPreguntas.js         — esquema Zod del banco de preguntas
    esquemaModeracion.js        — esquema Zod del veredicto de moderación
    esquemaLecturaExtraida.js   — esquema Zod de título+texto+preguntas extraídos
    generarPreguntasIA.js
    moderarPropuestaIA.js
    extraerLecturaDeDocumentoIA.js
```

El documento que sube el admin vive en Storage, carpeta `fuentesLecturas/` (ver `storage.rules` — solo administradores pueden subir/leer/borrar ahí, máximo 15 MB, solo PDF/.docx/.txt). Es un archivo de entrada TRANSITORIO: `extraerLecturaDeDocumentoIA` lo borra ella misma apenas termina de leerlo, nunca queda guardado.

## Modelo usado

`claude-opus-5` (el modelo más capaz disponible actualmente) para las tres funciones. Si en algún momento quieres bajar el costo (por ejemplo a `claude-sonnet-5`, más barato pero algo menos capaz), es un solo cambio de línea en cada archivo de `lib/` — no hace falta tocar nada del frontend.
