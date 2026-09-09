// ==========================================================
// LOGIN Y REGISTRO
// ==========================================================

const pantallaLogin = document.getElementById("pantallaLogin");
const pantallaRegistro = document.getElementById("pantallaRegistro");
const appContenido = document.getElementById("contenedor");

// Botones de tipo de acceso
const selectorTipoAcceso = document.getElementById("selectorTipoAcceso");
const formularioLoginEmail = document.getElementById("formularioLoginEmail");
const formularioRegistroEmail = document.getElementById("formularioRegistroEmail");
const btnAccesoInstitucion = document.getElementById("btnAccesoInstitucion");
const btnAccesoParticipante = document.getElementById("btnAccesoParticipante");

// Botones de login
const btnLoginGoogle = document.getElementById("btnLoginGoogle");
const btnLoginEmail = document.getElementById("btnLoginEmail");
const btnRegistroEmail = document.getElementById("btnRegistroEmail");

let usuarioActual = null; // guarda el objeto del documento de Firestore del usuario
let _tipoAccesoElegido = null; // "institucion" o "participante"

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


// ==========================================================
// SELECTOR DE TIPO DE ACCESO
// ==========================================================

function mostrarFormularioLogin(tipoAcceso) {

    _tipoAccesoElegido = tipoAcceso;
    sessionStorage.setItem("tipoAccesoTrifle", tipoAcceso);

    if (selectorTipoAcceso) selectorTipoAcceso.style.display = "none";
    if (formularioLoginEmail) formularioLoginEmail.style.display = "block";
    if (formularioRegistroEmail) formularioRegistroEmail.style.display = "none";

    const etiqueta = document.getElementById("etiquetaTipoAcceso");
    if (etiqueta) {
        etiqueta.textContent = tipoAcceso === "institucion"
            ? "🏫 Acceso Institución"
            : "📚 Acceso Participante / Alumno";
    }

}

if (btnAccesoInstitucion) {
    btnAccesoInstitucion.addEventListener("click", () => mostrarFormularioLogin("institucion"));
}
if (btnAccesoParticipante) {
    btnAccesoParticipante.addEventListener("click", () => mostrarFormularioLogin("participante"));
}

// Volver al selector de tipo de acceso
const btnVolverTipoAcceso = document.getElementById("btnVolverTipoAcceso");
if (btnVolverTipoAcceso) {
    btnVolverTipoAcceso.addEventListener("click", () => {
        if (selectorTipoAcceso) selectorTipoAcceso.style.display = "";
        if (formularioLoginEmail) formularioLoginEmail.style.display = "none";
        if (formularioRegistroEmail) formularioRegistroEmail.style.display = "none";
    });
}

// Alternar entre login y registro con email
const btnMostrarRegistroEmail = document.getElementById("btnMostrarRegistroEmail");
const btnVolverLoginEmail = document.getElementById("btnVolverLoginEmail");

if (btnMostrarRegistroEmail) {
    btnMostrarRegistroEmail.addEventListener("click", () => {
        if (formularioLoginEmail) formularioLoginEmail.style.display = "none";
        if (formularioRegistroEmail) formularioRegistroEmail.style.display = "block";
    });
}
if (btnVolverLoginEmail) {
    btnVolverLoginEmail.addEventListener("click", () => {
        if (formularioRegistroEmail) formularioRegistroEmail.style.display = "none";
        if (formularioLoginEmail) formularioLoginEmail.style.display = "block";
    });
}


// ==========================================================
// LOGIN CON GOOGLE
// ==========================================================

if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener("click", () => {
        const proveedor = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(proveedor).catch(error => {
            console.error("Error al iniciar sesión:", error);
            alert("No se pudo iniciar sesión. Intenta de nuevo.");
        });
    });
}


// ==========================================================
// LOGIN CON EMAIL Y CONTRASEÑA
// ==========================================================

