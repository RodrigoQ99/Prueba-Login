# Cloud Functions — funciones de IA del panel de administrador

Dos funciones (`onCall`, Firebase Functions v2), **exclusivas para administradores**:

- `generarPreguntasIA` — arma el banco de preguntas de una lectura a partir de su texto.
- `moderarPropuestaIA` — da una opinión sobre si una propuesta de "Ser el protagonista de la historia" parece apropiada (nunca aprueba/rechaza nada por su cuenta).

Ambas verifican `request.auth` + membresía en la colección `administradores` de Firestore (mismo criterio que `esAdmin()` en el frontend, ver `lib/verificarAdmin.js`) **antes** de llamar a la API de Claude — así nadie gasta presupuesto llamándolas sin permiso.

## Requisitos

- Plan **Blaze** activo en el proyecto de Firebase (`lectura-3d24a`). Sin esto, `firebase deploy` falla con un aviso de facturación — revísalo en la Consola de Firebase → ⚙️ Configuración del proyecto → Uso y facturación, o en https://console.firebase.google.com/project/lectura-3d24a/usage.
- Node.js 22 instalado localmente (para poder correr `npm install` aquí adentro; Cloud Functions usa su propio Node 22 en la nube sin importar qué versión tengas local, pero conviene que coincidan).
- Firebase CLI: `npm install -g firebase-tools` (no estaba instalado en este entorno).

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

# 4. Despliega
firebase deploy --only functions
```

Si en el paso 3 ya existía un valor y quieres cambiarlo, corre el mismo comando otra vez — crea una nueva versión del secreto (Firebase la usa automáticamente en el próximo despliegue).

## Después de la primera vez

Solo hace falta repetir el paso 4 cuando cambies algo en `functions/`:

```bash
firebase deploy --only functions
```

## Ver logs (para depurar errores de la IA)

```bash
firebase functions:log
```

o en la Consola de Firebase → Functions → selecciona la función → pestaña "Registros".

## Estructura

```
functions/
  index.js               — exporta las dos funciones
  admin-init.js           — inicializa el Admin SDK (Firestore) una sola vez
  lib/
    verificarAdmin.js      — chequeo compartido: ¿quién llama es admin?
    cantidadPreguntas.js   — cuántas preguntas pedirle a Claude (premios: por
                              cantidad de palabras, igual que protagonista.js;
                              mejora: 3 fijas)
    esquemaPreguntas.js    — esquema Zod del banco de preguntas
    esquemaModeracion.js   — esquema Zod del veredicto de moderación
    generarPreguntasIA.js
    moderarPropuestaIA.js
```

## Modelo usado

`claude-opus-5` (el modelo más capaz disponible actualmente) para ambas funciones. Si en algún momento quieres bajar el costo (por ejemplo a `claude-sonnet-5`, más barato pero algo menos capaz), es un solo cambio de línea en `generarPreguntasIA.js` / `moderarPropuestaIA.js` — no hace falta tocar nada del frontend.
