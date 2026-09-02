// ==========================================================
// CLOUD FUNCTION: generarLecturaOriginalIA (Etapa 29)
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// El admin elige uno o varios GÉNEROS (de GENEROS_LECTURA, ver
// generos.js) y le pide a Claude que INVENTE una historia
// completamente original que los combine — nunca copiada, resumida ni
// adaptada de una obra existente — junto con su banco de preguntas,
// listos para revisar y editar en el mismo formulario de creación de
// lectura de siempre (nunca se guarda solo).
//
// Reusa EXACTAMENTE las mismas bandas de palabras/preguntas que ya usa
// el resto del proyecto (ver cantidadPreguntas.js) — no se inventó una
// estructura paralela: premios usa BANDAS_PREGUNTAS_PREMIO según el
// nivel elegido; Mejorar la lectura usa RANGO_PALABRAS_MEJORA +
// PREGUNTAS_MEJORA_POR_DEFECTO (3 preguntas fijas).
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { BANDAS_PREGUNTAS_PREMIO, PREGUNTAS_MEJORA_POR_DEFECTO, RANGO_PALABRAS_MEJORA } = require("./cantidadPreguntas");
const { LecturaExtraidaSchema } = require("./esquemaLecturaExtraida");
const { registrarUsoIA } = require("./registrarUsoIA");
const { db } = require("../admin-init");

const NOMBRE_NIVEL = { facil: "fácil", intermedio: "intermedio", dificil: "difícil" };
const ORDEN_NIVELES = ["facil", "intermedio", "dificil"];
const MAXIMO_GENEROS = 5;

function construirPrompt({ generos, tipo, nivel, edad, cantidadPreguntas, rangoPalabras }) {

    const listaGeneros = generos.length > 1
        ? `que combine estos géneros: ${generos.join(", ")}`
        : `del género "${generos[0]}"`;

    const contextoAudiencia = tipo === "mejora"
        ? `Esta lectura es para el catálogo "Mejorar la lectura", dirigida a un lector de ${edad ? `${edad} años` : "la edad indicada"}. El vocabulario y la complejidad deben ser apropiados para esa edad.`
        : `Esta lectura pertenece al catálogo de premios, nivel "${NOMBRE_NIVEL[nivel] || nivel || "no especificado"}". Calibra el vocabulario y la complejidad de la historia y de las preguntas a ese nivel.`;

    return `Eres un asistente que ayuda a un administrador a crear contenido ORIGINAL para una plataforma educativa de fomento a la lectura.

${contextoAudiencia}

Inventa una historia completamente NUEVA ${listaGeneros}.

IMPORTANTÍSIMO — ORIGINALIDAD: la historia debe ser inventada por ti en este momento, desde cero. NUNCA copies, resumas, adaptes ni te bases en un cuento, libro, película, fábula, leyenda o cualquier otra obra ya existente — ni aunque le cambies los nombres a los personajes o el escenario. No debe ser reconocible como ninguna obra conocida. Los personajes, el escenario y la trama deben ser completamente tuyos.

Escribe:
1. Un TÍTULO breve y atractivo para la historia (que tampoco sea el título de una obra existente).
2. El TEXTO completo de la historia, dividido en párrafos coherentes, de aproximadamente ${rangoPalabras.min} a ${rangoPalabras.max} palabras en total.
3. EXACTAMENTE ${cantidadPreguntas} preguntas de opción múltiple de comprensión lectora sobre la historia que acabas de escribir (no trivia externa), cada una con entre 3 y 4 opciones plausibles, marcando cuál opción es la correcta. Usa "a", "b", "c", "d" como valores de las opciones, en ese orden.`;

}

const generarLecturaOriginalIA = onCall(
    { secrets: ["ANTHROPIC_API_KEY"], memory: "512MiB", timeoutSeconds: 120 },
    async (request) => {

        await verificarAdmin(request, db);

        const datos = request.data || {};
        const generos = Array.isArray(datos.generos)
            ? datos.generos.map(g => String(g || "").trim()).filter(g => g.length > 0)
            : [];
        const tipo = datos.tipo;
        const nivel = datos.nivel || null;
        const edad = typeof datos.edad === "number" ? datos.edad : null;

        if (generos.length === 0) {
            throw new HttpsError("invalid-argument", "Elige al menos un género.");
        }
        if (generos.length > MAXIMO_GENEROS) {
            throw new HttpsError("invalid-argument", `Elige como máximo ${MAXIMO_GENEROS} géneros.`);
        }

        if (tipo !== "premio" && tipo !== "mejora") {
            throw new HttpsError("invalid-argument", "\"tipo\" debe ser \"premio\" o \"mejora\".");
        }

        let cantidadPreguntas;
        let rangoPalabras;

        if (tipo === "mejora") {
            cantidadPreguntas = PREGUNTAS_MEJORA_POR_DEFECTO;
            rangoPalabras = RANGO_PALABRAS_MEJORA;
        } else {
            const indiceNivel = ORDEN_NIVELES.indexOf(nivel);
            const banda = BANDAS_PREGUNTAS_PREMIO[indiceNivel] || BANDAS_PREGUNTAS_PREMIO[0];
            cantidadPreguntas = banda.preguntas;
            rangoPalabras = { min: banda.min, max: banda.max };
        }

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        let response;
        try {
            response = await client.beta.messages.parse({
                model: "claude-opus-5",
                max_tokens: 8000,
                messages: [
                    { role: "user", content: construirPrompt({ generos, tipo, nivel, edad, cantidadPreguntas, rangoPalabras }) }
                ],
                output_format: betaZodOutputFormat(LecturaExtraidaSchema)
            });
        } catch (error) {
            logger.error("Error llamando a la API de Claude (generarLecturaOriginalIA):", error);
            throw new HttpsError("internal", "No se pudo inventar la historia con IA. Intenta de nuevo, o escribe la lectura a mano.");
        }

        if (!response.parsed_output || !response.parsed_output.titulo) {
            logger.error("Claude no devolvió una lectura válida:", response.stop_reason);
            throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo.");
        }

        await registrarUsoIA({
            tipo: "inventar_historia",
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens
        });

        return response.parsed_output;

    }
);

module.exports = { generarLecturaOriginalIA };
