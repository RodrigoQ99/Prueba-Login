// ==========================================================
// CLOUD FUNCTION: dividirFragmentoEnHiloIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// El admin YA ELIGIÓ a mano el fragmento exacto de texto que quiere
// usar para "El Hilo del día" (ver extraerTextoDePdfGuardado.js — la
// IA nunca elige esa parte por su cuenta). Esta función solo divide
// ESE fragmento, tal como viene, en exactamente 5 partes narrativamente
// coherentes y en el orden correcto — el admin las revisa/ajusta en el
// editor de siempre antes de guardar (el juego las desordena SOLO al
// mostrarlas; la base de datos siempre guarda el orden real).
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
// Ver la misma nota en generarPreguntasIA.js: en la versión publicada
// del SDK (^0.70), las salidas estructuradas todavía son beta.
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { FragmentosHiloSchema } = require("./esquemaHiloDia");
const { db } = require("../admin-init");

// Tope de seguridad — un fragmento para un solo día de juego nunca se
// acerca a esto; es solo para no disparar el costo si se pega por
// error un texto enorme.
const LIMITE_CARACTERES_FRAGMENTO = 20000;

function construirPrompt(fragmento) {
    return `Eres un asistente que ayuda a un administrador a preparar el contenido del juego "El Hilo del día": cada día, los jugadores ven un fragmento narrativo dividido en 5 partes desordenadas y deben reconstruir el orden correcto.

El administrador ya eligió a mano el fragmento exacto que quiere usar (a continuación) — tu ÚNICA tarea es dividir ESE fragmento, TAL COMO ESTÁ, en EXACTAMENTE 5 partes. No resumas, no parafrasees, no agregues ni quites contenido — solo decide dónde cortar el texto original en 5 tramos.

Cada una de las 5 partes debe ser narrativamente coherente por sí sola, y las cinco leídas EN ORDEN deben contar la historia correctamente, de forma que un jugador pueda reconstruir ese orden guiándose por pistas narrativas normales (progresión temporal, causa y efecto, etc.) — ni demasiado obvio, ni imposible.

Fragmento elegido por el administrador:
"""
${fragmento}
"""`;
}

const dividirFragmentoEnHiloIA = onCall({ secrets: ["ANTHROPIC_API_KEY"] }, async (request) => {

    await verificarAdmin(request, db);

    const datos = request.data || {};
    const fragmento = typeof datos.fragmento === "string" ? datos.fragmento.trim() : "";

    if (!fragmento) {
        throw new HttpsError("invalid-argument", "Falta el fragmento de texto a dividir.");
    }

    if (fragmento.length < 50) {
        throw new HttpsError("invalid-argument", "El fragmento es demasiado corto para dividirlo en 5 partes con sentido.");
    }

    const fragmentoRecortado = fragmento.slice(0, LIMITE_CARACTERES_FRAGMENTO);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let response;
    try {
        response = await client.beta.messages.parse({
            model: "claude-opus-5",
            max_tokens: 4000,
            messages: [
                { role: "user", content: construirPrompt(fragmentoRecortado) }
            ],
            output_format: betaZodOutputFormat(FragmentosHiloSchema)
        });
    } catch (error) {
        logger.error("Error llamando a la API de Claude (dividirFragmentoEnHiloIA):", error);
        throw new HttpsError("internal", "No se pudo dividir el fragmento con IA. Intenta de nuevo, o escribe los 5 párrafos a mano.");
    }

    if (!response.parsed_output) {
        logger.error("Claude no devolvió 5 fragmentos válidos:", response.stop_reason);
        throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo, o escribe los 5 párrafos a mano.");
    }

    return response.parsed_output;

});

module.exports = { dividirFragmentoEnHiloIA };
