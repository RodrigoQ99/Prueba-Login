// ==========================================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================================
// 1. Ve a https://console.firebase.google.com
// 2. Crea un proyecto (gratis, plan "Spark")
// 3. Agrega una app web (ícono </>)
// 4. Copia el objeto "firebaseConfig" que te da Firebase y pégalo aquí abajo,
//    reemplazando todo el objeto de ejemplo.
// 5. En la consola de Firebase, activa:
//    - Authentication > Sign-in method > Google
//    - Firestore Database > Crear base de datos (modo producción)
// ==========================================================

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

firebase.initializeApp(firebaseConfig);

// Referencias globales que usan los demás archivos (auth.js, puntos.js, ranking.js)
const auth = firebase.auth();
const db = firebase.firestore();

// Esto hace que la sesión quede guardada en ESTE dispositivo/navegador.
// Es lo que evita pedir login de nuevo cada vez que el usuario entra
// desde el mismo celular: Firebase guarda la sesión en el almacenamiento
// local del navegador y la recupera automáticamente.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
