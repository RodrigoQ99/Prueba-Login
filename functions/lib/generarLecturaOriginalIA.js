// ==========================================================
// CLOUD FUNCTION: generarLecturaOriginalIA (Etapa 29 / ajuste Etapa 25)
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// El admin elige uno o varios GÉNEROS (de GENEROS_LECTURA, ver
// generos.js) y le pide a Claude que INVENTE una historia
// completamente original que los combine, junto con su banco de
// preguntas, listos para revisar y editar en el formulario de creación
// de lectura de siempre (nunca se guarda solo).
//
// RANGOS DE PALABRAS / TIEMPO (ajuste Etapa 25) — SOLO para ESTA
// función de "Inventar historia con IA". No tocan
// determinarCantidadPreguntas ni protagonista.js: las lecturas que el
// admin escribió a mano se quedan exactamente como están.
//   - Fácil:      1 a 2 min  ->  180 a 360 palabras
//   - Intermedio: 3 a 5 min  ->  540 a 900 palabras
//   - Difícil:    6 a 7 min  -> 1080 a 1260 palabras
// (a "palabras por minuto" configurable, 180 por defecto).
// La CANTIDAD de preguntas por nivel NO cambia (5 / 8 / 11, sale de
// BANDAS_PREGUNTAS_PREMIO).
//
// El "tiempoLectura" se calcula solo a partir de las palabras que
// devuelve Claude:  palabras / ppm * 60, redondeado a los 10 s más
// cercanos (residuo >= 5 sube, < 5 baja), MÁS la espera inicial del
// motor y su margen de seguridad de 2 s. Así, sin tocar motor.js, el
// tramo en que el texto se está moviendo dura exactamente
// palabras/ppm*60 y alguien que lea a "ppm" exactas termina de ver el
// texto justo cuando el cronómetro llega a 0.
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

// Rangos de palabras EXCLUSIVOS de "Inventar historia con IA".
const RANGOS_PALABRAS_INVENTAR = {
    facil:      { min: 180,  max: 360 },
    intermedio: { min: 540,  max: 900 },
    dificil:    { min: 1080, max: 1260 }
};

const PPM_POR_DEFECTO = 180;
const ESPERA_INICIAL_POR_DEFECTO = 3;
// Igual que MARGEN_SEGURIDAD en motor.js: el texto termina de moverse
// unos segundos antes del 0. Se SUMA aquí (con la espera inicial) para
// no tener que restárselo al tiempo de lectura real (ver nota de arriba).
const MARGEN_SEGURIDAD_MOTOR = 2;

function contarPalabrasTexto(parrafos) {
    const texto = Array.isArray(parrafos) ? parrafos.join(" ") : String(parrafos || "");
    return texto.trim().split(/\s+/).filter(Boolean).length;
}

// Redondea a la decena más cercana: residuo >= 5 sube, < 5 baja.
// Ej: 167 -> 170, 164 -> 160.
function redondearA10(segundos) {
    const decena = Math.floor(segundos / 10) * 10;
    return (segundos - decena) >= 5 ? decena + 10 : decena;
}

function calcularTiempoLecturaIA(palabras, ppm, esperaInicial) {
    const base = redondearA10((palabras / ppm) * 60);
    return base + esperaInicial + MARGEN_SEGURIDAD_MOTOR;
}

async function leerConfiguracionTiempos() {

    let ppm = PPM_POR_DEFECTO;
    let esperaInicial = ESPERA_INICIAL_POR_DEFECTO;

    try {
        const doc = await db.collection("configuracion").doc("generacionIA").get();
        const v = doc.exists ? doc.data().palabrasPorMinuto : null;
        if (typeof v === "number" && v > 0) ppm = v;
    } catch (error) {
        logger.error("No se pudo leer configuracion/generacionIA:", error);
    }

    try {
        const doc = await db.collection("configuracion").doc("lecturaPremios").get();
        const v = doc.exists ? doc.data().esperaInicialSegundos : null;
        if (typeof v === "number" && v >= 0) esperaInicial = v;
    } catch (error) {
        logger.error("No se pudo leer configuracion/lecturaPremios:", error);
    }

    return { ppm, esperaInicial };
}

function construirPrompt({ generos, tipo, nivel, edad, cantidadPreguntas, rangoPalabras }) {

    const listaGeneros = generos.length > 1
        ? `que combine estos géneros: ${generos.join(", ")}`
        : `del género "${generos[0]}"`;

    const contextoAudiencia = tipo === "mejora"
        ? `Esta lectura es para el catálogo "Mejorar la lectura", dirigida a un lector de ${edad ? `${edad} años` : "la edad indicada"}. El vocabulario y la complejidad deben ser apropiados para esa edad.`
        : `Esta lectura pertenece al catálogo de premios, nivel "${NOMBRE_NIVEL[nivel] || nivel || "no especificado"}". Calibra el vocabulario y la complejidad de la historia y de las preguntas a ese nivel.`;

    const objetivo = Math.round((rangoPalabras.min + rangoPalabras.max) / 2);

    return `Eres un asistente que ayuda a un administrador a crear contenido ORIGINAL para una plataforma educativa de fomento a la lectura.

${contextoAudiencia}

Inventa una historia completamente NUEVA ${listaGeneros}.

IMPORTANTÍSIMO — ORIGINALIDAD: la historia debe ser inventada por ti en este momento, desde cero. NUNCA copies, resumas, adaptes ni te bases en un cuento, libro, película, fábula, leyenda o cualquier otra obra ya existente — ni aunque le cambies los nombres a los personajes o el escenario. No debe ser reconocible como ninguna obra conocida. Los personajes, el escenario y la trama deben ser completamente tuyos.

Escribe:
1. Un TÍTULO breve y atractivo para la historia (que tampoco sea el título de una obra existente).
2. El TEXTO completo de la historia, dividido en párrafos coherentes, de alrededor de ${objetivo} palabras en total (mínimo ${rangoPalabras.min}, máximo ${rangoPalabras.max} palabras). Ajústate a ese conteo lo mejor que puedas: es importante para calcular el tiempo de lectura.
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
            cantidadPreguntas = banda.preguntas; // 5 / 8 / 11 — sin cambios
            rangoPalabras = RANGOS_PALABRAS_INVENTAR[nivel] || RANGOS_PALABRAS_INVENTAR.facil;
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

        // ---- Tiempo de lectura automático (solo catálogo de premios) ----
        const palabrasTexto = contarPalabrasTexto(response.parsed_output.texto);

        let tiempoLectura = null;
        let palabrasPorMinuto = null;

        if (tipo === "premio") {
            const { ppm: ppmConfig, esperaInicial } = await leerConfiguracionTiempos();
            palabrasPorMinuto = (typeof datos.palabrasPorMinuto === "number" && datos.palabrasPorMinuto > 0)
                ? datos.palabrasPorMinuto
                : ppmConfig;
            tiempoLectura = calcularTiempoLecturaIA(palabrasTexto, palabrasPorMinuto, esperaInicial);
        }

        return {
            ...response.parsed_output,
            tiempoLectura,
            palabrasTexto,
            palabrasObjetivo: rangoPalabras,
            palabrasPorMinuto
        };

    }
);

module.exports = { generarLecturaOriginalIA };
