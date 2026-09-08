// ==========================================================
// CLOUD FUNCTION: generarPreguntasIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Recibe el texto de una lectura (de premios o de "Mejorar la
// lectura") y le pide a Claude el BANCO COMPLETO de preguntas: N de
// CADA UNO de los cinco tipos, donde N sale del nivel de la lectura
// (ver cantidadPreguntas.js) — el admin ya no elige tipo por tipo.
//
// De paso, en la MISMA llamada, Claude clasifica el texto en uno de los
// géneros configurados (configuracion/generosLectura) — eso reemplaza
// el campo de género que antes llenaba el admin a mano (Etapa 36), y no
// cuesta una llamada extra.
//
// El admin revisa/ajusta todo antes de guardar: esto nunca escribe nada
// en Firestore por su cuenta.
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
const { determinarPreguntasPorTipo, DISTRACTORES_POR_PREGUNTA } = require("./cantidadPreguntas");
const { BancoPreguntasSchema } = require("./esquemaPreguntas");
const { registrarUsoIA } = require("./registrarUsoIA");
const { db } = require("../admin-init");

const NOMBRE_NIVEL = { facil: "fácil", intermedio: "intermedio", dificil: "difícil" };

const GENEROS_POR_DEFECTO = [
    "Aventura", "Misterio", "Ciencia", "Biografías", "Terror",
    "Humor", "Fantasía", "Deportes", "Romance", "Historia"
];

// Misma lista que administra el admin desde su portal (ver generos.js /
// configuracion/generosLectura). Se lee aquí para que Claude clasifique
// el texto SOLO entre los géneros que realmente existen en la app.
async function leerGenerosDisponibles() {

    try {
        const doc = await db.collection("configuracion").doc("generosLectura").get();
        const lista = doc.exists ? doc.data().lista : null;
        if (Array.isArray(lista) && lista.length > 0) return lista;
    } catch (error) {
        logger.error("No se pudo leer configuracion/generosLectura:", error);
    }

    return GENEROS_POR_DEFECTO;

}

// Instrucciones de forma de cada tipo, con un ejemplo — compartidas con
// generarLecturaOriginalIA.js (ese archivo tiene su propia copia
// adaptada a "la historia que acabas de inventar").
function bloqueTiposDePregunta(porTipo) {

    return `Genera EXACTAMENTE ${porTipo} preguntas de CADA UNO de los cinco tipos (${porTipo * 5} preguntas en total). No omitas ningún tipo ni cambies las cantidades.

Cada tipo tiene una FORMA fija — respétala exactamente, con este ejemplo (inventado, no del texto real) de cada uno:

- "opcionMultiple": una PREGUNTA (termina en "?"), la "respuestaCorrecta" en texto, y EXACTAMENTE ${DISTRACTORES_POR_PREGUNTA} "distractores": respuestas incorrectas PLAUSIBLES y del mismo estilo/largo que la correcta (la app muestra la correcta + algunos distractores al azar, así que TODOS deben ser claramente incorrectos y ninguno puede repetir la correcta).
  Ejemplo: { "tipo": "opcionMultiple", "pregunta": "¿Qué encontró Marta debajo del árbol?", "respuestaCorrecta": "Un nido", "distractores": ["Una moneda", "Un libro", "Una piedra", "Un zapato", "Una carta", "Un mapa"] }
- "vf": una AFIRMACIÓN declarativa (nunca termina en "?", nunca lleva "___") que se pueda juzgar verdadera o falsa tal cual, con "correcta": true o false. Reparte más o menos parejo cuántas son verdaderas y cuántas falsas.
  Ejemplo: { "tipo": "vf", "pregunta": "Marta encontró un nido debajo del árbol.", "correcta": true }
- "completar": una oración del texto (o muy cercana) con UN Y SOLO UN espacio marcado EXACTAMENTE como "___" en el lugar del dato que falta — nunca una oración completa sin ningún "___", y nunca uses "___" en ningún otro tipo. "respuestasValidas" trae 2 a 4 formas correctas de llenarlo (con y sin artículo, singular/plural, sinónimos aceptables).
  Ejemplo: { "tipo": "completar", "pregunta": "Debajo del árbol, Marta encontró un ___.", "respuestasValidas": ["nido", "un nido", "nido de pájaros"] }
- "ordenar": 3 a 5 fragmentos ("partes") en el ORDEN CORRECTO en que ocurren en el texto — el frontend los revuelve solo para mostrarlos, tú entrégalos ya en orden.
  Ejemplo: { "tipo": "ordenar", "pregunta": "Ordena lo que hizo Marta esa mañana.", "partes": ["Se despertó temprano", "Salió a caminar al parque", "Encontró un nido debajo del árbol"] }
- "textoLibre": una pregunta ABIERTA de respuesta corta e inequívoca (nunca "___"), con "respuestasValidas" listando 2 a 4 respuestas cortas aceptables (se comparan sin importar mayúsculas ni tildes).
  Ejemplo: { "tipo": "textoLibre", "pregunta": "¿Qué encontró Marta debajo del árbol?", "respuestasValidas": ["un nido", "nido"] }

ERROR A EVITAR: el "___" es EXCLUSIVO de "completar". Antes de entregar cada pregunta, revisa que su "tipo" y su forma coincidan con el ejemplo de arriba — una "vf" con "___", o una "completar" sin "___", invalida toda la respuesta.

VARIEDAD: dentro de cada tipo, las preguntas deben ser DISTINTAS entre sí y cubrir distintas partes del texto (no las mismas ideas reformuladas), y no repitas el mismo dato en dos tipos distintos.`;

}

