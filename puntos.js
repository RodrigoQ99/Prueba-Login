// ==========================================================
// PUNTOS Y PROGRESO
// ==========================================================
// Aquí defines los niveles de lectura y cuánto valen.
// Cuando agregues más lecturas, cada una debe declarar su propio
// ID y NIVEL (ver script.js) y este archivo se encarga del resto.
// ==========================================================

const PUNTOS_POR_NIVEL = {
    facil: 10,
    intermedio: 25,
    dificil: 50
};

const PREMIO_POR_NIVEL = {
    facil: "Premio simple",
    intermedio: "Premio de mayor nivel",
    dificil: "Mejor premio"
};

/**
 * Guarda el resultado de una lectura completada y suma los puntos
 * correspondientes al usuario actual.
 *
 * @param {string} lecturaId - identificador único de la lectura (ver script.js)
 * @param {string} nivel - "facil" | "intermedio" | "dificil"
 * @param {number} estrellas - cuántas respuestas correctas obtuvo (0-3)
 */
async function guardarProgreso(lecturaId, nivel, estrellas) {
    const user = auth.currentUser;
    if (!user) return;

    // Solo se otorgan puntos si respondió bien todo el cuestionario.
    // (Puedes cambiar esta regla si prefieres dar puntos parciales.)
    const aprobo = estrellas === 3;
    const puntosGanados = aprobo ? PUNTOS_POR_NIVEL[nivel] : 0;

    // 1. Registrar el intento en la colección "progreso"
    await db.collection("progreso").add({
        usuarioId: user.uid,
        lecturaId: lecturaId,
        nivel: nivel,
        estrellas: estrellas,
        puntosGanados: puntosGanados,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Sumar los puntos al total del usuario, si ganó puntos
    if (puntosGanados > 0) {
        await db.collection("usuarios").doc(user.uid).update({
            puntosTotales: firebase.firestore.FieldValue.increment(puntosGanados)
        });
    }

    return { aprobo, puntosGanados, premio: PREMIO_POR_NIVEL[nivel] };
}
