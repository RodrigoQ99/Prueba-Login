// ==========================================================
// CLOUD FUNCTION: extraerLecturaDeDocumentoIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Recibe la ruta (en Firebase Storage) de un documento que el admin
// subió (PDF, .docx o .txt) con una historia y —opcionalmente— sus
// preguntas ya escritas, y le pide a Claude que separe todo en el
// mismo formato que usa el resto del proyecto: título, párrafos, y
// banco de preguntas — listo para llenar el formulario y que el admin
// lo revise antes de guardar (nunca se guarda solo).
//
// Si el documento no traía preguntas, se generan igual (misma lógica
// de cantidadPreguntas.js que ya usa generarPreguntasIA — no se
// reinventa). El archivo se borra de Storage apenas se termina de
// leer (éxito o error) — es solo un archivo de entrada transitorio,
// nunca queda guardado de forma permanente.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
// Ver la misma nota en generarPreguntasIA.js: en la versión publicada
// del SDK (^0.70), las salidas estructuradas todavía son beta.
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { contarPalabras, determinarCantidadPreguntas } = require("./cantidadPreguntas");
const { LecturaExtraidaSchema } = require("./esquemaLecturaExtraida");
const { db, admin } = require("../admin-init");

const NOMBRE_NIVEL = { facil: "fácil", intermedio: "intermedio", dificil: "difícil" };

// Tope de seguridad: un documento razonable para UNA lectura nunca se
// acerca a esto — es solo para no disparar el costo si alguien sube
// por error un archivo gigante con mucho más que una sola historia.
const LIMITE_CARACTERES_DOCUMENTO = 60000;

// pdf-parse y mammoth se cargan AQUÍ ADENTRO (no arriba, con el resto
// de los require) a propósito: si algún día uno de los dos no está
// instalado (ej. falló su descarga al hacer npm install — pasó en la
// práctica con mammoth por un problema del registro de npm), que solo
// se caiga ESE formato específico al usarlo, no toda la función desde
// que arranca. Así PDF y .txt siguen funcionando aunque falte Word, y
// viceversa.
async function extraerTextoDelArchivo(buffer, storagePath) {

    const extension = (storagePath.split(".").pop() || "").toLowerCase();

    if (extension === "pdf") {
        let pdfParse;
        try {
            pdfParse = require("pdf-parse");
        } catch (error) {
            throw new Error("El soporte para PDF no está instalado en el servidor todavía (falta \"pdf-parse\" — revisa functions/README.md).");
        }
        const data = await pdfParse(buffer);
        return data.text;
    }

    if (extension === "docx") {
        let mammoth;
        try {
            mammoth = require("mammoth");
        } catch (error) {
            throw new Error("El soporte para Word (.docx) no está instalado en el servidor todavía (falta \"mammoth\" — revisa functions/README.md). Mientras tanto puedes subir el mismo documento como PDF o .txt.");
        }
        const resultado = await mammoth.extractRawText({ buffer });
        return resultado.value;
    }

    if (extension === "txt") {
        return buffer.toString("utf8");
    }

    throw new Error(`Formato de archivo no soportado: .${extension}`);

}

function construirPrompt({ textoDocumento, tipo, nivel, edad, cantidadPreguntas }) {

    const contextoAudiencia = tipo === "mejora"
        ? `Esta lectura es para el catálogo "Mejorar la lectura", dirigida a un lector de ${edad ? `${edad} años` : "la edad indicada"}.`
        : `Esta lectura pertenece al catálogo de premios, nivel "${NOMBRE_NIVEL[nivel] || nivel || "no especificado"}".`;

    return `Eres un asistente que ayuda a un administrador a preparar el contenido de una lectura para una plataforma educativa de fomento a la lectura, a partir de un documento que subió.

${contextoAudiencia}

A continuación está el texto completo extraído de ese documento (puede incluir ruido propio de la extracción automática, como saltos de línea irregulares, encabezados o pies de página repetidos — ignora ese ruido). Tu tarea:

1. Identifica el TÍTULO de la historia (si el documento no trae uno explícito, propone uno breve y apropiado según el contenido).
2. Separa el TEXTO PRINCIPAL en párrafos coherentes. Excluye de ahí cualquier pregunta, cuestionario, numeración de página o metadato — eso no es parte de la historia.
3. Si el documento YA incluye preguntas de comprensión con sus opciones y la respuesta correcta marcada o indicada, extráelas tal cual (en español, con el mismo formato pedido abajo). Si el documento NO incluye preguntas (o vienen incompletas, sin indicar cuál es la correcta), genera tú EXACTAMENTE ${cantidadPreguntas} preguntas de opción múltiple de comprensión de lectura sobre el texto, con 3 a 4 opciones cada una, usando "a", "b", "c", "d" como valores de las opciones.

Texto extraído del documento:
"""
${textoDocumento}
"""`;

}

