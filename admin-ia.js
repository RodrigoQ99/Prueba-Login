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
 * que extraiga título, texto y banco de preguntas de TODAS las
 * lecturas que encuentre en él (puede ser una sola, o varias — ej. un
 * documento con 10 historias distintas, cada una con sus propias
 * preguntas). El archivo se borra solo del lado del servidor apenas
 * se procesa (nunca queda guardado).
 * @param {File} archivo
 * @param {"premio"|"mejora"} tipo
 * @param {string} [nivel]
 * @param {number} [edad]
 * @returns {Promise<Array<{titulo:string, texto:string[], preguntas:Array}>>}
 *   SIEMPRE un arreglo (de 1 o más) — quien llame decide si llena un
 *   solo formulario o abre una fila de formularios (ver
 *   activarBotonSubirDocumento en admin.js).
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
        // Un documento con varias lecturas largas puede tardar bastante
        // más que las llamadas de solo-preguntas — mismo plazo que
        // timeoutSeconds en la Cloud Function (5 minutos), si no el
        // navegador cortaría la espera antes de que el servidor termine.
        const llamar = functionsIA.httpsCallable("extraerLecturaDeDocumentoIA", { timeout: 300000 });
        const resultado = await llamar({ storagePath: ruta, tipo, nivel: nivel || null, edad: edad ?? null });
        return resultado.data.lecturas;
    } catch (error) {
        // La Cloud Function también intenta borrar el archivo del lado
        // del servidor, pero si nunca llegó a correr (ej. rechazada por
        // no ser admin, o error de red), esto limpia igual desde aquí.
        referencia.delete().catch(() => {});
        throw error;
    }

}


// ==========================================================
// PDFs GUARDADOS PARA "EL HILO DEL DÍA" (Etapa 23)
// ==========================================================
// A diferencia de fuentesLecturas/ (Etapa 22, transitorio), estos PDFs
// son PERMANENTES: el admin los guarda una vez y los reusa en varios
// Hilos a lo largo del tiempo. Subir/listar/borrar son operaciones
// directas de Storage (storage.rules ya exige ser admin) — no hace
// falta pasar por ninguna Cloud Function para eso; extraer el TEXTO sí
// necesita una (pdf-parse corre en el servidor, no en el navegador).

const TAMANIO_MAXIMO_PDF_HILO = 20 * 1024 * 1024; // 20 MB — igual que storage.rules

/**
 * Sube un PDF a la carpeta permanente "pdfsHiloDelDia/".
 * @param {File} archivo
 * @returns {Promise<string>} la ruta en Storage donde quedó guardado.
 */
async function subirPdfGuardado(archivo) {

    if (typeof firebase.storage !== "function") {
        throw new Error("Esta página no tiene Firebase Storage cargado.");
    }

    if (archivo.size > TAMANIO_MAXIMO_PDF_HILO) {
        throw new Error("El archivo pesa demasiado (máximo 20 MB).");
    }

    if (!/\.pdf$/i.test(archivo.name)) {
        throw new Error("Solo se aceptan archivos PDF.");
    }

    const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `pdfsHiloDelDia/${Date.now()}-${nombreLimpio}`;

    await firebase.storage().ref(ruta).put(archivo);

    return ruta;

}

/**
 * Lista los PDFs ya guardados.
 * @returns {Promise<Array<{ruta:string, nombre:string}>>}
 */
async function listarPdfsGuardados() {

    if (typeof firebase.storage !== "function") {
        throw new Error("Esta página no tiene Firebase Storage cargado.");
    }

    const listado = await firebase.storage().ref("pdfsHiloDelDia").listAll();

    return listado.items
        .map(item => ({
            ruta: item.fullPath,
            // El nombre real queda después del "timestamp-" que le puso
            // subirPdfGuardado — se le quita para mostrar algo legible.
            nombre: item.name.replace(/^\d+-/, "")
        }))
        .sort((a, b) => b.ruta.localeCompare(a.ruta)); // más reciente primero

}

