// ==========================================================
// LLAMADAS A LAS FUNCIONES DE IA (Cloud Functions)
// ==========================================================
// Envoltorios delgados sobre firebase.functions().httpsCallable(...).
//
// EXCLUSIVO para el panel de administrador: este archivo (y el
// <script> de firebase-functions-compat.js que necesita) solo se
// incluye en admin-lecturas.html, admin-mejora.html y
// admin-propuestas.html — nunca en ninguna página de participantes.
// Además, la Cloud Function del otro lado (ver
// functions/lib/verificarAdmin.js) vuelve a verificar esAdmin() por su
// cuenta antes de llamar a Claude, así que aunque alguien intentara
// invocar estas funciones a mano desde la consola del navegador sin
// ser administrador, Firebase las rechaza igual.
//
// Ver functions/README.md para cómo desplegar estas funciones y
// configurar la clave de la API de Anthropic.
// ==========================================================

const functionsIA = firebase.functions();

/**
 * Le pide a la IA el banco de preguntas de una lectura.
 * @param {string[]} texto - párrafos de la lectura.
 * @param {"premio"|"mejora"} tipo
 * @param {string} [nivel] - "facil"|"intermedio"|"dificil", solo si tipo === "premio".
 * @param {number} [edad] - solo si tipo === "mejora".
 * @returns {Promise<Array>} el arreglo de preguntas generadas (mismo
 *   formato que usa construirEditorPreguntas — editables, nada se
 *   guarda todavía).
 */
async function generarPreguntasConIA({ texto, tipo, nivel, edad }) {
    const llamar = functionsIA.httpsCallable("generarPreguntasIA");
    const resultado = await llamar({ texto, tipo, nivel: nivel || null, edad: edad ?? null });
    return resultado.data.preguntas;
}

/**
 * Le pide a la IA su opinión sobre una propuesta de "Ser el
 * protagonista de la historia" — SOLO informativo, nunca aprueba,
 * rechaza ni publica nada (eso lo decide el admin manualmente).
 * @param {string[]} texto - párrafos de la propuesta.
 * @param {Array} [preguntas] - banco de preguntas de la propuesta, si tiene.
 * @returns {Promise<{veredicto:string, motivo:string, temas_detectados:string[]}>}
 */
async function moderarPropuestaConIA({ texto, preguntas }) {
    const llamar = functionsIA.httpsCallable("moderarPropuestaIA");
    const resultado = await llamar({ texto, preguntas: preguntas || null });
    return resultado.data;
}