if (btnLoginEmail) {
    btnLoginEmail.addEventListener("click", async () => {

        const email = (document.getElementById("inputEmailLogin").value || "").trim();
        const password = document.getElementById("inputPasswordLogin").value || "";
        const errorEl = document.getElementById("errorLoginEmail");

        errorEl.textContent = "";

        if (!email || !password) {
            errorEl.textContent = "Escribe tu correo y contraseña.";
            return;
        }

        btnLoginEmail.disabled = true;
        btnLoginEmail.textContent = "Iniciando sesión…";

        try {
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error) {
            console.error("Error al iniciar sesión con email:", error);
            if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                errorEl.textContent = "Correo o contraseña incorrectos.";
            } else if (error.code === "auth/invalid-email") {
                errorEl.textContent = "El correo no es válido.";
            } else if (error.code === "auth/too-many-requests") {
                errorEl.textContent = "Demasiados intentos. Espera un momento.";
            } else {
                errorEl.textContent = "No se pudo iniciar sesión. Intenta de nuevo.";
            }
        }

        btnLoginEmail.disabled = false;
        btnLoginEmail.textContent = "Iniciar sesión";

    });
}


// ==========================================================
// REGISTRO CON EMAIL Y CONTRASEÑA
// ==========================================================

if (btnRegistroEmail) {
    btnRegistroEmail.addEventListener("click", async () => {

        const email = (document.getElementById("inputEmailRegistro").value || "").trim();
        const password = document.getElementById("inputPasswordRegistro").value || "";
        const confirmPassword = document.getElementById("inputPasswordRegistroConfirm").value || "";
        const errorEl = document.getElementById("errorRegistroEmail");

        errorEl.textContent = "";

        if (!email || !password || !confirmPassword) {
            errorEl.textContent = "Completa todos los campos.";
            return;
        }

        if (password.length < 6) {
            errorEl.textContent = "La contraseña debe tener al menos 6 caracteres.";
            return;
        }

        if (password !== confirmPassword) {
            errorEl.textContent = "Las contraseñas no coinciden.";
            return;
        }

        btnRegistroEmail.disabled = true;
        btnRegistroEmail.textContent = "Creando cuenta…";

        try {
            await auth.createUserWithEmailAndPassword(email, password);
            // onAuthStateChanged se dispara automáticamente y lleva al registro
        } catch (error) {
            console.error("Error al crear cuenta con email:", error);
            if (error.code === "auth/email-already-in-use") {
                errorEl.textContent = "Este correo ya tiene una cuenta. Inicia sesión.";
            } else if (error.code === "auth/invalid-email") {
                errorEl.textContent = "El correo no es válido.";
            } else if (error.code === "auth/weak-password") {
                errorEl.textContent = "La contraseña es muy débil. Usa al menos 6 caracteres.";
            } else {
                errorEl.textContent = "No se pudo crear la cuenta. Intenta de nuevo.";
            }
        }

        btnRegistroEmail.disabled = false;
        btnRegistroEmail.textContent = "Crear cuenta";

    });
}


// ==========================================================
// REDIRECCIÓN POR ROL
// ==========================================================
// Después de autenticarse, revisa el rolEscolar del usuario en
// Firestore y redirige a su panel correspondiente. Si no tiene
// rol escolar (es participante normal), sigue el flujo estándar.

async function redirigirPorRol(datosUsuario) {

    const rol = datosUsuario.rolEscolar;
    const enInicio = /index\.html$|\/$/.test(window.location.pathname);

    if (!enInicio) return false; // no redirigir si no estamos en Inicio

    if (rol === "coordinador" && datosUsuario.colegioId) {
        window.location.href = "coordinador-panel.html";
        return true;
    }

    if (rol === "maestro") {
        window.location.href = "maestro-panel.html";
        return true;
    }

    // "alumno" y null/undefined siguen el flujo normal de la app
    return false;

}


// ==========================================================
// ESTADO DE AUTENTICACIÓN
// ==========================================================
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

        // Redirección por rol: coordinador y maestro van a sus paneles.
        // Si se redirige, no se sigue con el flujo normal.
        const redirigido = await redirigirPorRol(usuarioActual);
        if (redirigido) return;

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
