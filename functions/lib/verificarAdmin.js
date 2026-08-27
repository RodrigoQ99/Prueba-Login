// ==========================================================
// VERIFICACIÓN DE ADMINISTRADOR (Cloud Functions)
// ==========================================================
// Mismo criterio que esAdmin() en admin-comun.js (el frontend): el
// correo de quien llama debe existir como documento en la colección
// "administradores" de Firestore. Aquí se revisa con el Admin SDK
// (acceso total, no pasa por firestore.rules) porque esta verificación
// ES la que protege las funciones de IA — nadie más debe poder
// gastar presupuesto de la API de Claude llamándolas directamente.
//
// Compartida por generarPreguntasIA.js y moderarPropuestaIA.js — cada
// función de IA la llama al principio, antes de tocar cualquier otra
// cosa (para no llamar a Claude si quien pide no es admin).
// ==========================================================

const { HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

/**
 * Lanza HttpsError si "request" (el CallableRequest que recibe cada
 * función onCall) no viene de un administrador autenticado. Si todo
 * está en orden, no devuelve nada — simplemente no lanza.
 */
async function verificarAdmin(request, db) {

    const auth = request.auth;

    if (!auth || !auth.token || !auth.token.email) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar esta función.");
    }

    const correo = auth.token.email;

    let doc;
    try {
        doc = await db.collection("administradores").doc(correo).get();
    } catch (error) {
        logger.error("No se pudo revisar la lista de administradores:", error);
        throw new HttpsError("internal", "No se pudo verificar el permiso. Intenta de nuevo.");
    }

    if (!doc.exists) {
        throw new HttpsError("permission-denied", "Esta función es solo para administradores.");
    }

}

module.exports = { verificarAdmin };
