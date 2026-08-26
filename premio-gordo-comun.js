// ==========================================================
// "EL PREMIO GORDO" — LÓGICA COMPARTIDA
// ==========================================================
// Reto aparte del sistema normal de premios: acumular una racha de
// lecturas de nivel DIFÍCIL aprobadas con 3 estrellas, EN ORDEN, sin
// fallar ninguna en el camino, hasta llegar a una meta configurable
// (6 por defecto, solo editable por el administrador). Gana quien la
// complete en menos tiempo total.
//
// Regla de la racha (confirmada con el administrador):
// - Cada intento difícil con 3/3 estrellas suma 1 a la racha y guarda
//   el tiempo de ESE intento.
// - Cualquier intento difícil que NO sea 3/3 — primera vez o reintento
//   de una que ya venía fallando — reinicia la racha a 0 de inmediato,
//   sin importar cuánto llevaba acumulado.
// - Mientras no la tenga en 3/3, esa lectura se puede reintentar sin
//   límite (excepción a la regla normal de "1 sola oportunidad" — ver
//   motor.js y desbloqueo.js).
// - Al llegar a la meta, el resultado se congela: deja de aplicar la
//   excepción para ese usuario (vuelve a las reglas normales). Si el
//   admin sube la meta después, se reactiva solo, conservando lo ya
//   acumulado — todo se deriva de "progreso" cada vez que hace falta,
//   nunca se guarda un contador aparte que se pueda desincronizar.
//
// Este archivo se incluye en cualquier página que necesite consultar o
// recalcular este reto: index.html y lectura.html (para las reglas de
// juego) y premios.html (para mostrarlo, junto con los premios ganados).
// admin.js lo usa para dejar editar la meta.
// ==========================================================

let META_PREMIO_GORDO = 6;
let _promesaMetaPremioGordo = null;

/**
 * Trae la meta configurada (cuántas lecturas difíciles seguidas hacen
 * falta). Cacheada igual que cargarRangoEdades; pasa "true" para forzar
 * traerla de nuevo (por ejemplo, justo después de que el admin la
 * cambie).
 */
function cargarMetaPremioGordo(forzarRecarga) {

    if (_promesaMetaPremioGordo && !forzarRecarga) {
        return _promesaMetaPremioGordo;
    }

    _promesaMetaPremioGordo = db.collection("configuracion").doc("premioGordo")
        .get()
        .then(doc => {
            if (doc.exists && typeof doc.data().meta === "number") {
                META_PREMIO_GORDO = doc.data().meta;
            }
            return META_PREMIO_GORDO;
        })
        .catch(error => {
            console.error("No se pudo cargar la meta de El premio gordo:", error);
            return META_PREMIO_GORDO;
        });

    return _promesaMetaPremioGordo;

}

/**
 * Función PURA: recibe los intentos de lecturas DIFÍCILES de un usuario,
 * ya ordenados de más viejo a más nuevo, y arma la racha resultante.
 * Cada 3/3 se agrega a la racha; cualquier otro resultado la reinicia
 * por completo. Devuelve la racha final: un arreglo de
 * { lecturaId, duracionSegundos }, en el orden en que se consiguieron.
 */
function derivarRachaPremioGordo(intentosOrdenados) {

    let racha = [];

    intentosOrdenados.forEach(intento => {
        if (intento.estrellas === intento.totalPreguntas) {
            racha.push({
                lecturaId: intento.lecturaId,
                duracionSegundos: intento.duracionSegundos || 0
            });
        } else {
            racha = [];
        }
    });

    return racha;

}

/**
 * Ordena por fecha (más viejo primero) un grupo de documentos de
 * "progreso" ya obtenidos de Firestore. Se hace en JavaScript (no con
 * orderBy de Firestore) para no necesitar un índice compuesto nuevo.
 */
function _ordenarPorFecha(docsProgreso) {
    return docsProgreso
        .map(doc => doc.data())
        .sort((a, b) => (a.fecha ? a.fecha.toMillis() : 0) - (b.fecha ? b.fecha.toMillis() : 0));
}

