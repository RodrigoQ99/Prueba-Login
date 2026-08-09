# Lectura QR — con login, base de datos y ranking

## Qué se agregó a tu proyecto

- **Login con Google** (Firebase Authentication). La sesión queda guardada en el
  dispositivo/navegador automáticamente: el usuario solo inicia sesión una vez.
- **Registro único la primera vez**: elige si participa como "particular" o como
  "estudiante" (y si es estudiante, indica colegio y grado).
- **Base de datos** (Firestore) que guarda usuarios, cada intento de lectura
  (`progreso`) y los puntos totales de cada usuario.
- **Sistema de puntos por nivel**: fácil = 10 pts, intermedio = 25 pts,
  difícil = 50 pts (ajustable en `puntos.js`). Solo se otorgan si el
  cuestionario se responde completo (3/3) — puedes cambiar esta regla en
  `puntos.js` si prefieres dar puntos parciales.
- **Ranking de colegios por grado** (`ranking.html`), agrupado y ordenado por
  puntos. Se recalcula automáticamente la primera vez que alguien lo visita
  cada día, y el resto de visitas de ese día leen el resultado ya guardado
  (no hace falta plan de pago de Firebase para esto).

## Archivos nuevos

| Archivo             | Qué hace                                              |
|----------------------|--------------------------------------------------------|
| `firebase-init.js`   | Configuración y conexión a Firebase (**hay que editarlo**) |
| `auth.js`             | Login con Google + formulario de registro inicial     |
| `puntos.js`           | Calcula y guarda los puntos por lectura completada     |
| `ranking.html` / `ranking.js` | Pantalla de ranking por colegio/grado          |
| `firestore.rules`     | Reglas de seguridad para pegar en la consola de Firebase |

## Pasos para dejarlo funcionando

1. **Crear proyecto en Firebase**
   - Ve a https://console.firebase.google.com → "Agregar proyecto" (gratis, plan Spark)

2. **Agregar una app web**
   - Dentro del proyecto, clic en el ícono `</>` para agregar una app web
   - Copia el objeto `firebaseConfig` que te muestra

3. **Pegar la configuración**
   - Abre `firebase-init.js` en tu proyecto
   - Reemplaza el objeto `firebaseConfig` de ejemplo por el que copiaste

4. **Activar login con Google**
   - En la consola: Authentication → Sign-in method → habilitar "Google"

5. **Crear la base de datos**
   - En la consola: Firestore Database → Crear base de datos → modo producción
   - Ve a la pestaña "Reglas" y pega el contenido de `firestore.rules`

6. **Publicar**
   - Sube estos archivos a tu repositorio de GitHub (reemplazando los actuales)
   - Si usas GitHub Pages, no necesitas nada más — Firebase funciona directo
     desde un sitio estático

## Cómo agregar más lecturas (fácil / intermedia / difícil)

Ahora mismo el proyecto tiene una sola lectura "dura codeada" en `index.html`.
Para el prototipo funcional que vas a presentar, lo más rápido es duplicar
`index.html` en archivos como `lectura-facil-2.html`, `lectura-intermedia-1.html`,
etc., cambiando:
- El texto dentro de `#lectura`
- Las preguntas del cuestionario
- Las constantes `LECTURA_ID` y `NIVEL_LECTURA` en la copia de `script.js` de cada una
- `TIEMPO_LECTURA` según la duración (fácil ~60s, intermedia 120-300s, difícil 360-600s)

Cuando quieras pasar a algo más robusto (que las lecturas se carguen desde la
base de datos en vez de estar escritas a mano en el HTML), es el siguiente
paso natural, pero no hace falta para la propuesta inicial.

## Sobre el "una vez por día"

El ranking se guarda en Firestore en `rankingDiario/{fecha}`. La primera
persona que entra a `ranking.html` en el día dispara el cálculo; las
siguientes visitas ese mismo día solo leen el resultado ya guardado. Esto
evita tener que usar Cloud Functions (que requieren el plan de pago de
Firebase) y es suficiente para una actualización diaria.
