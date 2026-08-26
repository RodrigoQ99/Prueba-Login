// ==========================================================
// MENÚ SUPERIOR (☰ — perfil, progreso, ranking)
// ==========================================================
// Aparece en todas las páginas EXCEPTO index.html (Inicio, ver
// inicio.js) — ahí la navegación se hace directo desde la cuadrícula
// de cuadros, sin este menú (ver Etapa 18).
//
// Requiere que la página ya haya cargado: firebase-init.js, lecturas.js,
// y tener en el HTML los elementos con los IDs usados abajo.
//
// La racha 🔥 YA NO se muestra aquí — vive únicamente en perfil.html y
// en el cuadro "Perfil" de Inicio (ver racha.js, calcularRachaVigente).
// ==========================================================

const menuUsuario = document.getElementById("menuUsuario");
const btnMenuToggle = document.getElementById("btnMenuToggle");
const panelMenu = document.getElementById("panelMenu");
const menuCompletadas = document.getElementById("menuCompletadas");
const menuPendientes = document.getElementById("menuPendientes");
const btnCerrarSesionMenu = document.getElementById("btnCerrarSesionMenu");

if (btnMenuToggle) {
    btnMenuToggle.addEventListener("click", () => {
        const abierto = panelMenu.style.display === "block";
        panelMenu.style.display = abierto ? "none" : "block";
    });

    // Cerrar el menú si se hace clic afuera de él
    document.addEventListener("click", (e) => {
        if (!menuUsuario.contains(e.target)) {
            panelMenu.style.display = "none";
        }
    });
}

if (btnCerrarSesionMenu) {
    btnCerrarSesionMenu.addEventListener("click", () => {
        auth.signOut();
    });
}

async function cargarDatosMenu(user) {
    menuUsuario.style.display = "block";

    try {

        const snapshot = await db.collection("progreso").where("usuarioId", "==", user.uid).get();

        const idsCompletados = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.puntosGanados > 0) {
                idsCompletados.add(data.lecturaId);
            }
        });

        await cargarCatalogoLecturas();

        // Solo cuenta lecturas que TODAVÍA existen en el catálogo — si una
        // se borró (o cambió de ID), su progreso viejo no debe seguir
        // inflando "completadas" ni "pendientes de X" para siempre.
        const idsCatalogoActual = new Set(CATALOGO_LECTURAS.map(l => l.id));
        const totalLecturas = CATALOGO_LECTURAS.length;
        const completadas = [...idsCompletados].filter(id => idsCatalogoActual.has(id)).length;
        const pendientes = Math.max(totalLecturas - completadas, 0);

        menuCompletadas.textContent = completadas;
        menuPendientes.textContent = `${pendientes} de ${totalLecturas}`;

    } catch (error) {
        console.error("Error al cargar el progreso del menú:", error);
    }
}

// Firebase auth ya inicializado en firebase-init.js
auth.onAuthStateChanged((user) => {
    if (user) {
        cargarDatosMenu(user);
    } else if (menuUsuario) {
        menuUsuario.style.display = "none";
    }
});
