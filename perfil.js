// ==========================================================
// PERFIL (pantalla de inicio del apartado — 3 cuadros)
// ==========================================================
// Igual que Inicio/Lecturas: esta pantalla es solo la cuadrícula de
// accesos a Información, Mis publicaciones y Ser el protagonista, cada
// una en su propia página. La racha 🔥 se muestra aquí (además de en
// el cuadro "Perfil" de Inicio) — en ningún otro lado.
// ==========================================================

async function cargarBadgeRachaPerfil(user) {

    const badge = document.getElementById("badgeRachaPerfil");
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
    if (user) cargarBadgeRachaPerfil(user);
}
