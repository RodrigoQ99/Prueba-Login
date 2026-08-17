// ==========================================================
// EDITAR PERFIL
// ==========================================================
// Permite cambiar el nombre y elegir un alias, y decidir cuál de
// los dos se muestra en el ranking. El alias no se puede repetir
// entre cuentas (comparación exacta, con tildes y mayúsculas).
// ==========================================================

async function cargarPerfil() {

    const user = auth.currentUser;
    if (!user) return;

    let datos = {};

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        datos = doc.exists ? doc.data() : {};
    } catch (error) {
        console.error("No se pudo cargar tu perfil:", error);
    }

    document.getElementById("campoNombrePerfil").value = datos.nombre || user.displayName || "";
    document.getElementById("campoAliasPerfil").value = datos.alias || "";

    const valorMostrar = (datos.mostrarAlias && datos.alias) ? "alias" : "nombre";
    const radio = document.querySelector(`input[name="mostrarComo"][value="${valorMostrar}"]`);
    if (radio) radio.checked = true;

}

document.getElementById("btnGuardarPerfil").addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return;

    const nombre = document.getElementById("campoNombrePerfil").value.trim();
    const alias = document.getElementById("campoAliasPerfil").value.trim();
    const mostrarAlias = document.querySelector('input[name="mostrarComo"]:checked').value === "alias";

    const errorEl = document.getElementById("errorPerfil");
    const mensajeEl = document.getElementById("mensajePerfil");
    const btn = document.getElementById("btnGuardarPerfil");

    errorEl.style.display = "none";
    mensajeEl.textContent = "";

    if (!nombre) {
        errorEl.textContent = "El nombre no puede quedar vacío.";
        errorEl.style.display = "block";
        return;
    }

    if (mostrarAlias && !alias) {
        errorEl.textContent = "Escribe un alias, o elige mostrar tu nombre en su lugar.";
        errorEl.style.display = "block";
        return;
    }

    btn.disabled = true;

    try {

        // El alias no se puede repetir entre cuentas (comparación exacta,
        // caracter por caracter, incluyendo tildes y mayúsculas).
        if (alias) {

            const choque = await db.collection("usuarios")
                .where("alias", "==", alias)
                .get();

            const ocupadoPorOtro = choque.docs.some(doc => doc.id !== user.uid);

            if (ocupadoPorOtro) {
                errorEl.textContent = "Ese alias ya está ocupado, intenta con otro.";
                errorEl.style.display = "block";
                btn.disabled = false;
                return;
            }

        }

        const cambios = {
            nombre: nombre,
            mostrarAlias: mostrarAlias
        };

        cambios.alias = alias ? alias : firebase.firestore.FieldValue.delete();

        await db.collection("usuarios").doc(user.uid).update(cambios);

        // Refleja el cambio de inmediato en el ranking personal.
        if (typeof actualizarRankingPersonal === "function") {
            await actualizarRankingPersonal();
        }

        mensajeEl.textContent = "¡Perfil actualizado!";

    } catch (error) {
        console.error("No se pudo guardar tu perfil:", error);
        mensajeEl.textContent = "Ocurrió un error al guardar. Intenta de nuevo.";
    }

    btn.disabled = false;

});

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarPerfil();
}
