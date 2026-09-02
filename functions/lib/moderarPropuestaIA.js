// ==========================================================
// CLOUD FUNCTION: moderarPropuestaIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Función SEPARADA de generarPreguntasIA (cada función de IA hace una
// sola cosa) — ayuda a revisar una propuesta de "Ser el protagonista
// de la historia" (ver protagonista.js / admin-propuestas.js) dándole
// al admin una opinión de la IA sobre si el contenido parece apropiado.
//
// IMPORTANTE: esto es una AYUDA, no un filtro. El "veredicto" nunca
// aprueba, rechaza ni oculta nada — el admin sigue viendo y decidiendo
// sobre CUALQUIER propuesta sin importar qué haya dicho la IA. Publicar
// y Rechazar (ver admin-propuestas.js) no llaman a esta función ni
// dependen de su resultado en absoluto.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
// Ver la misma nota en generarPreguntasIA.js: en la versión publicada
// del SDK (^0.70), las salidas estructuradas todavía son beta.
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { ModeracionSchema } = require("./esquemaModeracion");
const { registrarUsoIA } = require("./registrarUsoIA");
const { db } = require("../admin-init");

function construirPrompt({ texto, preguntas }) {

    const textoCompleto = texto.join("\n\n");

    const bloquePreguntas = (preguntas && preguntas.length > 0)
        ? `\n\nPreguntas propuestas:\n${preguntas.map((p, i) => `${i + 1}. ${p.pregunta}`).join("\n")}`
        : "";

    return `Eres un asistente que ayuda a un administrador humano a revisar contenido enviado por usuarios para una plataforma educativa de fomento a la lectura. La plataforma es de acceso amplio: la usan tanto niños desde 10 años como adultos.

Tu única tarea es dar una OPINIÓN para que el administrador decida — tú NUNCA apruebas, rechazas ni publicas nada. Evalúa si el siguiente texto (una historia corta propuesta por un usuario) parece apropiado para esa audiencia, o si tiene algo que el administrador debería revisar con cuidado antes de decidir (por ejemplo: violencia gráfica, contenido sexual, lenguaje discriminatorio, autolesión, temas claramente fuera de lugar para una plataforma de lectura educativa). Un texto puede tratar temas serios (tristeza, miedo, pérdida, conflictos) de forma apropiada para la edad sin que eso lo haga "revisar con cuidado" — usa ese veredicto solo cuando de verdad haya algo que amerite la atención del administrador.

Texto de la propuesta:
"""
${textoCompleto}
"""${bloquePreguntas}`;

}

const moderarPropuestaIA = onCall({ secrets: ["ANTHROPIC_API_KEY"] }, async (request) => {

    await verificarAdmin(request, db);

    const datos = request.data || {};
    const texto = datos.texto;
    const preguntas = Array.isArray(datos.preguntas) ? datos.preguntas : null;

    if (!Array.isArray(texto) || texto.length === 0 || texto.every(p => !String(p).trim())) {
        throw new HttpsError("invalid-argument", "Falta el texto de la propuesta.");
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let response;
    try {
        response = await client.beta.messages.parse({
            model: "claude-opus-5",
            max_tokens: 2000,
            messages: [
                { role: "user", content: construirPrompt({ texto, preguntas }) }
            ],
            output_format: betaZodOutputFormat(ModeracionSchema)
        });
    } catch (error) {
        logger.error("Error llamando a la API de Claude (moderarPropuestaIA):", error);
        throw new HttpsError("internal", "No se pudo revisar la propuesta con IA. Intenta de nuevo.");
    }

    if (!response.parsed_output) {
        logger.error("Claude no devolvió un veredicto válido:", response.stop_reason);
        throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo.");
    }

    await registrarUsoIA({
        tipo: "analizar_sugerencia",
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
    });

    return response.parsed_output;

});

module.exports = { moderarPropuestaIA };
