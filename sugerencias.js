// ==========================================================
// SUGERENCIAS (dentro de "Lecturas" — ver lecturas.html)
// ==========================================================
// Lecturas de OTROS USUARIOS ("Ser el protagonista de la historia", ver
// protagonista.js) publicadas por el admin, que coinciden con los
// géneros de interés marcados en el perfil.
//
// Etapa 32 — dos filtros que antes NO existían y causaban duplicados:
// 1. Solo lecturas con "autorUid" (vinieron de una propuesta de
//    usuario) — una lectura escrita por el admin o generada con IA
//    puede tener género pero NUNCA debe aparecer aquí como "sugerida".
// 2. Nunca una lectura que el usuario YA tiene desbloqueada por código
//    (usuarios/{uid}.lecturasDesbloqueadas, ver lecturas-premiadas.js)
//    — si ya le llegó por código, vive solo en "Lecturas premiadas",
//    compitiendo contra el tiempo; no debe duplicarse aquí también.
//
// Se abren en lectura-libre.html: sin cronómetro, sin puntos, a su
// propio ritmo.
// ==========================================================

async function cargarSugerenciasGenero(user) {

    const contenedor = document.getElementById("listaSugerenciasGenero");
    if (!contenedor) return;

    let generosUsuario = [];
    let lecturasDesbloqueadas = [];

    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        const datosUsuario = usuarioDoc.exists ? usuarioDoc.data() : {};
        generosUsuario = datosUsuario.generosLectura || [];
        lecturasDesbloqueadas = datosUsuario.lecturasDesbloqueadas || [];
    } catch (error) {
        console.error("No se pudieron cargar tus géneros de interés:", error);
    }

    if (generosUsuario.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>Marca tus géneros favoritos " +
            "en \"Perfil\" para ver sugerencias aquí.</p>";
        return;
    }

    // Firestore solo permite hasta 10 valores en un "in" — si el usuario
    // marcó más géneros que eso, se usan los primeros 10.
    const generosConsulta = generosUsuario.slice(0, 10);

    let lecturasSugeridas = [];

    try {
        const snapshot = await db.collection("lecturas")
            .where("genero", "in", generosConsulta)
            .get();
        lecturasSugeridas = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            // Filtro 1: solo propuestas de otros usuarios, nunca lo
            // escrito por el admin o generado con IA.
            .filter(lectura => !!lectura.autorUid)
            // Filtro 2: nunca una que ya tenga desbloqueada por código.
            .filter(lectura => !lecturasDesbloqueadas.includes(lectura.id));
    } catch (error) {
        console.error("No se pudieron cargar las sugerencias:", error);
        contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar las sugerencias.</p>";
        return;
    }

    if (lecturasSugeridas.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>Todavía no hay lecturas de tus géneros favoritos. ¡Vuelve pronto!</p>";
        return;
    }

    const porGenero = {};
    lecturasSugeridas.forEach(lectura => {
        if (!porGenero[lectura.genero]) porGenero[lectura.genero] = [];
        porGenero[lectura.genero].push(lectura);
    });

    contenedor.innerHTML = Object.keys(porGenero).sort().map(genero => `
        <details class="grupoNivelAdmin">
            <summary>${genero} (${porGenero[genero].length})</summary>
            <div class="listaAdminLecturasNivel">
                ${porGenero[genero].map(lectura => `
                    <a href="lectura-libre.html?id=${encodeURIComponent(lectura.id)}" class="tarjetaLectura">
                        <div class="tarjetaInfo">
                            <p class="tarjetaTitulo">${lectura.titulo}</p>
                            <p class="tarjetaNivel">Sugerida por: ${lectura.autorNombre || "un usuario"}</p>
                        </div>
                        <span class="tarjetaEstado">Leer →</span>
                    </a>
                `).join("")}
            </div>
        </details>
    `).join("");

}

