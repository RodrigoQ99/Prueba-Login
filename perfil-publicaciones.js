// ==========================================================
// "MIS PUBLICACIONES" (dentro de Perfil — ver perfil.html)
// ==========================================================
// Lecturas propias publicadas (ver protagonista.js y admin-lecturas.js
// — "Ser el protagonista de la historia"). "Vistas" es un contador
// directo en el propio documento de la lectura (ver motor.js /
// motor-mejorar.js, incrementado cada vez que alguien la abre).
// "Aprobados" NO tiene contador propio — se reutiliza lo que ya
// existe: progreso/{...} para lecturas de premios (mismo criterio que
// usa desbloqueo.js: puntosGanados > 0), y
// usuarios/{uid}.mejoraCompletadas para las de Mejorar la lectura
// (mismo campo que ya escribe motor-mejorar.js al aprobar).
// ==========================================================

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

auth.onAuthStateChanged((user) => {
    if (user) cargarMisPublicaciones(user.uid);
});
