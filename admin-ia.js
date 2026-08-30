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
// INVENTAR UNA HISTORIA ORIGINAL POR GÉNERO (Etapa 29)
// ==========================================================
// El admin elige uno o varios géneros (ver generos.js/GENEROS_LECTURA)
// y Claude INVENTA una historia nueva que los combine (nunca copiada de
// una obra existente), junto con su banco de preguntas — mismo formato
// que usa el resto del formulario de creación de lectura, totalmente
// editable antes de guardar.
/**
 * @param {string[]} generos
 * @param {"premio"|"mejora"} tipo
 * @param {string} [nivel] - solo si tipo === "premio".
 * @param {number} [edad] - solo si tipo === "mejora".
 * @returns {Promise<{titulo:string, texto:string[], preguntas:Array}>}
 */
async function generarLecturaOriginalConIA({ generos, tipo, nivel, edad }) {
    const llamar = functionsIA.httpsCallable("generarLecturaOriginalIA", { timeout: 120000 });
    const resultado = await llamar({ generos, tipo, nivel: nivel || null, edad: edad ?? null });
    return resultado.data;
}


// ==========================================================
// SUBIR UN DOCUMENTO PARA LLENAR EL FORMULARIO DE LECTURA (Etapa 22)
// ==========================================================
// DESCONECTADA desde la Etapa 28 — el admin pidió quitar por completo
// la opción de crear lecturas subiendo un documento. La Cloud Function
// del otro lado (extraerLecturaDeDocumentoIA) ya no está exportada
// (ver functions/index.js) y nada en admin.js llama a esta función —
// se deja el código comentado, sin borrar, por si algún día se retoma.
//
// const TAMANIO_MAXIMO_DOCUMENTO = 15 * 1024 * 1024; // 15 MB — igual que storage.rules
//
// async function extraerLecturaDeDocumentoConIA({ archivo, tipo, nivel, edad }) {
//
//     if (typeof firebase.storage !== "function") {
//         throw new Error("Esta página no tiene Firebase Storage cargado.");
//     }
//
//     if (archivo.size > TAMANIO_MAXIMO_DOCUMENTO) {
//         throw new Error("El archivo pesa demasiado (máximo 15 MB).");
//     }
//
//     if (!/\.(pdf|docx|txt)$/i.test(archivo.name)) {
//         throw new Error("Solo se aceptan archivos PDF, .docx o .txt.");
//     }
//
//     const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
//     const ruta = `fuentesLecturas/${Date.now()}-${nombreLimpio}`;
//     const referencia = firebase.storage().ref(ruta);
//
//     await referencia.put(archivo);
//
//     try {
//         const llamar = functionsIA.httpsCallable("extraerLecturaDeDocumentoIA", { timeout: 300000 });
//         const resultado = await llamar({ storagePath: ruta, tipo, nivel: nivel || null, edad: edad ?? null });
//         return resultado.data.lecturas;
//     } catch (error) {
//         referencia.delete().catch(() => {});
//         throw error;
//     }
//
// }


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
// DESCONECTADAS desde la Etapa 30 — el admin pidió quitar del panel de
// Ahorcado las opciones de cargar palabras con IA (URL de diccionario o
// documento). El banco general ahora solo se llena a mano
// ("+ Agregar palabra") o importando un Excel (Etapa 28, sin IA, ver
// admin.js) — nada llama ya a las funciones de abajo, se dejaron
// comentadas sin borrar por si algún día se retoman. Las Cloud
// Functions que llamaban (extraerPalabraDeUrlIA,
// extraerPalabrasDeDocumentoIA) también quedaron desconectadas, ver
// functions/index.js.
//
// const TAMANIO_MAXIMO_DOCUMENTO_PALABRAS = 10 * 1024 * 1024; // 10 MB — igual que storage.rules
//
// async function extraerPalabraDeUrlConIA(url) {
//     const llamar = functionsIA.httpsCallable("extraerPalabraDeUrlIA");
//     const resultado = await llamar({ url });
//     return resultado.data;
// }
//
// async function subirDocumentoPalabrasConIA(archivo) {
//
//     if (typeof firebase.storage !== "function") {
//         throw new Error("Esta página no tiene Firebase Storage cargado.");
//     }
//
//     if (archivo.size > TAMANIO_MAXIMO_DOCUMENTO_PALABRAS) {
//         throw new Error("El archivo pesa demasiado (máximo 10 MB).");
//     }
//
//     if (!/\.(pdf|docx|txt)$/i.test(archivo.name)) {
//         throw new Error("Solo se aceptan archivos PDF, .docx o .txt.");
//     }
//
//     const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
//     const ruta = `fuentesPalabras/${Date.now()}-${nombreLimpio}`;
//     const referencia = firebase.storage().ref(ruta);
//
//     await referencia.put(archivo);
//
//     try {
//         const llamar = functionsIA.httpsCallable("extraerPalabrasDeDocumentoIA", { timeout: 180000 });
//         const resultado = await llamar({ storagePath: ruta });
//         return resultado.data.palabras;
//     } catch (error) {
//         referencia.delete().catch(() => {});
//         throw error;
//     }
//
// }
