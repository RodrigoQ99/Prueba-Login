// ==========================================================
// CLOUD FUNCTION: moderarTemaIA (Etapa 37)
// ==========================================================
// EXCEPCIÓN a la regla del resto del archivo: esta función NO es
// exclusiva de administradores — la usa cualquier usuario autenticado
// durante el REGISTRO, al escribir un tema de interés propio en la
// opción "Otro" (ver registro.js). Por eso:
//
//   - Solo pide estar autenticado (no ser admin).
//   - El texto que revisa está topado a pocos caracteres, así que la
//     llamada a Claude es mínima y no se puede usar para "colar" un
//     prompt largo a costa del presupuesto.
//   - Devuelve únicamente apto/no apto: no escribe nada que el usuario
//     controle libremente.
//
// Si el tema es APTO, la función misma lo agrega a la lista global
// (configuracion/generosLectura.lista) con el Admin SDK — el usuario
// nunca escribe en ese documento (firestore.rules solo deja al admin),
// así nadie puede meter un tema a la lista saltándose la moderación.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { z } = require("zod");
const { registrarUsoIA } = require("./registrarUsoIA");
const { db } = require("../admin-init");

const MAXIMO_CARACTERES_TEMA = 40;
const MAXIMO_TEMAS_EN_LISTA = 60;

const VeredictoTemaSchema = z.object({
    apto: z.boolean(),
    motivo: z.string().min(1),
    // El mismo tema, escrito de forma limpia y consistente con el resto
    // de la lista (una o dos palabras, mayúscula inicial) — así "terror
    // psicologico!!" entra como "Terror psicológico".
    temaNormalizado: z.string().min(1).max(MAXIMO_CARACTERES_TEMA)
});

function construirPrompt(tema, listaActual) {

    return `Eres el moderador de una plataforma educativa de fomento a la lectura, usada por niños, adolescentes y adultos.

Un usuario propuso este TEMA DE INTERÉS de lectura para agregarlo a la lista que ven todos los usuarios al registrarse:
"""
${tema}
"""

La lista actual de temas es: ${listaActual.join(", ")}.

Decide si es APTO para aparecer en esa lista pública. Un tema es APTO si:
- Es realmente un tema o género de lectura (ej. "Poesía", "Mitología", "Cocina").
- Es apropiado para todas las edades, incluidos niños.
- No es ofensivo, sexual, violento explícito, discriminatorio, ni promueve nada ilegal o dañino.
- No es spam, publicidad, un nombre propio de persona, un insulto disfrazado, ni texto sin sentido.
- No es prácticamente el mismo que uno que ya está en la lista (una variante o sinónimo obvio).

Devuelve:
- "apto": true o false.
- "motivo": una frase corta, dirigida AL USUARIO, explicando por qué sí o por qué no (en español, amable y sin regañar).
- "temaNormalizado": el tema escrito limpio para la lista (una o dos palabras, con mayúscula inicial y bien acentuado). Si no es apto, devuelve aquí el mismo texto original recortado.`;

}

const moderarTemaIA = onCall({ secrets: ["ANTHROPIC_API_KEY"] }, async (request) => {

    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes iniciar sesión para proponer un tema.");
    }

    const tema = String((request.data || {}).tema || "").trim().slice(0, MAXIMO_CARACTERES_TEMA);

    if (tema.length < 3) {
        throw new HttpsError("invalid-argument", "Escribe un tema de al menos 3 letras.");
    }

    // Lista actual, para que Claude pueda detectar duplicados y para
    // agregarle el tema nuevo si resulta apto.
    let listaActual = [];
    try {
        const doc = await db.collection("configuracion").doc("generosLectura").get();
        if (doc.exists && Array.isArray(doc.data().lista)) listaActual = doc.data().lista;
    } catch (error) {
        logger.error("No se pudo leer configuracion/generosLectura:", error);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let response;
    try {
        response = await client.beta.messages.parse({
            model: "claude-opus-5",
            max_tokens: 500,
            messages: [{ role: "user", content: construirPrompt(tema, listaActual) }],
            output_format: betaZodOutputFormat(VeredictoTemaSchema)
        });
    } catch (error) {
        logger.error("Error llamando a la API de Claude (moderarTemaIA):", error);
        throw new HttpsError("internal", "No se pudo revisar el tema ahora mismo. Intenta de nuevo.");
    }

    const veredicto = response.parsed_output;
    if (!veredicto) {
        throw new HttpsError("internal", "No se pudo revisar el tema ahora mismo. Intenta de nuevo.");
    }

    await registrarUsoIA({
        tipo: "moderar_tema",
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
    });

    if (!veredicto.apto) {
        return { apto: false, motivo: veredicto.motivo, tema: null };
    }

    const temaLimpio = veredicto.temaNormalizado.trim().slice(0, MAXIMO_CARACTERES_TEMA);

    // Ya estaba (o es una variante que Claude normalizó al mismo texto):
    // se acepta, pero no se duplica en la lista.
    const yaEstaba = listaActual.some(t => t.toLowerCase() === temaLimpio.toLowerCase());

    if (!yaEstaba && listaActual.length < MAXIMO_TEMAS_EN_LISTA) {
        try {
            await db.collection("configuracion").doc("generosLectura").set(
                { lista: [...listaActual, temaLimpio] },
                { merge: true }
            );
        } catch (error) {
            logger.error("No se pudo agregar el tema a la lista global:", error);
            // No es motivo para rechazarlo: el usuario igual se queda con
            // su tema marcado, solo que no entra a la lista de todos.
        }
    }

    return { apto: true, motivo: veredicto.motivo, tema: temaLimpio };

});

module.exports = { moderarTemaIA };
