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
 * Normaliza texto para poder AGRUPAR correctamente aunque la gente
 * escriba con mayúsculas distintas o espacios de más
 * (ej. "unis", "Unis ", "UNIS " cuentan como el mismo grupo).
 * Ojo: esto no soluciona que alguien escriba "Unis" y otro "Colegio Unis" —
 * para eso ayuda el placeholder del formulario pidiendo el nombre completo.
 */
function normalizarTexto(texto) {
    return (texto || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function aTituloDeCaso(texto) {
    return texto
        .split(" ")
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(" ");
}

/**
 * Recalcula el RANKING PERSONAL (individual): todos los usuarios,
 * particulares Y estudiantes, ordenados por puntos. Así cualquiera
 * puede ver su propio puntaje comparado con los demás.
 */
async function actualizarRankingPersonal() {
    const snapshot = await db.collection("usuarios").get();

    const lista = [];

    snapshot.forEach(doc => {
        const data = doc.data();
        lista.push({
            uid: doc.id,
            nombre: data.nombre || "Anónimo",
            tipo: data.tipo || "particular",
            puntos: data.puntosTotales || 0
        });
    });

    lista.sort((a, b) => b.puntos - a.puntos);

    await db.collection("rankingPersonal").doc("actual").set({
        lista: lista,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Recalcula el ranking de colegios/grados y lo guarda en un solo documento
 * que siempre representa el estado ACTUAL (no por día). Se llama automáticamente
 * cada vez que alguien completa un cuestionario, así que el ranking queda
 * al instante actualizado para quien esté viendo ranking.html.
 */
async function actualizarRankingActual() {
    const snapshot = await db.collection("usuarios")
        .where("tipo", "==", "estudiante")
        .get();

    const grupos = {};

    snapshot.forEach(doc => {
        const data = doc.data();

        const colegioNormalizado = normalizarTexto(data.colegio || "Sin colegio");
        const gradoNormalizado = normalizarTexto(data.grado || "Sin grado");
        const clave = `${colegioNormalizado}|||${gradoNormalizado}`;

        if (!grupos[clave]) {
            grupos[clave] = {
                colegio: aTituloDeCaso(colegioNormalizado),
                grado: aTituloDeCaso(gradoNormalizado),
                puntos: 0
            };
        }

        grupos[clave].puntos += data.puntosTotales || 0;
    });

    const listaOrdenada = Object.values(grupos)
        .sort((a, b) => b.puntos - a.puntos);

    await db.collection("rankingActual").doc("actual").set({
        lista: listaOrdenada,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Guarda el resultado de una lectura completada y suma los puntos
 * correspondientes al usuario actual.
 *
 * Evita que una misma lectura otorgue puntos más de una vez por usuario
 * (si ya la había completado antes con éxito, esta vez no vuelve a sumar,
 * aunque el intento sí se registra para tu historial).
 *
 * @param {string} lecturaId - identificador único de la lectura (ver lecturas.js)
 * @param {string} nivel - "facil" | "intermedio" | "dificil"
 * @param {number} estrellas - cuántas respuestas correctas obtuvo
 * @param {number} totalPreguntas - cuántas preguntas tenía esta lectura
 */
async function guardarProgreso(lecturaId, nivel, estrellas, totalPreguntas) {
    const user = auth.currentUser;
    if (!user) return;

    // ¿Ya había completado esta lectura con éxito antes?
    const intentosPrevios = await db.collection("progreso")
        .where("usuarioId", "==", user.uid)
        .where("lecturaId", "==", lecturaId)
        .get();

    const yaCompletada = intentosPrevios.docs.some(doc => doc.data().puntosGanados > 0);

    // Solo se otorgan puntos si respondió bien todo el cuestionario,
    // Y si es la primera vez que la completa con éxito.
    const aprobo = estrellas === totalPreguntas;
    const puntosGanados = (aprobo && !yaCompletada) ? PUNTOS_POR_NIVEL[nivel] : 0;

    // 1. Registrar el intento en la colección "progreso"
    await db.collection("progreso").add({
        usuarioId: user.uid,
        lecturaId: lecturaId,
        nivel: nivel,
        estrellas: estrellas,
        totalPreguntas: totalPreguntas,
        puntosGanados: puntosGanados,
        fecha: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Sumar los puntos al total del usuario, si ganó puntos NUEVOS
    if (puntosGanados > 0) {
        await db.collection("usuarios").doc(user.uid).update({
            puntosTotales: firebase.firestore.FieldValue.increment(puntosGanados)
        });

        // 3. Recalcular el ranking personal SIEMPRE (aplica a todos:
        //    particulares y estudiantes)
        await actualizarRankingPersonal();

        // 4. Recalcular el ranking de colegios solo si es estudiante
        //    (actualizarRankingActual ya filtra por tipo "estudiante",
        //    pero evitamos la llamada innecesaria si es particular)
        const datosUsuario = (await db.collection("usuarios").doc(user.uid).get()).data();
        if (datosUsuario && datosUsuario.tipo === "estudiante") {
            await actualizarRankingActual();
        }
    }

    return {
        aprobo: aprobo && !yaCompletada,
        yaCompletada: aprobo && yaCompletada,
        puntosGanados,
        premio: PREMIO_POR_NIVEL[nivel]
    };
}
