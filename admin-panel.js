// ==========================================================
// PÁGINA "PANEL DE ADMINISTRADOR" (INICIO)
// ==========================================================
// Página independiente (no comparte auth.js ni menu.js con el sitio de
// participantes) — mismo patrón que premiador.js: login propio,
// autorización contra esAdmin() (ver admin-comun.js). Desde aquí solo
// se navega a las demás secciones (admin-premios.html, admin-lecturas.html,
// admin-mejora.html, admin-juegos.html, admin-estadisticas.html, cada
// una con su propio login) y se administra la lista de administradores.
// "Cerrar sesión" vive SOLO aquí — las demás páginas no lo repiten.
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
document.getElementById("btnCerrarSesionAdmin").addEventListener("click", () => auth.signOut());


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

});

document.getElementById("btnAbrirAdministradores").addEventListener("click", () => {
    abrirFormularioAdministradores();
});
