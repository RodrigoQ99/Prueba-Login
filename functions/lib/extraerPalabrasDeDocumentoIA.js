// ==========================================================
// CLOUD FUNCTION: extraerPalabrasDeDocumentoIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Recibe la ruta (en Firebase Storage, carpeta "fuentesPalabras/") de
// un documento con una lista de palabras — con o sin definiciones — y
// devuelve la lista lista para que el admin la revise y elija cuáles
// agregar al banco general de Ahorcado (nunca se guarda sola). El
// archivo se borra apenas se termina de leer, es solo un archivo de
// entrada transitorio.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { verificarAdmin } = require("./verificarAdmin");
const { extraerTextoDeStorage } = require("./extraerTextoStorage");
const { extraerListaPalabrasConIA } = require("./extraccionListaPalabras");
const { db, admin } = require("../admin-init");

// El admin es una cuenta de confianza, pero igual se pone un tope —
// nunca hace falta más que esto para un banco de palabras de Ahorcado.
const MAX_PALABRAS_ADMIN = 500;
const LIMITE_CARACTERES_DOCUMENTO = 100000;

const extraerPalabrasDeDocumentoIA = onCall(
    { secrets: ["ANTHROPIC_API_KEY"], memory: "512MiB", timeoutSeconds: 180 },
    async (request) => {

        await verificarAdmin(request, db);

        const datos = request.data || {};
        const storagePath = datos.storagePath;

        if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith("fuentesPalabras/")) {
            throw new HttpsError("invalid-argument", "Falta la ruta del documento subido.");
        }

        const archivo = admin.storage().bucket().file(storagePath);

        let texto;
        try {
            texto = (await extraerTextoDeStorage(storagePath)).trim();
        } catch (error) {
            logger.error("No se pudo extraer texto del documento de palabras:", error);
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
            palabras = await extraerListaPalabrasConIA(texto, MAX_PALABRAS_ADMIN);
        } catch (error) {
            logger.error("Error llamando a la API de Claude (extraerPalabrasDeDocumentoIA):", error);
            throw new HttpsError("internal", "No se pudo procesar el documento con IA. Intenta de nuevo.");
        }

        if (palabras.length === 0) {
            throw new HttpsError("invalid-argument", "No se encontró ninguna palabra en ese documento.");
        }

        return { palabras };

    }
);

module.exports = { extraerPalabrasDeDocumentoIA };
