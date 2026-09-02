// ==========================================================
// CLOUD FUNCTION: generarPreguntasIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Recibe el texto de una lectura (de premios o de "Mejorar la
// lectura") y le pide a Claude que arme el banco de preguntas de
// opción múltiple — el admin la revisa/ajusta antes de guardar, esto
// nunca escribe nada en Firestore por su cuenta.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
// La forma "output_config: { format }" del README del SDK todavía no
// existe en la versión publicada que usa este proyecto (^0.70) — ahí,
// las salidas estructuradas son beta: client.beta.messages.parse(...)
// con "output_format" (sin "output_config") + betaZodOutputFormat.
// Verificado inspeccionando node_modules/@anthropic-ai/sdk directamente
// (ver lib/beta-parser.js y resources/beta/messages/messages.js). Si en
// el futuro actualizas el SDK y ya no es beta, este es el único lugar
// que hay que tocar (junto con moderarPropuestaIA.js).
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { contarPalabras, determinarCantidadPreguntas } = require("./cantidadPreguntas");
const { BancoPreguntasSchema } = require("./esquemaPreguntas");
const { registrarUsoIA } = require("./registrarUsoIA");
const { db } = require("../admin-init");

const NOMBRE_NIVEL = { facil: "fácil", intermedio: "intermedio", dificil: "difícil" };

function construirPrompt({ texto, tipo, nivel, edad, cantidadPreguntas }) {

    const textoCompleto = texto.join("\n\n");

    const contextoAudiencia = tipo === "mejora"
        ? `Esta lectura es para practicar velocidad y comprensión de lectura en el catálogo "Mejorar la lectura", dirigida a un lector de ${edad ? `${edad} años` : "la edad indicada"}. Las preguntas deben ser sencillas y directas, apropiadas para esa edad.`
        : `Esta lectura pertenece al catálogo de premios, nivel "${NOMBRE_NIVEL[nivel] || nivel || "no especificado"}". Calibra la dificultad de las preguntas a ese nivel.`;

    return `Eres un asistente que ayuda a un administrador a crear preguntas de comprensión de lectura para una plataforma educativa de fomento a la lectura.

${contextoAudiencia}

Genera EXACTAMENTE ${cantidadPreguntas} preguntas de opción múltiple sobre el siguiente texto. Cada pregunta debe evaluar comprensión real del texto (no trivia externa), tener entre 3 y 4 opciones plausibles, y marcar cuál opción es la correcta. Las preguntas deben estar en español, ser claras y no ambiguas, y cubrir distintas partes del texto (no todas del mismo párrafo).

Usa "a", "b", "c", "d" como valores de las opciones (en ese orden).

Texto:
"""
${textoCompleto}
"""`;

}

const generarPreguntasIA = onCall({ secrets: ["ANTHROPIC_API_KEY"] }, async (request) => {

    await verificarAdmin(request, db);

    const datos = request.data || {};
    const texto = datos.texto;
    const tipo = datos.tipo;
    const nivel = datos.nivel || null;
    const edad = typeof datos.edad === "number" ? datos.edad : null;

    if (!Array.isArray(texto) || texto.length === 0 || texto.every(p => !String(p).trim())) {
        throw new HttpsError("invalid-argument", "Falta el texto de la lectura.");
    }

    if (tipo !== "premio" && tipo !== "mejora") {
        throw new HttpsError("invalid-argument", "\"tipo\" debe ser \"premio\" o \"mejora\".");
    }

    const cantidadPalabras = contarPalabras(texto.join(" "));
    const cantidadPreguntas = determinarCantidadPreguntas(tipo, cantidadPalabras);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let response;
    try {
        response = await client.beta.messages.parse({
            model: "claude-opus-5",
            max_tokens: 8000,
            messages: [
                { role: "user", content: construirPrompt({ texto, tipo, nivel, edad, cantidadPreguntas }) }
            ],
            output_format: betaZodOutputFormat(BancoPreguntasSchema)
        });
    } catch (error) {
        logger.error("Error llamando a la API de Claude (generarPreguntasIA):", error);
        throw new HttpsError("internal", "No se pudo generar las preguntas. Intenta de nuevo.");
    }

    if (!response.parsed_output || !Array.isArray(response.parsed_output.preguntas)) {
        logger.error("Claude no devolvió un banco de preguntas válido:", response.stop_reason);
        throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo.");
    }

    await registrarUsoIA({
        tipo: "generar_preguntas",
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
    });

    return { preguntas: response.parsed_output.preguntas };

});

module.exports = { generarPreguntasIA };
