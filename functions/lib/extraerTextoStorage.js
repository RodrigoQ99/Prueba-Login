// ==========================================================
// HELPER COMPARTIDO: EXTRAER TEXTO DE UN ARCHIVO EN STORAGE
// ==========================================================
// Usado por extraerLecturaDeDocumentoIA.js, extraerPalabrasDeDocumentoIA.js
// y cargarGlosarioPersonalIA.js — descarga un archivo de Storage y
// devuelve su texto plano (PDF, .docx o .txt). NO es una Cloud
// Function en sí misma, solo lógica compartida para no repetirla en
// cada una.
//
// pdf-parse y mammoth se cargan DENTRO de la función (no arriba) a
// propósito: si alguno de los dos no está instalado (pasó en la
// práctica con mammoth por un problema del registro de npm), que solo
// falle ESE formato específico al usarlo, no toda la función que lo
// llama desde que arranca.
// ==========================================================

const { admin } = require("../admin-init");

async function extraerTextoDeStorage(storagePath) {

    const extension = (storagePath.split(".").pop() || "").toLowerCase();

    const [buffer] = await admin.storage().bucket().file(storagePath).download();

    if (extension === "pdf") {
        let pdfParse;
        try {
            pdfParse = require("pdf-parse");
        } catch (error) {
            throw new Error("El soporte para PDF no está instalado en el servidor todavía (falta \"pdf-parse\").");
        }
        const data = await pdfParse(buffer);
        return data.text;
    }

    if (extension === "docx") {
        let mammoth;
        try {
            mammoth = require("mammoth");
        } catch (error) {
            throw new Error("El soporte para Word (.docx) no está instalado en el servidor todavía (falta \"mammoth\"). Mientras tanto puedes subir el mismo documento como PDF o .txt.");
        }
        const resultado = await mammoth.extractRawText({ buffer });
        return resultado.value;
    }

    if (extension === "txt") {
        return buffer.toString("utf8");
    }

    throw new Error(`Formato de archivo no soportado: .${extension}`);

}

module.exports = { extraerTextoDeStorage };
