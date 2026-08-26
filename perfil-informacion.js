// ==========================================================
// INFORMACIÓN (dentro de Perfil — ver perfil.html)
// ==========================================================
// Permite cambiar el nombre y elegir un alias, y decidir cuál de
// los dos se muestra en el ranking. El alias no se puede repetir
// entre cuentas (comparación exacta, con tildes y mayúsculas).
//
// La edad ya NO se edita aquí: se calculó sola a partir de la fecha de
// nacimiento que dio al registrarse (ver auth.js) — solo se muestra.
// "edadPerfil" es un dato informativo, sin relación con "edadActual"
// (la edad que navega Mejorar la lectura).
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

    document.getElementById("campoEdadPerfilTexto").textContent =
        typeof datos.edadPerfil === "number" ? `${datos.edadPerfil} años` : "Sin dato";
    document.getElementById("campoPaisPerfil").value = datos.pais || "";
    document.getElementById("campoLenguaMaternaPerfil").value = datos.lenguaMaterna || "";

    await cargarGenerosLectura();
    renderizarCheckboxesGeneros(document.getElementById("contenedorGenerosPerfil"), datos.generosLectura || []);

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

        // La edad NO se manda aquí a propósito: ya no es editable desde
        // esta pantalla, así que el valor guardado en el registro se
        // conserva tal cual.
        const cambios = {
            nombre: nombre,
            mostrarAlias: mostrarAlias,
            pais: document.getElementById("campoPaisPerfil").value.trim(),
            lenguaMaterna: document.getElementById("campoLenguaMaternaPerfil").value.trim(),
            generosLectura: leerGenerosSeleccionados(document.getElementById("contenedorGenerosPerfil"))
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

auth.onAuthStateChanged((user) => {
    if (user) cargarPerfil();
});