/**
 * Calcula el estado actual de "El premio gordo" para UN usuario:
 * cuántas lleva en racha, cuánto tiempo acumulado, y si ya completó la
 * meta. Se usa para decidir las reglas de juego (motor.js,
 * desbloqueo.js) — no para pintar el ranking completo (ver
 * actualizarRankingPremioGordo, que hace esto para todos a la vez).
 *
 * También devuelve "lecturasAprobadas": TODAS las difíciles que alguna
 * vez sacó en 3/3, así se haya roto la racha después — a diferencia de
 * "lecturasEnRacha" (que solo son las que cuentan en la racha ACTIVA),
 * esto lo usa desbloqueo.js para saber a cuáles ya no tiene caso
 * mandarlo de nuevo.
 */
async function obtenerProgresoPremioGordo(uid) {

    const [snapshot, meta] = await Promise.all([
        db.collection("progreso")
            .where("usuarioId", "==", uid)
            .where("nivel", "==", "dificil")
            .get(),
        cargarMetaPremioGordo()
    ]);

    const intentos = _ordenarPorFecha(snapshot.docs);
    const racha = derivarRachaPremioGordo(intentos);

    const lecturasAprobadas = [...new Set(
        intentos
            .filter(intento => intento.estrellas === intento.totalPreguntas)
            .map(intento => intento.lecturaId)
    )];

    const contador = racha.length;
    const tiempoTotalSegundos = racha
        .slice(0, meta)
        .reduce((suma, r) => suma + r.duracionSegundos, 0);

    return {
        contador: contador,
        meta: meta,
        completo: contador >= meta,
        tiempoTotalSegundos: tiempoTotalSegundos,
        lecturasEnRacha: racha.map(r => r.lecturaId),
        lecturasAprobadas: lecturasAprobadas
    };

}

/**
 * Recalcula el ranking de "El premio gordo" para TODOS los usuarios y
 * lo guarda en un solo documento (mismo patrón que
 * actualizarRankingPersonal/actualizarRankingActual en puntos.js).
 * Se llama automáticamente cada vez que alguien califica una lectura
 * difícil (apruebe o no — un fallo también cambia el ranking, porque le
 * resetea la racha a ese usuario).
 *
 * Orden: primero quienes ya completaron la meta, del tiempo más rápido
 * al más lento; después quienes van a medias, por racha más alta y,
 * como desempate, por su tiempo parcial más rápido.
 */
async function actualizarRankingPremioGordo() {

    const [progresoSnap, usuariosSnap, meta] = await Promise.all([
        db.collection("progreso").where("nivel", "==", "dificil").get(),
        db.collection("usuarios").get(),
        cargarMetaPremioGordo()
    ]);

    const nombresPorUid = {};
    usuariosSnap.forEach(doc => {
        const data = doc.data();
        nombresPorUid[doc.id] = (data.mostrarAlias && data.alias) ? data.alias : (data.nombre || "Anónimo");
    });

    const intentosPorUsuario = {};
    progresoSnap.forEach(doc => {
        const data = doc.data();
        if (!intentosPorUsuario[data.usuarioId]) {
            intentosPorUsuario[data.usuarioId] = [];
        }
        intentosPorUsuario[data.usuarioId].push(data);
    });

    const lista = Object.keys(intentosPorUsuario).map(uid => {

        const racha = derivarRachaPremioGordo(
            intentosPorUsuario[uid].sort(
                (a, b) => (a.fecha ? a.fecha.toMillis() : 0) - (b.fecha ? b.fecha.toMillis() : 0)
            )
        );

        const contador = racha.length;

        return {
            uid: uid,
            nombre: nombresPorUid[uid] || "Anónimo",
            contador: contador,
            meta: meta,
            completo: contador >= meta,
            tiempoTotalSegundos: racha.slice(0, meta).reduce((suma, r) => suma + r.duracionSegundos, 0)
        };

    }).filter(item => item.contador > 0); // solo aparece quien ya tiene al menos 1 en racha

    lista.sort((a, b) => {

        if (a.completo !== b.completo) return a.completo ? -1 : 1;

        if (a.completo) {
            return a.tiempoTotalSegundos - b.tiempoTotalSegundos;
        }

        if (a.contador !== b.contador) return b.contador - a.contador;
        return a.tiempoTotalSegundos - b.tiempoTotalSegundos;

    });

    await db.collection("rankingPremioGordo").doc("actual").set({
        lista: lista,
        actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

}
