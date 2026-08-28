// ==========================================================
// GLOSARIO PERSONAL DE AHORCADO — LLAMADA A LA CLOUD FUNCTION
// ==========================================================
// A diferencia de admin-ia.js (exclusivo del panel de administrador),
// este archivo vive en ahorcado.html — página de PARTICIPANTES — porque
// cargarGlosarioPersonalIA es la ÚNICA función de IA de todo el
// proyecto abierta a cualquier usuario autenticado, no solo al admin
// (con límites de costo/abuso: 2 MB, 100 palabras por carga, 3 cargas
// al día — impuestos del lado del servidor, ver
// functions/lib/cargarGlosarioPersonalIA.js, no se puede evadir
// llamando distinto desde aquí).
//
// El resultado se devuelve para que el usuario lo revise y confirme
// antes de guardarlo — el guardado en usuarios/{uid}.glosarioPersonal
// lo hace ahorcado.js directamente en Firestore (ya tiene permiso de
// escribir su propio documento), esta función nunca guarda nada sola.
// ==========================================================

const TAMANIO_MAXIMO_GLOSARIO = 2 * 1024 * 1024; // 2 MB — igual que storage.rules

/**
 * Sube un documento a la carpeta privada del usuario y le pide a la
 * IA que extraiga (o genere) la lista de palabras + definiciones.
 * @param {File} archivo
 * @returns {Promise<Array<{palabra:string, pista:string}>>}
 */
async function subirGlosarioPersonalConIA(archivo) {

    if (typeof firebase.functions !== "function" || typeof firebase.storage !== "function") {
        throw new Error("Esta página no tiene las funciones de IA cargadas.");
    }

    const user = auth.currentUser;
    if (!user) {
        throw new Error("Debes iniciar sesión para usar tu glosario personal.");
    }

    if (archivo.size > TAMANIO_MAXIMO_GLOSARIO) {
        throw new Error("El archivo pesa demasiado (máximo 2 MB).");
    }

    if (!/\.(pdf|docx|txt)$/i.test(archivo.name)) {
        throw new Error("Solo se aceptan archivos PDF, .docx o .txt.");
    }

    const nombreLimpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    // Dentro de SU PROPIA subcarpeta (uid) — storage.rules no deja subir
    // en ninguna otra.
    const ruta = `fuentesGlosarioPersonal/${user.uid}/${Date.now()}-${nombreLimpio}`;
    const referencia = firebase.storage().ref(ruta);

    await referencia.put(archivo);

    try {
        const llamar = firebase.functions().httpsCallable("cargarGlosarioPersonalIA", { timeout: 120000 });
        const resultado = await llamar({ storagePath: ruta });
        return resultado.data.palabras;
    } catch (error) {
        // La Cloud Function también intenta borrar el archivo del lado
        // del servidor, pero si nunca llegó a correr (ej. límite diario
        // alcanzado, o error de red), esto limpia igual desde aquí.
        referencia.delete().catch(() => {});
        throw error;
    }

}
