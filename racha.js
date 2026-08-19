// ==========================================================
// RACHA DE DÍAS CONSECUTIVOS 🔥
// ==========================================================
// Cuenta días CALENDARIO consecutivos (hora local del dispositivo, no
// UTC) en los que el usuario completó al menos una lectura — de premio
// o de "Mejorar la lectura". Varias lecturas el mismo día siguen
// contando como un solo día de racha.
//
// Se guarda en el documento del propio usuario (colección "usuarios"):
//   - rachaActual: número de días consecutivos
//   - rachaUltimaFecha: "YYYY-MM-DD" (hora local) de la última actividad
//
// Este archivo se incluye en las dos páginas donde se completa una
// lectura (lectura.html y lectura-mejorar.html):
//   - Premio: la llama guardarProgreso() en puntos.js, cada vez que se
//     califica un cuestionario (se aprueba o no — es la única
//     oportunidad de esa lectura, así que calificarla ya cuenta como
//     "completarla" ese día).
//   - Mejorar la lectura: la llama calificarMejora() en
//     motor-mejorar.js, solo cuando se aprueba (ahí sí hay intentos
//     ilimitados, así que "completada" ya significa aprobada — mismo
//     criterio que usa mejoraCompletadas).
// ==========================================================

function _formatoFechaLocal(fecha) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function _fechaHoyLocal() {
    return _formatoFechaLocal(new Date());
}

function _fechaAyerLocal() {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    return _formatoFechaLocal(ayer);
}

/**
 * Registra actividad de HOY para la racha del usuario actual:
 * - Si ya contaba por hoy, no cambia nada.
 * - Si su última actividad fue ayer, suma 1.
 * - Si fue antes de ayer (o nunca tuvo), la racha arranca/reinicia en 1.
 */
async function registrarActividadRacha() {

    const user = auth.currentUser;
    if (!user) return;

    const hoy = _fechaHoyLocal();

    try {

        const ref = db.collection("usuarios").doc(user.uid);
        const doc = await ref.get();
        const datos = doc.exists ? doc.data() : {};

        if (datos.rachaUltimaFecha === hoy) {
            return;
        }

        const rachaAnterior = datos.rachaActual || 0;
        const nuevaRacha = (datos.rachaUltimaFecha === _fechaAyerLocal())
            ? rachaAnterior + 1
            : 1;

        await ref.update({
            rachaActual: nuevaRacha,
            rachaUltimaFecha: hoy
        });

    } catch (error) {
        console.error("No se pudo actualizar la racha:", error);
    }

}
