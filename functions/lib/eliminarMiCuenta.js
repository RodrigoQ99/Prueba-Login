// ==========================================================
// CLOUD FUNCTION: eliminarMiCuenta
// ==========================================================
// El usuario, desde Perfil > Información, borra su PROPIA cuenta. No es
// exclusiva de admin: cualquiera autenticado puede borrar la suya —
// nunca la de otro (solo se toca request.auth.uid).
//
// Qué hace (según lo acordado):
//  - BORRA datos personales: el documento usuarios/{uid}, sus premios
//    canjeables, sus propuestas de "Ser el protagonista" pendientes,
//    sus intentos de "El Hilo del día" y su cuenta de Firebase Auth.
//  - ANONIMIZA su progreso: los documentos de "progreso" NO se borran
//    (para no romper los conteos del catálogo — aprobados, tiempos),
//    pero el documento de usuario que los identificaba deja de existir.
//  - CONSERVA sus lecturas publicadas ("Ser el protagonista" ya
//    publicadas en /lecturas o /mejoraLecturas): se quedan en el
//    catálogo, solo se les cambia el nombre del autor a "Usuario
//    eliminado" y se les quita el correo.
//
// Usa el Admin SDK: NO pasa por firestore.rules (por eso puede borrar
// cosas que las reglas normalmente bloquean para el propio usuario).
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { db, admin } = require("../admin-init");

const AUTOR_ELIMINADO = "Usuario eliminado";

// Borra todos los documentos que devuelve una consulta, en lotes.
async function borrarPorLotes(consulta) {
    let borrados = 0;
    while (true) {
        const snap = await consulta.limit(400).get();
        if (snap.empty) break;
        const lote = db.batch();
        snap.docs.forEach(d => lote.delete(d.ref));
        await lote.commit();
        borrados += snap.size;
        if (snap.size < 400) break;
    }
    return borrados;
}

const eliminarMiCuenta = onCall(
    { memory: "256MiB", timeoutSeconds: 120 },
    async (request) => {

        if (!request.auth || !request.auth.uid) {
            throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
        }

        const uid = request.auth.uid;

        try {

            // 1. Premios canjeables del usuario (traen su código personal).
            await borrarPorLotes(db.collection("premios").where("usuarioId", "==", uid));

            // 2. Propuestas de "Ser el protagonista" pendientes de revisión.
            await borrarPorLotes(db.collection("propuestasLecturas").where("autorUid", "==", uid));

            // 3. Intentos de "El Hilo del día" (doc id "{uid}_{fecha}",
            //    además guardan el campo "uid").
            await borrarPorLotes(db.collection("intentosHiloDia").where("uid", "==", uid));

            // 4. Anonimizar las lecturas que el usuario publicó — se
            //    quedan en el catálogo.
            for (const coleccion of ["lecturas", "mejoraLecturas"]) {
                const snap = await db.collection(coleccion).where("autorUid", "==", uid).get();
                if (snap.empty) continue;
                const lote = db.batch();
                snap.docs.forEach(d => lote.update(d.ref, {
                    autorNombre: AUTOR_ELIMINADO,
                    autorEmail: admin.firestore.FieldValue.delete()
                }));
                await lote.commit();
            }

            // 5. El documento de usuario (nombre, correo, edad, país,
            //    puntos, racha, diccionarios de Ahorcado, etc.).
            await db.collection("usuarios").doc(uid).delete();

            // "progreso" NO se toca: sin el documento de usuario ya no
            // identifica a nadie y sirve para los conteos del catálogo.

            // 6. La cuenta de autenticación — al final, para que si algo
            //    de arriba falla el usuario todavía pueda reintentar.
            await admin.auth().deleteUser(uid);

            return { ok: true };

        } catch (error) {
            logger.error(`No se pudo eliminar la cuenta ${uid}:`, error);
            throw new HttpsError("internal", "No se pudo eliminar la cuenta por completo. Intenta de nuevo en un momento.");
        }

    }
);

module.exports = { eliminarMiCuenta };
