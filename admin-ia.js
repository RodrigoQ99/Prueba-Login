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


// ==========================================================
// SUBIR UN DOCUMENTO PARA LLENAR EL FORMULARIO DE LECTURA (Etapa 22)
// ==========================================================
// A diferencia de las otras dos, esta necesita Firebase Storage —
// firebase.storage() solo existe en las páginas que además cargan
// firebase-storage-compat.js (admin-lecturas.html y admin-mejora.html;
// admin-propuestas.html NO la necesita y no carga ese script, por eso
// se pide "lazy" adentro de la función y no en una constante de arriba
// como functionsIA — así este archivo se puede seguir compartiendo
// entre las tres páginas sin que las que no la usan truenen al cargar.

const TAMANIO_MAXIMO_DOCUMENTO = 15 * 1024 * 1024; // 15 MB — igual que storage.rules

/**
 * Sube un documento (PDF, .docx o .txt) a Storage y le pide a la IA
 * que extraiga título, texto y banco de preguntas — mismo resultado
 * "listo para revisar" que generarPreguntasConIA, pero a partir de un
 * archivo en vez de texto ya escrito. El archivo se borra solo del
 * lado del servidor apenas se procesa (nunca queda guardado).
 * @param {File} archivo
 * @param {"premio"|"mejora"} tipo
 * @param {string} [nivel]
 * @param {number} [edad]
 * @returns {Promise<{titulo:string, texto:string[], preguntas:Array}>}
 */
async function extraerLecturaDeDocumentoConIA({ archivo, tipo, nivel, edad }) {

    if (typeof firebase.storage !== "function") {
        throw new Error("Esta página no tiene Firebase Storage cargado.");
    }

    if (archivo.size > TAMANIO_MAXIMO_DOCUMENTO) {
        throw new Error("El archivo pesa demasiado (máximo 15 MB).");
    }

    if (!/\.(pdf|docx|txt)$/i.test(archivo.name)) {
        throw new Error("Solo se aceptan archivos PDF, .docx o .txt.");
    }

    const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `fuentesLecturas/${Date.now()}-${nombreLimpio}`;
    const referencia = firebase.storage().ref(ruta);

    await referencia.put(archivo);

    try {
        const llamar = functionsIA.httpsCallable("extraerLecturaDeDocumentoIA");
        const resultado = await llamar({ storagePath: ruta, tipo, nivel: nivel || null, edad: edad ?? null });
        return resultado.data;
    } catch (error) {
        // La Cloud Function también intenta borrar el archivo del lado
        // del servidor, pero si nunca llegó a correr (ej. rechazada por
        // no ser admin, o error de red), esto limpia igual desde aquí.
        referencia.delete().catch(() => {});
        throw error;
    }

}
