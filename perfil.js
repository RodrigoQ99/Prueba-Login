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

    // "edadPerfil" es solo un dato informativo del perfil — no tiene
    // relación con "edadActual" (la edad que navega Mejorar la lectura).
    document.getElementById("campoEdadPerfil").value = datos.edadPerfil ?? "";
    document.getElementById("campoPaisPerfil").value = datos.pais || "";
    document.getElementById("campoLenguaMaternaPerfil").value = datos.lenguaMaterna || "";

    await cargarGenerosLectura();
    renderizarCheckboxesGeneros(document.getElementById("contenedorGenerosPerfil"), datos.generosLectura || []);

    if (typeof cargarMisPublicaciones === "function") cargarMisPublicaciones(user.uid);
    if (typeof inicializarProtagonista === "function") inicializarProtagonista();

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

        const edadPerfilInput = document.getElementById("campoEdadPerfil").value;

        const cambios = {
            nombre: nombre,
            mostrarAlias: mostrarAlias,
            edadPerfil: edadPerfilInput ? Number(edadPerfilInput) : null,
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

// ==========================================================
// "MIS PUBLICACIONES" (lecturas propias publicadas, ver protagonista.js
// y admin-panel.js — "Ser el protagonista de la historia")
// ==========================================================
// "Vistas" es un contador directo en el propio documento de la lectura
// (ver motor.js / motor-mejorar.js, incrementado cada vez que alguien
// la abre). "Aprobados" NO tiene contador propio — se reutiliza lo que
// ya existe: progreso/{...} para lecturas de premios (mismo criterio
// que usa desbloqueo.js: puntosGanados > 0), y
// usuarios/{uid}.mejoraCompletadas para las de Mejorar la lectura
// (mismo campo que ya escribe motor-mejorar.js al aprobar).

async function contarAprobadosLectura(lecturaId) {
    // Un solo "where" de igualdad (lecturaId) + filtro de puntosGanados
    // EN MEMORIA, no en la consulta — mismo patrón que
    // elegirDestinoTrasCanjear() en desbloqueo.js, para no necesitar un
    // índice compuesto en Firestore.
    const snapshot = await db.collection("progreso")
        .where("lecturaId", "==", lecturaId)
        .get();
    const aprobados = snapshot.docs.filter(doc => doc.data().puntosGanados > 0);
    return new Set(aprobados.map(doc => doc.data().usuarioId)).size;
}

async function contarAprobadosMejora(lecturaId) {
    const snapshot = await db.collection("usuarios")
        .where("mejoraCompletadas", "array-contains", lecturaId)
        .get();
    return snapshot.size;
}

async function cargarMisPublicaciones(uid) {

    const cont = document.getElementById("listaMisPublicaciones");
    if (!cont) return;

    cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>Cargando...</p>";

    try {

        const [snapPremios, snapMejora] = await Promise.all([
            db.collection("lecturas").where("autorUid", "==", uid).get(),
            db.collection("mejoraLecturas").where("autorUid", "==", uid).get()
        ]);

        const publicaciones = [
            ...snapPremios.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: "premios" })),
            ...snapMejora.docs.map(doc => ({ id: doc.id, ...doc.data(), tipo: "mejora" }))
        ];

        if (publicaciones.length === 0) {
            cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>Todavía no tienes lecturas publicadas.</p>";
            return;
        }

        const aprobados = await Promise.all(publicaciones.map(p =>
            p.tipo === "premios" ? contarAprobadosLectura(p.id) : contarAprobadosMejora(p.id)
        ));

        cont.innerHTML = publicaciones.map((p, i) => `
            <div class="tarjetaLectura" style="cursor:default;">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${p.titulo}</p>
                    <p class="tarjetaNivel">${p.tipo === "premios" ? "Lectura de premios" : "Mejorar la lectura"}</p>
                </div>
                <span class="tarjetaEstado">${p.vistas || 0} vistas · ${aprobados[i]} aprobados</span>
            </div>
        `).join("");

    } catch (error) {
        console.error("No se pudieron cargar tus publicaciones:", error);
        cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar tus publicaciones.</p>";
    }

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarPerfil();
}