function construirPrompt({ texto, tipo, nivel, edad, porTipo, generosDisponibles }) {

    const textoCompleto = texto.join("\n\n");

    const contextoAudiencia = tipo === "mejora"
        ? `Esta lectura es para practicar velocidad y comprensión de lectura en el catálogo "Mejorar la lectura", dirigida a un lector de ${edad ? `${edad} años` : "la edad indicada"}. Las preguntas deben ser sencillas y directas, apropiadas para esa edad.`
        : `Esta lectura pertenece al catálogo de premios, nivel "${NOMBRE_NIVEL[nivel] || nivel || "no especificado"}". Calibra la dificultad de las preguntas a ese nivel.`;

    return `Eres un asistente que ayuda a un administrador a crear preguntas de comprensión de lectura para una plataforma educativa de fomento a la lectura.

${contextoAudiencia}

Todas las preguntas deben evaluar comprensión real del texto (no trivia externa), estar en español y ser claras y no ambiguas.

${bloqueTiposDePregunta(porTipo)}

Además, clasifica el texto en UN SOLO género, eligiéndolo EXACTAMENTE de esta lista (copia el nombre tal cual, sin inventar otros): ${generosDisponibles.join(", ")}. Devuélvelo en el campo "genero". Elige el que mejor describa de qué trata el texto, para poder recomendárselo a lectores interesados en ese género.

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

    const porTipo = determinarPreguntasPorTipo(tipo, nivel);
    const generosDisponibles = await leerGenerosDisponibles();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    let response;
    try {
        response = await client.beta.messages.parse({
            model: "claude-opus-5",
            // El banco completo son porTipo x 5 preguntas, cada una con
            // su propio banco de respuestas — bastante más salida que
            // cuando era una sola lista corta.
            max_tokens: 16000,
            messages: [
                { role: "user", content: construirPrompt({ texto, tipo, nivel, edad, porTipo, generosDisponibles }) }
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

    return {
        preguntas: response.parsed_output.preguntas,
        genero: response.parsed_output.genero || null
    };

});

module.exports = { generarPreguntasIA, bloqueTiposDePregunta };
