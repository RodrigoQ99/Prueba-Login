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
