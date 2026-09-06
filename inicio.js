// ==========================================================
// INICIO — cuadrícula de accesos (ver Etapa 18)
// ==========================================================
// Ya no muestra el catálogo de lecturas (eso se movió a
// lecturas-premiadas.html / sugerencias.html, ver Etapa 17) — esta
// pantalla es solo la cuadrícula de accesos a todo lo que antes vivía
// en el menú ☰ (que aquí ya no aparece). "Cerrar sesión" tampoco
// aparece aquí — vive solo en Perfil (ver perfil.js).
// ==========================================================

const btnQueEsEsto = document.getElementById("btnQueEsEsto");
if (btnQueEsEsto) {
    btnQueEsEsto.addEventListener("click", () => mostrarModalInfo());
}


// ==========================================================
// FILTRO "Individuales / Grupales" (Etapa 34)
// ==========================================================
// Todo lo que existe hoy (Perfil, Lecturas, Mejorar la lectura, Juegos,
// Ranking, Premios) es individual — ver data-tipo-actividad="individual"
// en cada cuadro de index.html. Las actividades grupales todavía no
// existen; esto solo deja la estructura lista para cuando se agreguen
// (bastará con marcar sus cuadros con data-tipo-actividad="grupal").

function activarFiltroTipoActividad() {

    const btnIndividual = document.getElementById("btnFiltroIndividual");
    const btnGrupal = document.getElementById("btnFiltroGrupal");
    const cuadros = document.querySelectorAll(".gridBotonesCuadrados [data-tipo-actividad]");
    const mensajeVacio = document.getElementById("mensajeSinActividadesGrupales");

    if (!btnIndividual || !btnGrupal) return;

    function aplicarFiltro(tipo) {

        btnIndividual.style.background = tipo === "individual" ? "var(--azul)" : "";
        btnIndividual.style.color = tipo === "individual" ? "white" : "";
        btnGrupal.style.background = tipo === "grupal" ? "var(--azul)" : "";
        btnGrupal.style.color = tipo === "grupal" ? "white" : "";

        let hayVisibles = false;
        cuadros.forEach(cuadro => {
            const visible = cuadro.dataset.tipoActividad === tipo;
            cuadro.style.display = visible ? "" : "none";
            if (visible) hayVisibles = true;
        });

        if (mensajeVacio) mensajeVacio.style.display = hayVisibles ? "none" : "block";

    }

    btnIndividual.addEventListener("click", () => aplicarFiltro("individual"));
    btnGrupal.addEventListener("click", () => aplicarFiltro("grupal"));

    aplicarFiltro("individual");

}

activarFiltroTipoActividad();

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
async function iniciarLectura() {

    const user = auth.currentUser;
    if (btnQueEsEsto) btnQueEsEsto.style.display = "flex";

    if (!user) return;

    // Cargar datos del usuario una sola vez para la racha y el ajolote.
    let datos = {};
    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        datos = doc.exists ? doc.data() : {};
    } catch (error) {
        console.error("No se pudieron cargar los datos del usuario:", error);
    }

    // Badge de racha 🔥
    const badge = document.getElementById("badgeRachaInicio");
    if (badge) {
        const racha = typeof calcularRachaVigente === "function"
            ? calcularRachaVigente(datos)
            : (datos.rachaActual || 0);
        badge.textContent = `🔥 ${racha}`;
    }

    // Saludo del ajolote: con nombre y datos contextuales.
    if (typeof mostrarSaludoAjoloteConSesion === "function") {
        mostrarSaludoAjoloteConSesion(datos);
    }

}
