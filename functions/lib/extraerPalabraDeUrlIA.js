// ==========================================================
// CLOUD FUNCTION: extraerPalabraDeUrlIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Recibe la URL de una página de diccionario en línea (ej. RAE), la
// descarga, y le pide a Claude que extraiga ÚNICAMENTE la palabra y su
// significado específico de ESA página — ignorando sugerencias de
// palabras relacionadas, anuncios, u otro contenido que pueda aparecer
// en la misma página. El admin revisa el resultado antes de agregarlo
// al banco (reusa el mismo formulario de una sola palabra de siempre).
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
// Ver la misma nota en generarPreguntasIA.js: en la versión publicada
// del SDK (^0.70), las salidas estructuradas todavía son beta.
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { PalabraUnicaSchema } = require("./esquemaPalabra");
const { db } = require("../admin-init");

const LIMITE_CARACTERES_PAGINA = 40000;

// Aunque quien llama ya es un administrador de confianza, se valida la
// URL como defensa adicional: nunca se acepta un protocolo distinto de
// http/https, ni un destino que apunte a la propia infraestructura de
// la nube (ej. el servidor de metadatos de Google Cloud) o a redes
// privadas — un caso conocido de SSRF que conviene bloquear siempre,
// sin importar quién hace la petición.
function validarUrlSegura(urlTexto) {

    let url;
    try {
        url = new URL(urlTexto);
    } catch (error) {
        throw new HttpsError("invalid-argument", "Esa URL no es válida.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new HttpsError("invalid-argument", "Solo se aceptan URLs que empiecen con http:// o https://.");
    }

    const host = url.hostname.toLowerCase();
    const esPrivada =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "169.254.169.254" || // servidor de metadatos de la nube
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host);

    if (esPrivada) {
        throw new HttpsError("invalid-argument", "Esa URL no está permitida.");
    }

    return url;

}

function limpiarHtml(html) {
    // Recorte simple (no un parser HTML completo): quita los bloques que
    // casi nunca tienen contenido útil para esto y solo agregan ruido/
    // costo — Claude puede leer el resto del HTML tal cual perfectamente.
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function construirPrompt(html, url) {
    return `Eres un asistente que ayuda a un administrador a agregar una palabra al banco de un juego de adivinar palabras, a partir de una página de diccionario en línea.

La página fue descargada de: ${url}

Extrae ÚNICAMENTE la palabra principal que define esta página, y su significado específico — en una definición corta y clara (una oración, sin repetir la palabra misma dentro de la definición, apropiada como pista de un juego). Si la palabra tiene varias acepciones, usa la primera/principal.

IMPORTANTE: la página puede incluir "palabras relacionadas", sugerencias, anuncios, menús de navegación, u otro contenido que NO es la definición de la palabra principal — ignora todo eso por completo.

Contenido HTML de la página:
"""
${html}
"""`;
}

const extraerPalabraDeUrlIA = onCall({ secrets: ["ANTHROPIC_API_KEY"], timeoutSeconds: 60 }, async (request) => {

    await verificarAdmin(request, db);

    const datos = request.data || {};
    const urlTexto = typeof datos.url === "string" ? datos.url.trim() : "";

    if (!urlTexto) {
        throw new HttpsError("invalid-argument", "Falta la URL.");
    }

    const url = validarUrlSegura(urlTexto);

    let html;
    try {
        const respuesta = await fetch(url.toString(), {
            redirect: "follow",
            signal: AbortSignal.timeout(15000),
            headers: { "User-Agent": "Mozilla/5.0 (compatible; LectortrixBot/1.0)" }
        });
        if (!respuesta.ok) {
            throw new Error(`La página respondió con estado ${respuesta.status}.`);
        }
        html = await respuesta.text();
    } catch (error) {
        logger.error("No se pudo descargar la página del diccionario:", error);
        throw new HttpsError("unavailable", "No se pudo abrir esa página. Revisa el enlace e intenta de nuevo.");
    }

    const htmlLimpio = limpiarHtml(html).slice(0, LIMITE_CARACTERES_PAGINA);

    if (!htmlLimpio) {
        throw new HttpsError("invalid-argument", "Esa página no parece tener contenido legible.");
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let response;
    try {
        response = await client.beta.messages.parse({
            model: "claude-opus-5",
            max_tokens: 1000,
            messages: [
                { role: "user", content: construirPrompt(htmlLimpio, url.toString()) }
            ],
            output_format: betaZodOutputFormat(PalabraUnicaSchema)
        });
    } catch (error) {
        logger.error("Error llamando a la API de Claude (extraerPalabraDeUrlIA):", error);
        throw new HttpsError("internal", "No se pudo procesar esa página con IA. Intenta de nuevo.");
    }

    if (!response.parsed_output) {
        logger.error("Claude no devolvió una palabra válida:", response.stop_reason);
        throw new HttpsError("internal", "No se pudo identificar una palabra en esa página. Agrégala a mano.");
    }

    return response.parsed_output;

});

module.exports = { extraerPalabraDeUrlIA };
