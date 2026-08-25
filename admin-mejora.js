// ==========================================================
// PÁGINA "MEJORAR LA LECTURA" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html: login
// propio, gate contra esAdmin(). Administra el catálogo de "Mejorar la
// lectura" por edad (agregar/editar/eliminar y el rango de edades).
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
    inicializarPanelMejora();

});

async function inicializarPanelMejora() {

    await Promise.all([cargarCatalogoMejora(), cargarRangoEdades()]);

    const select = document.getElementById("selectEdadAdminMejora");

    const opciones = [];
    for (let e = RANGO_EDADES.min; e <= RANGO_EDADES.max; e++) {
        opciones.push(`<option value="${e}">${etiquetaEdad(e)}</option>`);
    }
    opciones.push(`<option value="${grupoMasDelTope()}">${etiquetaEdad(grupoMasDelTope())}</option>`);
    select.innerHTML = opciones.join("");

    select.addEventListener("change", () => {
        inicializarAdminMejora(Number(select.value));
    });

    inicializarAdminMejora(RANGO_EDADES.min);

}