/**
 * Borra un PDF guardado (el admin ya no lo quiere conservar).
 * @param {string} ruta
 */
async function eliminarPdfGuardado(ruta) {

    if (typeof firebase.storage !== "function") {
        throw new Error("Esta página no tiene Firebase Storage cargado.");
    }

    await firebase.storage().ref(ruta).delete();

}

/**
 * Devuelve el texto completo de un PDF ya guardado, SIN tocarlo con
 * IA — el admin lo recorta a mano hasta dejar el fragmento exacto que
 * quiere usar (nunca lo elige la IA).
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
async function extraerTextoDePdfGuardadoConIA(storagePath) {
    const llamar = functionsIA.httpsCallable("extraerTextoDePdfGuardado", { timeout: 120000 });
    const resultado = await llamar({ storagePath });
    return resultado.data.texto;
}

/**
 * Divide el fragmento YA ELEGIDO por el admin en exactamente 5 partes
 * narrativamente coherentes y en orden — la IA nunca decide qué
 * fragmento usar, solo cómo dividirlo.
 * @param {string} fragmento
 * @returns {Promise<string[]>} exactamente 5 fragmentos, en orden.
 */
async function dividirFragmentoConIA(fragmento) {
    const llamar = functionsIA.httpsCallable("dividirFragmentoEnHiloIA");
    const resultado = await llamar({ fragmento });
    return resultado.data.fragmentos;
}


// ==========================================================
// BANCO DE PALABRAS DE AHORCADO — CARGA CON IA (Etapa 24, Parte A)
// ==========================================================
// Dos formas de alimentar el banco GENERAL (admin, revisado antes de
// guardar como todo lo demás): desde una URL de diccionario, o subiendo
// un documento con una lista de palabras. La Parte B (glosario
// PERSONAL, abierto a cualquier usuario) vive en ahorcado-ia.js — un
// archivo aparte que sí se carga en páginas de participantes.

const TAMANIO_MAXIMO_DOCUMENTO_PALABRAS = 10 * 1024 * 1024; // 10 MB — igual que storage.rules

/**
 * Le pide a la IA que extraiga la palabra y definición de una página
 * de diccionario en línea (ej. RAE) — ignora sugerencias/anuncios/
 * palabras relacionadas que puedan aparecer en la misma página.
 * @param {string} url
 * @returns {Promise<{palabra:string, pista:string}>}
 */
async function extraerPalabraDeUrlConIA(url) {
    const llamar = functionsIA.httpsCallable("extraerPalabraDeUrlIA");
    const resultado = await llamar({ url });
    return resultado.data;
}

/**
 * Sube un documento con una lista de palabras (con o sin definiciones)
 * y le pide a la IA que devuelva la lista lista para revisar.
 * @param {File} archivo
 * @returns {Promise<Array<{palabra:string, pista:string}>>}
 */
async function subirDocumentoPalabrasConIA(archivo) {

    if (typeof firebase.storage !== "function") {
        throw new Error("Esta página no tiene Firebase Storage cargado.");
    }

    if (archivo.size > TAMANIO_MAXIMO_DOCUMENTO_PALABRAS) {
        throw new Error("El archivo pesa demasiado (máximo 10 MB).");
    }

    if (!/\.(pdf|docx|txt)$/i.test(archivo.name)) {
        throw new Error("Solo se aceptan archivos PDF, .docx o .txt.");
    }

    const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `fuentesPalabras/${Date.now()}-${nombreLimpio}`;
    const referencia = firebase.storage().ref(ruta);

    await referencia.put(archivo);

    try {
        const llamar = functionsIA.httpsCallable("extraerPalabrasDeDocumentoIA", { timeout: 180000 });
        const resultado = await llamar({ storagePath: ruta });
        return resultado.data.palabras;
    } catch (error) {
        referencia.delete().catch(() => {});
        throw error;
    }

}
