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

// La descripción de cada premio vive en Firestore (configuracion/premios)
// y se edita desde el panel de administrador. Estos son solo los valores
// por defecto mientras se carga o si el admin nunca los ha guardado.
let PREMIO_POR_NIVEL = {
    facil: "Tortrix",
    intermedio: "Burrito simple",
    dificil: "Menú campero"
};
let _promesaPremioPorNivel = null;

function cargarPremioPorNivel(forzarRecarga) {

    if (_promesaPremioPorNivel && !forzarRecarga) {
        return _promesaPremioPorNivel;
    }

    _promesaPremioPorNivel = db.collection("configuracion").doc("premios")
        .get()
        .then(doc => {
            if (doc.exists) {
                PREMIO_POR_NIVEL = doc.data();
            }
            return PREMIO_POR_NIVEL;
        })
        .catch(error => {
            console.error("No se pudo cargar los premios:", error);
            return PREMIO_POR_NIVEL;
        });

    return _promesaPremioPorNivel;

}

/**
 * Convierte un resultado (ej. 6 de 7 correctas) a una calificación
 * SIEMPRE sobre 3 estrellas, en pasos de media estrella, redondeando
 * hacia ABAJO — así una lectura con banco de más de 3 preguntas nunca
 * muestra las 3 estrellas llenas si no respondió TODO bien (ej. 6/7
 * correctas queda en 2.5 estrellas, no en 3).
 */
function calcularEstrellasSobre3(estrellas, totalPreguntas) {
    if (!totalPreguntas) return 0;
    const proporcion = (estrellas / totalPreguntas) * 3;
    return Math.floor(proporcion * 2) / 2;
}

/**
 * Genera el HTML de 3 estrellas (silueta vacía + relleno según el
 * resultado, con soporte de medias estrellas) para mostrar en vez de
 * texto tipo "Resultado: 2/3".
 */
