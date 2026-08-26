// ==========================================================
// INICIO — cuadrícula de accesos (ver Etapa 18)
// ==========================================================
// Ya no muestra el catálogo de lecturas (eso se movió a
// lecturas-premiadas.html / sugerencias.html, ver Etapa 17) — esta
// pantalla es solo la cuadrícula de accesos a todo lo que antes vivía
// en el menú ☰ (que aquí ya no aparece).
// ==========================================================

const btnQueEsEsto = document.getElementById("btnQueEsEsto");
if (btnQueEsEsto) {
    btnQueEsEsto.addEventListener("click", () => mostrarModalInfo());
}

const btnCerrarSesionInicio = document.getElementById("btnCerrarSesionInicio");
if (btnCerrarSesionInicio) {
    btnCerrarSesionInicio.addEventListener("click", () => auth.signOut());
}

// Racha 🔥 en la esquina del cuadro "Perfil" — el único otro lugar
// donde se muestra la racha además de la propia pantalla de Perfil
// (ver racha.js, calcularRachaVigente, y Etapa 19).
async function cargarBadgeRachaInicio(user) {

    const badge = document.getElementById("badgeRachaInicio");
    if (!badge) return;

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        const datos = doc.exists ? doc.data() : {};
        const racha = typeof calcularRachaVigente === "function"
            ? calcularRachaVigente(datos)
            : (datos.rachaActual || 0);
        badge.textContent = `🔥 ${racha}`;
    } catch (error) {
        console.error("No se pudo cargar la racha:", error);
    }

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {

    const user = auth.currentUser;
    if (btnQueEsEsto) btnQueEsEsto.style.display = "flex";
    if (user) cargarBadgeRachaInicio(user);

}
