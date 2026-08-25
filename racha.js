// ==========================================================
// RACHA 🔥 — VENTANA MÓVIL DE 24 HORAS (estilo Snapchat/TikTok)
// ==========================================================
// Ya NO se basa en día calendario: se basa estrictamente en el tiempo
// transcurrido desde la última actividad. Si pasan 24 horas o más SIN
// ninguna actividad, la racha se pierde por completo — sin importar la
// hora del día ni si "ya era otro día".
//
// Se guarda en el documento del propio usuario (colección "usuarios"):
//   - rachaActual: número de períodos de 24h consecutivos con actividad
//   - rachaInicio: Timestamp de cuándo arrancó la racha ACTUAL (se
//     reinicia cada vez que la racha se pierde y vuelve a empezar)
//   - rachaUltimaActividad: Timestamp de la actividad MÁS RECIENTE (de
//     cualquier tipo) — es contra esto que se mide "¿ya pasaron 24h?"
//
// CÓMO CUENTA (para que alguien con horarios ligeramente distintos cada
// día no pierda la racha con SOLO leer una vez al día, pero sí la
// pierda de verdad si de plano no vuelve en 24h):
//   - "¿Se perdió?" se mide SIEMPRE contra la actividad más reciente,
//     que se refresca con CUALQUIER actividad nueva — mientras haya
//     como mínimo una actividad cada menos de 24h, nunca se pierde.
//   - El NÚMERO de la racha se recalcula como "cuántos bloques de 24h
//     completos pasaron desde que arrancó la racha, +1" — así una
//     misma persona activa cada ~20-23h suma 1 por bloque, sin
//     duplicar si hace varias cosas dentro del mismo bloque.
//
// QUÉ CUENTA COMO "ACTIVIDAD" (llaman a registrarActividadRacha()):
//   - Calificar una lectura de premios (guardarProgreso, en puntos.js),
//     se apruebe o no — ya es "haber hecho algo".
//   - Aprobar una lectura de "Mejorar la lectura" (calificarMejora, en
//     motor-mejorar.js).
//   - Enviar un intento de "El Hilo del día" (hilo-del-dia.js).
//   - Terminar una ronda de Ahorcado, se gane o se pierda (ahorcado.js).
// ==========================================================

const HORAS_LIMITE_RACHA = 24;
const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Registra actividad AHORA para la racha del usuario actual.
 * - Si la última actividad fue hace menos de 24h, la racha sigue viva:
 *   se recalcula el número de períodos de 24h transcurridos desde que
 *   arrancó, y se refresca "última actividad" (así el reloj de 24h
 *   vuelve a empezar desde este momento).
 * - Si la última actividad fue hace 24h o más (o nunca hubo), la racha
 *   se pierde/arranca de cero: pasa a 1, con "inicio" y "última
 *   actividad" en este momento.
 */
async function registrarActividadRacha() {

    const user = auth.currentUser;
    if (!user) return;

    const ahoraMs = Date.now();

    try {

        const ref = db.collection("usuarios").doc(user.uid);
        const doc = await ref.get();
        const datos = doc.exists ? doc.data() : {};

        const ultimaActividadMs = datos.rachaUltimaActividad ? datos.rachaUltimaActividad.toMillis() : null;
        const horasDesdeUltima = ultimaActividadMs !== null ? (ahoraMs - ultimaActividadMs) / MS_POR_HORA : Infinity;

        let inicioMs;
        let nuevaRacha;

        if (horasDesdeUltima >= HORAS_LIMITE_RACHA) {
            // Nunca tuvo actividad, o pasaron 24h+ sin ninguna: arranca de cero.
            inicioMs = ahoraMs;
            nuevaRacha = 1;
        } else {
            // Sigue viva: cuenta cuántos bloques de 24h pasaron desde que
            // arrancó (Math.floor evita duplicar si ya había actividad en
            // este mismo bloque).
            inicioMs = datos.rachaInicio ? datos.rachaInicio.toMillis() : ahoraMs;
            nuevaRacha = Math.floor((ahoraMs - inicioMs) / (HORAS_LIMITE_RACHA * MS_POR_HORA)) + 1;
        }

        await ref.update({
            rachaActual: nuevaRacha,
            rachaInicio: firebase.firestore.Timestamp.fromMillis(inicioMs),
            rachaUltimaActividad: firebase.firestore.Timestamp.fromMillis(ahoraMs)
        });

    } catch (error) {
        console.error("No se pudo actualizar la racha:", error);
    }

}

/**
 * Calcula la racha VIGENTE de unos datos de usuario ya cargados, sin
 * volver a consultar Firestore — para mostrarla en el menú (🔥) tal
 * cual está en este momento, incluso si ya pasaron 24h y todavía no
 * hubo ninguna actividad nueva que dispare el reinicio en el servidor
 * (si no se hiciera este cálculo, seguiría mostrando el número viejo
 * hasta la próxima actividad, como si no se hubiera perdido).
 */
function calcularRachaVigente(datosUsuario) {

    if (!datosUsuario || !datosUsuario.rachaUltimaActividad) return 0;

    const horasDesdeUltima = (Date.now() - datosUsuario.rachaUltimaActividad.toMillis()) / MS_POR_HORA;

    return horasDesdeUltima >= HORAS_LIMITE_RACHA ? 0 : (datosUsuario.rachaActual || 0);

}
