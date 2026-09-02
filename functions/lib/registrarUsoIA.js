// ==========================================================
// REGISTRO DE USO Y COSTO DE IA (Etapa 37)
// ==========================================================
// Helper compartido — TODAS las funciones que llaman a Claude (las 4:
// generarPreguntasIA, moderarPropuestaIA, generarLecturaOriginalIA,
// analizarDatosUsuariosIA) llaman a esto justo después de recibir la
// respuesta, para guardar en Firestore (colección "usoIA") cuántos
// tokens consumió ESA llamada específica y su costo aproximado en
// dólares. Es SOLO un registro de monitoreo — nunca decide nada ni
// bloquea nada, y un fallo al guardar nunca debe tumbar la función real
// (por eso el catch no vuelve a lanzar el error).
//
// Precios (Claude Opus 5, el ÚNICO modelo que usa este proyecto —
// verificados con la skill de referencia de la API de Claude,
// consultado 2026-08-31): $5.00 / millón de tokens de ENTRADA,
// $25.00 / millón de tokens de SALIDA. Si algún día cambian de modelo,
// actualizar SOLO aquí — el resto de las funciones nunca calculan el
// costo por su cuenta.
// ==========================================================

const { logger } = require("firebase-functions");
const { db, admin } = require("../admin-init");

const PRECIO_INPUT_POR_MILLON = 5.00;
const PRECIO_OUTPUT_POR_MILLON = 25.00;

/**
 * @param {"generar_preguntas"|"analizar_sugerencia"|"inventar_historia"|"analisis_datos"} tipo
 * @param {number} inputTokens
 * @param {number} outputTokens
 */
async function registrarUsoIA({ tipo, inputTokens, outputTokens }) {

    const costoUsd =
        (inputTokens / 1_000_000) * PRECIO_INPUT_POR_MILLON +
        (outputTokens / 1_000_000) * PRECIO_OUTPUT_POR_MILLON;

    try {
        await db.collection("usoIA").add({
            tipo,
            inputTokens,
            outputTokens,
            costoUsd,
            fecha: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        // Un fallo al REGISTRAR el gasto nunca debe impedir que la
        // función que sí le sirvió al admin/usuario devuelva su
        // resultado — solo se deja constancia en los logs.
        logger.error("No se pudo registrar el uso de IA:", error);
    }

}

module.exports = { registrarUsoIA };