function generarHTMLEstrellas(estrellas, totalPreguntas) {

    const llenas = calcularEstrellasSobre3(estrellas, totalPreguntas);

    let html = '<span class="estrellasResultado">';

    for (let i = 0; i < 3; i++) {
        const relleno = Math.max(0, Math.min(1, llenas - i)) * 100;
        html += `
            <span class="estrellaContenedor">
                <span class="estrellaFondo">★</span>
                <span class="estrellaLlena" style="width:${relleno}%">★</span>
            </span>
        `;
    }

    html += '</span>';

    return html;

}

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
        const nombreAMostrar = (data.mostrarAlias && data.alias) ? data.alias : (data.nombre || "Anónimo");
        lista.push({
            uid: doc.id,
            nombre: nombreAMostrar,
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
 * Genera un código de canje de 6 dígitos que todavía no exista en la
 * colección "premios" (probabilidad de choque casi nula, pero se revisa
 * de todas formas antes de usarlo).
 */
async function generarCodigoUnico() {

    for (let intento = 0; intento < 5; intento++) {

        const candidato = String(Math.floor(100000 + Math.random() * 900000));

        const yaExiste = await db.collection("premios")
            .where("codigo", "==", candidato)
            .limit(1)
            .get();

        if (yaExiste.empty) return candidato;

    }

    // Muy improbable llegar aquí, pero por si acaso: un código igual de
    // largo basado en la hora exacta, prácticamente imposible de repetir.
    return String(Date.now()).slice(-6);

}

/**
 * Crea el premio canjeable (con su código de 6 dígitos) que le
 * corresponde a esta lectura recién aprobada por primera vez.
 */
async function crearPremioCanjeable(user, lecturaId, nivel) {

    await cargarPremioPorNivel();

    const codigo = await generarCodigoUnico();

    await db.collection("premios").add({
        usuarioId: user.uid,
        lecturaId: lecturaId,
        nivel: nivel,
        descripcionPremio: PREMIO_POR_NIVEL[nivel] || "Premio",
        codigo: codigo,
        canjeado: false,
        canjeadoPor: null,
        fechaGanado: firebase.firestore.FieldValue.serverTimestamp(),
        fechaCanjeado: null
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

    // Cuenta como actividad del día para la racha 🔥, se haya aprobado o
    // no — esta es la única oportunidad de esta lectura, así que
    // calificarla ya cuenta como "completarla" hoy (ver racha.js).
    if (typeof registrarActividadRacha === "function") {
        await registrarActividadRacha();
    }

    // 2. Sumar los puntos al total del usuario, si ganó puntos NUEVOS
    if (puntosGanados > 0) {
        await db.collection("usuarios").doc(user.uid).update({
            puntosTotales: firebase.firestore.FieldValue.increment(puntosGanados)
        });

        // 3. Crear su premio canjeable (con código de 6 dígitos) para esta lectura
        await crearPremioCanjeable(user, lecturaId, nivel);

        // 4. Recalcular el ranking personal SIEMPRE (aplica a todos:
        //    particulares y estudiantes)
        await actualizarRankingPersonal();

        // 5. Recalcular el ranking de colegios solo si es estudiante
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

/**
 * Dado un grupo de documentos de "progreso" (ya obtenidos de Firestore),
 * les resta a cada usuario los puntos que esos documentos representan,
 * borra los documentos, y recalcula ambos rankings. Es el mecanismo
 * compartido por revertirPuntosDeLectura() y repararPuntosDeLecturasEliminadas().
 */
async function _revertirPuntosYBorrarProgreso(docs) {

    if (docs.length === 0) return { usuariosAfectados: 0, puntosRevertidos: 0 };

    // Sumar cuántos puntos hay que restarle a cada usuario afectado
    const puntosARestarPorUsuario = {};
    docs.forEach(doc => {
        const data = doc.data();
        if (data.puntosGanados > 0) {
            puntosARestarPorUsuario[data.usuarioId] =
                (puntosARestarPorUsuario[data.usuarioId] || 0) + data.puntosGanados;
        }
    });

    for (const usuarioId of Object.keys(puntosARestarPorUsuario)) {
        await db.collection("usuarios").doc(usuarioId).update({
            puntosTotales: firebase.firestore.FieldValue.increment(-puntosARestarPorUsuario[usuarioId])
        });
    }

    // Borrar los documentos de progreso (en lotes de 450, por debajo del
    // límite de 500 operaciones por batch de Firestore).
    for (let i = 0; i < docs.length; i += 450) {
        const lote = db.batch();
        docs.slice(i, i + 450).forEach(doc => lote.delete(doc.ref));
        await lote.commit();
    }

    // Recalcular ambos rankings para que el cambio se refleje de inmediato
    await actualizarRankingPersonal();
    await actualizarRankingActual();

    return {
        usuariosAfectados: Object.keys(puntosARestarPorUsuario).length,
        puntosRevertidos: Object.values(puntosARestarPorUsuario).reduce((a, b) => a + b, 0)
    };

}

/**
 * Se llama al eliminar una lectura del catálogo (ver admin.js). Le resta
 * a cada usuario los puntos que había ganado con esa lectura, borra sus
 * entradas de "progreso" (ya no tiene sentido conservarlas, la lectura
 * dejó de existir) y recalcula ambos rankings, para que el conteo no
 * quede desfasado ni genere confusión sobre por qué alguien tiene más
 * puntos de los que sus lecturas actuales explican.
 *
 * @param {string} lecturaId - id de la lectura que se acaba de borrar
 */
async function revertirPuntosDeLectura(lecturaId) {

    const progresoDeEstaLectura = await db.collection("progreso")
        .where("lecturaId", "==", lecturaId)
        .get();

    await _revertirPuntosYBorrarProgreso(progresoDeEstaLectura.docs);

}

/**
 * Reparación manual, pensada para correrse UNA VEZ desde el panel de
 * administrador: revisa todo el historial de "progreso" y revierte los
 * puntos de cualquier lectura que ya no exista en el catálogo. Cubre
 * lecturas que se hayan borrado ANTES de que existiera la corrección
 * automática de revertirPuntosDeLectura() de arriba.
 */
async function repararPuntosDeLecturasEliminadas() {

    const [catalogoSnap, progresoSnap] = await Promise.all([
        db.collection("lecturas").get(),
        db.collection("progreso").where("puntosGanados", ">", 0).get()
    ]);

    const idsVigentes = new Set(catalogoSnap.docs.map(doc => doc.id));
    const docsHuerfanos = progresoSnap.docs.filter(doc => !idsVigentes.has(doc.data().lecturaId));

    return _revertirPuntosYBorrarProgreso(docsHuerfanos);

}
