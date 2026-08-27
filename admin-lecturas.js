// ==========================================================
// PÁGINA "LECTURAS" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html: login
// propio, gate contra esAdmin(). Agrupa las lecturas de premios y la
// encuesta de géneros — Mejorar la lectura vive en admin-mejora.html,
// El Hilo del día / Ahorcado en admin-juegos.html, y las propuestas de
// "Ser el protagonista de la historia" en admin-propuestas.html
// (apartados propios).
//
// A propósito NO se carga aquí ningún archivo del motor de lectura
// real (motor.js, motor-mejorar.js, puntos.js, racha.js,
// desbloqueo.js) ni auth.js — así ninguna ruta de escritura de
// participación es siquiera alcanzable desde esta página. La "vista
// previa" del botón 👁️ (ver renderizarListaAdminLecturas) vive en
// admin.js — no aquí — porque también la usa admin-mejora.html.
// ==========================================================

const pantallaLoginAdmin = document.getElementById("pantallaLoginAdmin");
const pantallaSinPermiso = document.getElementById("pantallaSinPermiso");
const contenedorAdminPanel = document.getElementById("contenedorAdminPanel");

document.getElementById("btnLoginGoogleAdmin").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión. Intenta de nuevo.");
    });
});

document.getElementById("btnCerrarSesionAdminSinPermiso").addEventListener("click", () => auth.signOut());


// ==========================================================
// LOGIN Y VERIFICACIÓN DE PERMISO
// ==========================================================

auth.onAuthStateChanged(async (user) => {

    pantallaLoginAdmin.style.display = "none";
    pantallaSinPermiso.style.display = "none";
    contenedorAdminPanel.style.display = "none";

    if (!user) {
        pantallaLoginAdmin.style.display = "flex";
        return;
    }

    await cargarAdministradores();

    if (!esAdmin()) {
        pantallaSinPermiso.style.display = "flex";
        return;
    }

    contenedorAdminPanel.style.display = "block";
    inicializarPanelLecturas();

});


// ==========================================================
// ARRANQUE DE TODAS LAS SECCIONES (funciones ya existentes de
// admin.js, sin modificar — solo se llaman desde aquí)
// ==========================================================

async function inicializarPanelLecturas() {

    await Promise.all([cargarCatalogoLecturas(), cargarGenerosLectura()]);

    inicializarAdminLecturasPremios();
    inicializarAdminGenerosLectura();

}