const extraerLecturaDeDocumentoIA = onCall(
    { secrets: ["ANTHROPIC_API_KEY"], memory: "512MiB", timeoutSeconds: 120 },
    async (request) => {

        await verificarAdmin(request, db);

        const datos = request.data || {};
        const storagePath = datos.storagePath;
        const tipo = datos.tipo;
        const nivel = datos.nivel || null;
        const edad = typeof datos.edad === "number" ? datos.edad : null;

        // "fuentesLecturas/" es la ÚNICA carpeta que estas funciones tocan
        // (ver storage.rules) — no se acepta ninguna otra ruta, por si
        // alguien manipulara la llamada desde la consola del navegador.
        if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith("fuentesLecturas/")) {
            throw new HttpsError("invalid-argument", "Falta la ruta del documento subido.");
        }

        if (tipo !== "premio" && tipo !== "mejora") {
            throw new HttpsError("invalid-argument", "\"tipo\" debe ser \"premio\" o \"mejora\".");
        }

        const archivo = admin.storage().bucket().file(storagePath);

        let buffer;
        try {
            const [contenido] = await archivo.download();
            buffer = contenido;
        } catch (error) {
            logger.error("No se pudo descargar el documento subido:", error);
            throw new HttpsError("not-found", "No se pudo encontrar el documento subido. Intenta subirlo de nuevo.");
        }

        let textoDocumento;
        try {
            textoDocumento = (await extraerTextoDelArchivo(buffer, storagePath)).trim();
        } catch (error) {
            logger.error("No se pudo extraer texto del documento:", error);
            archivo.delete().catch(() => {});
            throw new HttpsError(
                "invalid-argument",
                "No se pudo leer ese documento — puede estar dañado, protegido, o en un formato no soportado. Completa el formulario a mano."
            );
        }

        // Ya se tiene el texto en memoria — el archivo original ya no hace
        // falta. Se borra siempre desde aquí en adelante (éxito o error de
        // Claude), es solo un archivo de entrada transitorio.
        archivo.delete().catch(error => logger.warn("No se pudo borrar el documento temporal:", error));

        if (!textoDocumento || textoDocumento.length < 20) {
            throw new HttpsError("invalid-argument", "El documento no parece tener texto legible. Completa el formulario a mano.");
        }

        textoDocumento = textoDocumento.slice(0, LIMITE_CARACTERES_DOCUMENTO);

        const cantidadPalabras = contarPalabras(textoDocumento);
        const cantidadPreguntas = determinarCantidadPreguntas(tipo, cantidadPalabras);

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        let response;
        try {
            response = await client.beta.messages.parse({
                model: "claude-opus-5",
                max_tokens: 8000,
                messages: [
                    { role: "user", content: construirPrompt({ textoDocumento, tipo, nivel, edad, cantidadPreguntas }) }
                ],
                output_format: betaZodOutputFormat(LecturaExtraidaSchema)
            });
        } catch (error) {
            logger.error("Error llamando a la API de Claude (extraerLecturaDeDocumentoIA):", error);
            throw new HttpsError("internal", "No se pudo procesar el documento con IA. Intenta de nuevo, o completa el formulario a mano.");
        }

        if (!response.parsed_output) {
            logger.error("Claude no devolvió una lectura válida:", response.stop_reason);
            throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo, o completa el formulario a mano.");
        }

        return response.parsed_output;

    }
);

module.exports = { extraerLecturaDeDocumentoIA };
