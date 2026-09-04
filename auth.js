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

// El selector de fecha de nacimiento no deja elegir una fecha futura.
const campoFechaNacimiento = document.getElementById("inputFechaNacimiento");
if (campoFechaNacimiento) {
    campoFechaNacimiento.max = new Date().toISOString().split("T")[0];
}

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

// Mostrar/ocultar campos de colegio y grado según el tipo elegido
tipoUsuarioInputs.forEach(input => {
    input.addEventListener("change", () => {
        camposEstudiante.style.display =
            document.querySelector('input[name="tipoUsuario"]:checked').value === "estudiante"
                ? "block"
                : "none";
    });
});

// Grado: SIEMPRE uno de LISTA_GRADOS (ver grados.js) — nunca texto
// libre, para que "4to bachillerato" y "4to Bach" no cuenten como
// grados distintos al agrupar el ranking de colegios (ver puntos.js).
const selectGradoRegistro = document.getElementById("inputGrado");
if (selectGradoRegistro && typeof renderizarSelectorGrado === "function") {
    renderizarSelectorGrado(selectGradoRegistro, "");
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
        // Ya está registrado: entra directo a la lectura, sin pedir nada más
        usuarioActual = { id: user.uid, ...doc.data() };
        pantallaLogin.style.display = "none";
        pantallaRegistro.style.display = "none";
        appContenido.style.display = "block";
        if (typeof iniciarLectura === "function") iniciarLectura();
    } else {
        // Primera vez: mostrar el formulario DE UNA VEZ y llenar cada
        // parte conforme carga — nada de esperar a que todo esté listo
        // antes de mostrar algo.
        pantallaLogin.style.display = "none";
        pantallaRegistro.style.display = "flex";
        appContenido.style.display = "none";

        // País: lista fija local (paises.js), instantáneo — se pinta
        // primero, sin esperar a nada de la red.
        const selectPais = document.getElementById("inputPais");
        if (selectPais && typeof renderizarSelectorPais === "function") {
            renderizarSelectorPais(selectPais, "");
            // La lengua materna aparece solo al elegir país, y se
            // pre-llena con su idioma más asociado (ver IDIOMA_POR_PAIS
            // en paises.js) — el usuario lo puede cambiar o escribir un
            // dialecto si no coincide.
            if (typeof activarAutocompletadoIdioma === "function") {
                activarAutocompletadoIdioma(
                    selectPais,
                    document.getElementById("inputLenguaMaterna"),
                    document.getElementById("grupoLenguaMaterna")
                );
            }
        }

        // Géneros de lectura: se cargan aparte, con un "Cargando…"
        // mientras tanto. El resto del formulario ya se puede llenar.
        const contenedorGeneros = document.getElementById("contenedorGenerosRegistro");
        if (contenedorGeneros) {
            contenedorGeneros.innerHTML =
                "<p style='color:#888; font-size:13px; margin:0;'>Cargando géneros…</p>";
            cargarGenerosLectura()
                .then(() => renderizarCheckboxesGeneros(contenedorGeneros, []))
                .catch(error => {
                    console.error("No se pudieron cargar los géneros de lectura:", error);
                    contenedorGeneros.innerHTML =
                        "<p style='color:#c0392b; font-size:13px; margin:0;'>No se pudieron cargar los géneros ahora. Puedes continuar y elegirlos después desde tu perfil.</p>";
                });
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
    // nombres deliberadamente distintos para que no se crucen. Ya no se
    // pide como número directo: se calcula sola a partir de la fecha de
    // nacimiento, para no depender de que la escriban bien a mano.
    const fechaNacimientoInput = document.getElementById("inputFechaNacimiento").value;
    const contenedorGeneros = document.getElementById("contenedorGenerosRegistro");
    const paisElegido = document.getElementById("inputPais").value;

    if (!paisElegido) {
        alert("Selecciona tu país.");
        return;
    }

    // Género (Etapa 36) — opcional, igual que la edad: quien no lo
    // marque ahora puede completarlo después desde Perfil (una sola
    // vez, ver perfil-informacion.js) — nunca se le exige aquí.
    const generoElegidoRegistro = document.querySelector('input[name="generoRegistro"]:checked');

    const datosUsuario = {
        nombre: user.displayName || "",
        email: user.email || "",
        tipo: tipo,
        puntosTotales: 0,
        fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
        fechaNacimiento: fechaNacimientoInput || null,
        edadPerfil: fechaNacimientoInput ? calcularEdadDesdeFecha(fechaNacimientoInput) : null,
        genero: generoElegidoRegistro ? generoElegidoRegistro.value : null,
        pais: paisElegido,
        lenguaMaterna: (typeof capitalizarLengua === "function")
            ? capitalizarLengua(document.getElementById("inputLenguaMaterna").value)
            : document.getElementById("inputLenguaMaterna").value.trim(),
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
