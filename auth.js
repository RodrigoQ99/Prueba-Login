// ==========================================================
// LOGIN Y REGISTRO
// ==========================================================

const pantallaLogin = document.getElementById("pantallaLogin");
const pantallaRegistro = document.getElementById("pantallaRegistro");
const appContenido = document.getElementById("contenedor");

const btnLoginGoogle = document.getElementById("btnLoginGoogle");
const formRegistro = document.getElementById("formRegistro");
const tipoUsuarioInputs = document.querySelectorAll('input[name="tipoUsuario"]');
const camposEstudiante = document.getElementById("camposEstudiante");

let usuarioActual = null; // guarda el objeto del documento de Firestore del usuario

// Mostrar/ocultar campos de colegio y grado según el tipo elegido
tipoUsuarioInputs.forEach(input => {
    input.addEventListener("change", () => {
        camposEstudiante.style.display =
            document.querySelector('input[name="tipoUsuario"]:checked').value === "estudiante"
                ? "block"
                : "none";
    });
});

// Botón de login con Google
btnLoginGoogle.addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión. Intenta de nuevo.");
    });
});

// Se ejecuta automáticamente cada vez que carga la página,
// y detecta si ya había una sesión guardada en este dispositivo.
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // No hay sesión: mostrar pantalla de login
        pantallaLogin.style.display = "flex";
        pantallaRegistro.style.display = "none";
        appContenido.style.display = "none";
        return;
    }

    // Hay sesión activa: buscamos si ya se registró antes (particular/estudiante)
    const refUsuario = db.collection("usuarios").doc(user.uid);
    const doc = await refUsuario.get();

    if (doc.exists) {
        // Ya está registrado: entra directo a la lectura, sin pedir nada más
        usuarioActual = { id: user.uid, ...doc.data() };
        pantallaLogin.style.display = "none";
        pantallaRegistro.style.display = "none";
        appContenido.style.display = "block";
        if (typeof iniciarLectura === "function") iniciarLectura();
    } else {
        // Primera vez: pedir tipo de usuario (y colegio/grado si aplica)
        pantallaLogin.style.display = "none";
        pantallaRegistro.style.display = "flex";
        appContenido.style.display = "none";

        const contenedorGeneros = document.getElementById("contenedorGenerosRegistro");
        if (contenedorGeneros) {
            await cargarGenerosLectura();
            renderizarCheckboxesGeneros(contenedorGeneros, []);
        }
    }
});

// Guardar el registro inicial
formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const tipo = document.querySelector('input[name="tipoUsuario"]:checked').value;

    // "edadPerfil" es un dato de perfil informativo, sin relación con
    // "edadActual" (la edad que navega Mejorar la lectura, ver mejora.js) —
    // nombres deliberadamente distintos para que no se crucen.
    const edadPerfilInput = document.getElementById("inputEdadPerfil").value;
    const contenedorGeneros = document.getElementById("contenedorGenerosRegistro");

    const datosUsuario = {
        nombre: user.displayName || "",
        email: user.email || "",
        tipo: tipo,
        puntosTotales: 0,
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
        edadPerfil: edadPerfilInput ? Number(edadPerfilInput) : null,
        pais: document.getElementById("inputPais").value.trim(),
        lenguaMaterna: document.getElementById("inputLenguaMaterna").value.trim(),
        generosLectura: contenedorGeneros ? leerGenerosSeleccionados(contenedorGeneros) : []
    };

    if (tipo === "estudiante") {
        const colegio = document.getElementById("inputColegio").value.trim();
        const grado = document.getElementById("inputGrado").value.trim();

        if (!colegio || !grado) {
            alert("Por favor completa el colegio y el grado.");
            return;
        }

        datosUsuario.colegio = colegio;
        datosUsuario.grado = grado;
    }

    await db.collection("usuarios").doc(user.uid).set(datosUsuario);

    usuarioActual = { id: user.uid, ...datosUsuario };

    pantallaRegistro.style.display = "none";
    appContenido.style.display = "block";
    if (typeof iniciarLectura === "function") iniciarLectura();
});

// Cerrar sesión (por si lo quieres usar en algún botón, ej. para cambiar de cuenta)
function cerrarSesion() {
    auth.signOut();
}