// ==========================================================
// "MIS LECTURAS SUGERIDAS" (borrar las propias)
// ==========================================================
// Lecturas que ESTE usuario propuso ("Ser el protagonista de la
// historia", ver protagonista.js) y el admin ya publicó — tienen
// autorUid == su uid. Puede borrar una MIENTRAS NADIE la haya leído
// todavía: si ya hay "progreso" en ella, borrarla desde aquí dejaría
// puntos "fantasma" en el ranking, porque la limpieza de puntos
// (revertirPuntosDeLectura, ver puntos.js) solo la corre el admin al
// eliminarla desde su panel. En ese caso se le pide que hable con el
// admin. La regla de Firestore (allow delete si autorUid == uid)
// respalda esto del lado del servidor.

async function cargarMisLecturasSugeridas(user) {

    const cont = document.getElementById("misLecturasSugeridas");
    if (!cont) return;

    let mias = [];

    try {
        const snapshot = await db.collection("lecturas")
            .where("autorUid", "==", user.uid)
            .get();
        mias = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudieron cargar tus lecturas sugeridas:", error);
        cont.innerHTML = "";
        return;
    }

    if (mias.length === 0) {
        cont.innerHTML = "";
        return;
    }

    cont.innerHTML = `
        <details class="grupoNivelAdmin" open>
            <summary>✍️ Mis lecturas sugeridas (${mias.length})</summary>
            <p style="font-size:13px; color:var(--texto-suave); margin:10px 0;">
                Lecturas que propusiste y el administrador publicó. Puedes borrar una mientras nadie la haya
                leído todavía; si ya la leyó alguien, pídele al administrador que la quite.
            </p>
            <div class="listaAdminLecturasNivel">
                ${mias.map(lectura => `
                    <div class="tarjetaLectura" style="cursor:default;">
                        <div class="tarjetaInfo">
                            <p class="tarjetaTitulo">${lectura.titulo}</p>
                            <p class="tarjetaNivel">${lectura.genero || "sin género"}</p>
                        </div>
                        <button type="button" class="botonAdminChico botonPeligro" data-borrar-sugerida="${lectura.id}">🗑️ Borrar</button>
                    </div>
                `).join("")}
            </div>
        </details>
    `;

    cont.querySelectorAll("[data-borrar-sugerida]").forEach(btn => {
        btn.addEventListener("click", () => borrarMiLecturaSugerida(btn.dataset.borrarSugerida, mias, user));
    });

}

async function borrarMiLecturaSugerida(lecturaId, mias, user) {

    const lectura = mias.find(l => l.id === lecturaId);
    const titulo = lectura ? lectura.titulo : lecturaId;

    let hayProgreso = false;

    try {
        const snapshot = await db.collection("progreso")
            .where("lecturaId", "==", lecturaId)
            .limit(1)
            .get();
        hayProgreso = !snapshot.empty;
    } catch (error) {
        console.error("No se pudo revisar si alguien ya leyó esta lectura:", error);
        alert("No se pudo comprobar el estado de la lectura. Intenta de nuevo más tarde.");
        return;
    }

    if (hayProgreso) {
        alert(`"${titulo}" ya la leyó al menos una persona. Pídele al administrador que la elimine, así también se limpian los puntos que haya repartido.`);
        return;
    }

    if (!confirm(`¿Borrar tu lectura sugerida "${titulo}"? No se puede deshacer.`)) return;

    try {
        await db.collection("lecturas").doc(lecturaId).delete();
    } catch (error) {
        console.error("No se pudo borrar la lectura sugerida:", error);
        alert("No se pudo borrar la lectura.");
        return;
    }

    // Refrescar el catálogo en memoria y las dos listas de esta página.
    if (typeof cargarCatalogoLecturas === "function") {
        await cargarCatalogoLecturas(true);
    }
    await cargarMisLecturasSugeridas(user);
    cargarSugerenciasGenero(user);

}


auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("listaSugerenciasGenero").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para ver sugerencias.</p>";
        const contMias = document.getElementById("misLecturasSugeridas");
        if (contMias) contMias.innerHTML = "";
        return;
    }

    cargarMisLecturasSugeridas(user);
    cargarSugerenciasGenero(user);

});
