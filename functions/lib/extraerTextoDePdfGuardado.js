// ==========================================================
// CLOUD FUNCTION: extraerTextoDePdfGuardado
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Descarga uno de los PDFs guardados en Storage (carpeta
// "pdfsHiloDelDia/", ver storage.rules) y devuelve su texto completo
// SIN tocarlo con IA — el admin lo recorta a mano hasta dejar
// exactamente el fragmento que quiere usar (él elige la parte, nunca
// la IA — ver dividirFragmentoEnHiloIA.js, que sí usa IA pero solo
// para dividir el fragmento YA elegido en 5 partes).
//
// A diferencia de fuentesLecturas/ (Etapa 22), estos PDFs son
// PERMANENTES — se guardan para reusarlos en varios Hilos a lo largo
// del tiempo, así que esta función NO los borra después de leerlos.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { verificarAdmin } = require("./verificarAdmin");
const { db, admin } = require("../admin-init");

// Tope de seguridad para lo que se devuelve al navegador — un PDF
// guardado puede ser un libro completo; el admin solo necesita ver
// suficiente para elegir su fragmento, no hace falta mandarlo entero.
const LIMITE_CARACTERES_TEXTO = 150000;

const extraerTextoDePdfGuardado = onCall({ memory: "512MiB", timeoutSeconds: 120 }, async (request) => {

    await verificarAdmin(request, db);

    const datos = request.data || {};
    const storagePath = datos.storagePath;

    // "pdfsHiloDelDia/" es la ÚNICA carpeta que esta función lee (ver
    // storage.rules) — no se acepta ninguna otra ruta, por si alguien
    // manipulara la llamada desde la consola del navegador.
    if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith("pdfsHiloDelDia/")) {
        throw new HttpsError("invalid-argument", "Falta la ruta del PDF guardado.");
    }

    let pdfParse;
    try {
        // Cargado adentro (no arriba) a propósito — ver la misma nota en
        // extraerLecturaDeDocumentoIA.js: si pdf-parse no está instalado,
        // que falle solo esta función con un mensaje claro.
        pdfParse = require("pdf-parse");
    } catch (error) {
        throw new HttpsError(
            "failed-precondition",
            "El soporte para PDF no está instalado en el servidor todavía (falta \"pdf-parse\" — revisa functions/README.md)."
        );
    }

    let buffer;
    try {
        const [contenido] = await admin.storage().bucket().file(storagePath).download();
        buffer = contenido;
    } catch (error) {
        logger.error("No se pudo descargar el PDF guardado:", error);
        throw new HttpsError("not-found", "No se pudo encontrar ese PDF. Puede que se haya borrado — vuelve a subirlo.");
    }

    let texto;
    try {
        const data = await pdfParse(buffer);
        texto = (data.text || "").trim();
    } catch (error) {
        logger.error("No se pudo extraer el texto del PDF:", error);
        throw new HttpsError("invalid-argument", "No se pudo leer ese PDF — puede estar dañado o protegido.");
    }

    if (!texto) {
        throw new HttpsError("invalid-argument", "Ese PDF no parece tener texto legible (¿es una imagen escaneada sin OCR?).");
    }

    return { texto: texto.slice(0, LIMITE_CARACTERES_TEXTO) };

});

module.exports = { extraerTextoDePdfGuardado };
