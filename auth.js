// ==========================================================
// LOGIN Y REGISTRO
// ==========================================================

const pantallaLogin = document.getElementById("pantallaLogin");
const pantallaRegistro = document.getElementById("pantallaRegistro");
const appContenido = document.getElementById("contenedor");

const btnLoginGoogle = document.getElementById("btnLoginGoogle");

let usuarioActual = null; // guarda el objeto del documento de Firestore del usuario

/**
 * Calcula la edad en años cumplidos a partir de una fecha de nacimiento
 * "YYYY-MM-DD" (lo que devuelve un <input type="date">).
 */
function calcularEdadDesdeFecha(fechaTexto) {

    const nacimiento = new Date(fechaTexto + "T00:00:00");
    const hoy = new Date();

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const noHaCumplidoAunEsteAnio =
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

    if (noHaCumplidoAunEsteAnio) edad--;

    return edad;

}

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
        // "btnQueEsEsto" (💡) solo existe en index.html — en las demás
        // páginas que también cargan auth.js, este guard evita un error.
        if (typeof btnQueEsEsto !== "undefined" && btnQueEsEsto) {
            btnQueEsEsto.style.display = "none";
        }
        // Saludo del ajolote: en la pantalla de login, saludos genéricos
        // y empujones divertidos para que inicie sesión.
        if (typeof mostrarSaludoAjoloteSinSesion === "function") {
            mostrarSaludoAjoloteSinSesion();
        }
        return;
    }

    // Hay sesión activa: buscamos si ya se registró antes (particular/estudiante)
    const refUsuario = db.collection("usuarios").doc(user.uid);
    const doc = await refUsuario.get();

    if (doc.exists) {

        // Ya está registrado: entra directo, sin pedir nada más.
        usuarioActual = { id: user.uid, ...doc.data() };
        pantallaLogin.style.display = "none";
        pantallaRegistro.style.display = "none";
        appContenido.style.display = "block";

        // Las dos interrupciones de abajo pasan SOLO desde Inicio: si
        // alguien entró directo a una lectura por QR, no se le corta el
        // camino a la mitad — se le pedirá la próxima vez que abra Inicio.
        const enInicio = /index\.html$|\/$/.test(window.location.pathname);

        // Cuenta de antes de la Etapa 37: le faltan los datos nuevos
        // (ocupación, propósito, nivel, temas). Se le piden una sola vez.
        if (enInicio && typeof faltanDatosNuevosDePerfil === "function"
            && faltanDatosNuevosDePerfil(usuarioActual)) {

            appContenido.style.display = "none";
            pantallaRegistro.style.display = "flex";

            construirCompletarPerfil(pantallaRegistro, usuarioActual, {
                alTerminar: (datosActualizados) => {

                    usuarioActual = datosActualizados;
                    pantallaRegistro.style.display = "none";

                    if (datosActualizados.pendienteTestNivel) {
                        window.location.href = "test-nivel.html";
                        return;
                    }

                    appContenido.style.display = "block";
                    if (typeof iniciarLectura === "function") iniciarLectura();

                }
            });

            return;

        }

        // Eligió "Desconozco mi nivel" y todavía no ha hecho el test de
        // ubicación (ver test-nivel.js).
        if (enInicio && usuarioActual.pendienteTestNivel) {
            window.location.href = "test-nivel.html";
            return;
        }

        if (typeof iniciarLectura === "function") iniciarLectura();

    } else {
        // Primera vez: mostrar el formulario DE UNA VEZ y llenar cada
        // parte conforme carga — nada de esperar a que todo esté listo
        // antes de mostrar algo.
        pantallaLogin.style.display = "none";
        pantallaRegistro.style.display = "flex";
        appContenido.style.display = "none";

        // Todo el formulario (4 pasos) lo arma registro.js — antes
        // estaba copiado como HTML en las 8 páginas donde alguien puede
        // aterrizar sin cuenta.
        construirFormularioRegistro(pantallaRegistro, {
            alTerminar: (datosUsuario) => {

                usuarioActual = { id: user.uid, ...datosUsuario };
                pantallaRegistro.style.display = 'none';

                // Si dijo que desconoce su nivel, lo primero que ve es el
                // test de ubicación (ver test-nivel.js).
                if (datosUsuario.pendienteTestNivel) {
                    window.location.href = 'test-nivel.html';
                    return;
                }

                appContenido.style.display = 'block';
                if (typeof iniciarLectura === 'function') iniciarLectura();

            }
        });
    }
});

// Cerrar sesión (por si lo quieres usar en algún botón, ej. para cambiar de cuenta)
function cerrarSesion() {
    auth.signOut();
}
