// ==========================================================
// CLOUD FUNCTION: cargarGlosarioPersonalIA
// ==========================================================
// A DIFERENCIA de todas las demás funciones de IA de este proyecto,
// esta NO es exclusiva del administrador — cualquier usuario
// autenticado puede llamarla, para subir su propio glosario y jugar
// Ahorcado con SUS palabras en vez del banco general (ver ahorcado.js).
// Es privado: nunca se mezcla con el banco general ni es visible para
// otros usuarios.
//
// Por ser la primera función de IA abierta a cualquiera, tiene límites
// estrictos para controlar costo y abuso (acordados explícitamente con
// el dueño del proyecto, no elegidos por su cuenta):
// - Máximo 2 MB por archivo (impuesto también en storage.rules).
// - Máximo 100 palabras procesadas por carga.
// - Máximo 3 cargas por día por usuario (contador en Firestore,
//   revisado con una transacción para que no se pueda esquivar
//   haciendo varias peticiones al mismo tiempo).
//
// El resultado se devuelve para que el usuario lo revise antes de
// guardarlo (mismo principio que todas las demás funciones de IA) — el
// guardado final en usuarios/{uid}.glosarioPersonal lo hace el cliente
// directamente en Firestore (ya tiene permiso de escribir su propio
// documento, ver firestore.rules), no esta función.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { extraerTextoDeStorage } = require("./extraerTextoStorage");
const { extraerListaPalabrasConIA } = require("./extraccionListaPalabras");
const { db, admin } = require("../admin-init");

const MAX_PALABRAS_PERSONAL = 100;
const LIMITE_CARGAS_DIARIAS = 3;
const LIMITE_CARACTERES_DOCUMENTO = 30000;

function fechaDeHoy() {
    return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC)
}

/**
 * Revisa y (si hay cupo) registra una carga más del día para este
 * usuario, en una transacción — así dos peticiones casi simultáneas no
 * pueden colarse ambas por encima del límite.
 */
async function revisarYRegistrarUsoDiario(uid) {

    const ref = db.collection("usuarios").doc(uid);

    await db.runTransaction(async (tx) => {

        const doc = await tx.get(ref);
        const datos = doc.exists ? doc.data() : {};
        const uso = datos.usoGlosarioPersonalIA || {};
        const hoy = fechaDeHoy();

        const cargasHoy = uso.fecha === hoy ? (uso.cargas || 0) : 0;

        if (cargasHoy >= LIMITE_CARGAS_DIARIAS) {
            throw new HttpsError(
                "resource-exhausted",
                `Ya usaste tus ${LIMITE_CARGAS_DIARIAS} cargas de hoy para el glosario personal. Intenta de nuevo mañana.`
            );
        }

        tx.set(ref, { usoGlosarioPersonalIA: { fecha: hoy, cargas: cargasHoy + 1 } }, { merge: true });

    });

}

const cargarGlosarioPersonalIA = onCall(
    { secrets: ["ANTHROPIC_API_KEY"], memory: "512MiB", timeoutSeconds: 120 },
    async (request) => {

        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar esta función.");
        }

        const uid = request.auth.uid;

        const datos = request.data || {};
        const storagePath = datos.storagePath;

        // Cada usuario solo puede tocar SU PROPIA carpeta — ver
        // storage.rules, que ya lo exige del lado de la subida, pero se
        // revisa también aquí por si acaso.
        if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith(`fuentesGlosarioPersonal/${uid}/`)) {
            throw new HttpsError("invalid-argument", "Falta la ruta del documento subido.");
        }

        // El límite diario se revisa (y registra) ANTES de llamar a
        // Claude — así una carga rechazada por el límite nunca gasta
        // presupuesto de la API.
        await revisarYRegistrarUsoDiario(uid);

        const archivo = admin.storage().bucket().file(storagePath);

        let texto;
        try {
            texto = (await extraerTextoDeStorage(storagePath)).trim();
        } catch (error) {
            logger.error("No se pudo extraer texto del glosario personal:", error);
            archivo.delete().catch(() => {});
            throw new HttpsError(
                "invalid-argument",
                "No se pudo leer ese documento — puede estar dañado, protegido, o en un formato no soportado."
            );
        }

        archivo.delete().catch(error => logger.warn("No se pudo borrar el documento temporal:", error));

        if (!texto || texto.length < 3) {
            throw new HttpsError("invalid-argument", "El documento no parece tener texto legible.");
        }

        texto = texto.slice(0, LIMITE_CARACTERES_DOCUMENTO);

        let palabras;
        try {
            palabras = await extraerListaPalabrasConIA(texto, MAX_PALABRAS_PERSONAL);
        } catch (error) {
            logger.error("Error llamando a la API de Claude (cargarGlosarioPersonalIA):", error);
            throw new HttpsError("internal", "No se pudo procesar el documento con IA. Intenta de nuevo.");
        }

        if (palabras.length === 0) {
            throw new HttpsError("invalid-argument", "No se encontró ninguna palabra en ese documento.");
        }

        return { palabras };

    }
);

module.exports = { cargarGlosarioPersonalIA };
