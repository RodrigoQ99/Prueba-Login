// ==========================================================
// PÁGINA "BIBLIOTECA" (dentro del panel de administrador) — Etapa 32
// ==========================================================
// Mismo patrón de acceso independiente que admin-estadisticas.html:
// login propio, gate contra esAdmin(). Muestra TODAS las lecturas de la
// app (catálogo de premios + Mejorar la lectura), cada una con su
// ORIGEN: escrita por el administrador, generada con IA, o sugerida por
// un usuario (propuesta publicada) — ver el campo "origen", que ahora
// guarda cada formulario de creación (abrirFormularioLectura/
// abrirFormularioMejora, ver admin.js).
//
// Compatibilidad con lecturas de ANTES de que existiera "origen": si no
// lo tienen mostrar/etiqueta cae en "admin" (o "usuario" si sí tiene
// autorUid, ver etiquetaOrigen) — nunca se asume "ia" por defecto, para
// no atribuirle a la IA algo que no generó.
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
    cargarBiblioteca();

});


// ==========================================================
// ORIGEN — misma lógica de "cuál es" y "cómo se muestra"
// ==========================================================

/** "admin" | "ia" | "usuario" — nunca falla, siempre devuelve algo. */
function claveOrigenBiblioteca(lectura) {
    return lectura.origen || (lectura.autorUid ? "usuario" : "admin");
}

/** Texto para "Título — escrita por X". */
function etiquetaOrigenBiblioteca(lectura) {
    const origen = claveOrigenBiblioteca(lectura);
    if (origen === "ia") return "IA";
    if (origen === "usuario") return lectura.autorNombre || "un usuario";
    return "administrador";
}


// ==========================================================
// CARGA Y FILTRADO
// ==========================================================

let _todasLasLecturasBiblioteca = [];

async function cargarBiblioteca() {

    const contPremios = document.getElementById("listaBibliotecaPremios");
    const contMejora = document.getElementById("listaBibliotecaMejora");

    contPremios.innerHTML = "<p style='text-align:center;'>Cargando...</p>";
    contMejora.innerHTML = "";

    try {
        await Promise.all([cargarCatalogoLecturas(), cargarCatalogoMejora(), cargarRangoEdades()]);
    } catch (error) {
        console.error("No se pudo cargar la biblioteca:", error);
        contPremios.innerHTML = "<p style='text-align:center;'>No se pudo cargar la biblioteca.</p>";
        return;
    }

    const mejoraLista = Object.values(CATALOGO_MEJORA).flat();

    _todasLasLecturasBiblioteca = [
        ...CATALOGO_LECTURAS.map(l => ({ ...l, _catalogo: "premios" })),
        ...mejoraLista.map(l => ({ ...l, _catalogo: "mejora" }))
    ];

    const conteos = { admin: 0, ia: 0, usuario: 0 };
    _todasLasLecturasBiblioteca.forEach(l => { conteos[claveOrigenBiblioteca(l)]++; });

    document.getElementById("resumenBiblioteca").innerHTML = `
        <div class="tarjetaResumen"><strong>${_todasLasLecturasBiblioteca.length}</strong><span>Lecturas en total</span></div>
        <div class="tarjetaResumen"><strong>${conteos.admin}</strong><span>Escritas por administrador</span></div>
        <div class="tarjetaResumen"><strong>${conteos.ia}</strong><span>Generadas con IA</span></div>
        <div class="tarjetaResumen"><strong>${conteos.usuario}</strong><span>Sugeridas por usuarios</span></div>
    `;

    renderizarBiblioteca();

}

function renderizarBiblioteca() {

    const busqueda = document.getElementById("campoBuscarBiblioteca").value.trim().toLowerCase();
    const filtroOrigen = document.getElementById("filtroOrigenBiblioteca").value;

    function coincide(lectura) {
        if (filtroOrigen && claveOrigenBiblioteca(lectura) !== filtroOrigen) return false;
        if (busqueda && !lectura.titulo.toLowerCase().includes(busqueda)) return false;
        return true;
    }

    function tarjeta(lectura) {
        return `
            <div class="tarjetaLectura" style="cursor:default;">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${lectura.titulo} — escrita por ${etiquetaOrigenBiblioteca(lectura)}</p>
                    <p class="tarjetaNivel">
                        ${lectura._catalogo === "premios"
                            ? (NOMBRE_NIVEL[lectura.nivel] || lectura.nivel)
                            : etiquetaEdad(lectura.edad)}
                    </p>
                </div>
            </div>
        `;
    }

    const premios = _todasLasLecturasBiblioteca.filter(l => l._catalogo === "premios" && coincide(l));
    const mejora = _todasLasLecturasBiblioteca.filter(l => l._catalogo === "mejora" && coincide(l));

    document.getElementById("listaBibliotecaPremios").innerHTML = premios.length > 0
        ? premios.map(tarjeta).join("")
        : "<p style='text-align:center; color:var(--texto-suave);'>Ninguna lectura coincide.</p>";

    document.getElementById("listaBibliotecaMejora").innerHTML = mejora.length > 0
        ? mejora.map(tarjeta).join("")
        : "<p style='text-align:center; color:var(--texto-suave);'>Ninguna lectura coincide.</p>";

}

document.getElementById("campoBuscarBiblioteca").addEventListener("input", renderizarBiblioteca);
document.getElementById("filtroOrigenBiblioteca").addEventListener("change", renderizarBiblioteca);
