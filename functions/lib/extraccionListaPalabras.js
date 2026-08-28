// ==========================================================
// HELPER COMPARTIDO: EXTRAER/GENERAR UNA LISTA DE PALABRAS CON IA
// ==========================================================
// Usado por extraerPalabrasDeDocumentoIA.js (admin, banco general) y
// cargarGlosarioPersonalIA.js (cualquier usuario, glosario personal) —
// misma tarea exacta en los dos casos, solo cambia quién puede
// llamarla y cuántas palabras se le permiten. NO es una Cloud Function
// en sí misma.
// ==========================================================

const Anthropic = require("@anthropic-ai/sdk");
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { ListaPalabrasSchema } = require("./esquemaPalabra");

function construirPromptListaPalabras(textoDocumento, maxPalabras) {
    return `Eres un asistente que ayuda a preparar el banco de palabras del juego "Ahorcado" a partir de un documento con una lista de palabras.

El documento puede traer SOLO palabras sueltas, o palabras junto con su definición/significado. Para cada palabra que encuentres:

1. Si ya trae una definición o significado junto a ella, úsala tal cual (resúmela solo si es muy larga, pero conserva el sentido exacto).
2. Si NO trae definición, genera tú una definición corta y clara (una oración, apropiada como pista de un juego de adivinar palabras — no debe contener la palabra misma).

Ignora cualquier cosa que no sea una palabra de la lista (encabezados, numeración, instrucciones, metadatos).

Devuelve como máximo ${maxPalabras} palabras (si el documento trae más, elige las primeras ${maxPalabras} que aparezcan).

Documento:
"""
${textoDocumento}
"""`;
}

/**
 * @param {string} textoDocumento
 * @param {number} maxPalabras
 * @returns {Promise<Array<{palabra:string, pista:string}>>}
 */
async function extraerListaPalabrasConIA(textoDocumento, maxPalabras) {

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.beta.messages.parse({
        model: "claude-opus-5",
        max_tokens: 16000,
        messages: [
            { role: "user", content: construirPromptListaPalabras(textoDocumento, maxPalabras) }
        ],
        output_format: betaZodOutputFormat(ListaPalabrasSchema)
    });

    if (!response.parsed_output || !Array.isArray(response.parsed_output.palabras)) {
        throw new Error("La IA no devolvió una lista de palabras válida.");
    }

    return response.parsed_output.palabras.slice(0, maxPalabras);

}

module.exports = { extraerListaPalabrasConIA };
