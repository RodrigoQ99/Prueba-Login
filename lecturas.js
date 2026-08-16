// ==========================================================
// CATÁLOGO CENTRAL DE LECTURAS
// ==========================================================
// El contenido de cada lectura (título, nivel, tiempos, texto y banco
// de preguntas) YA NO vive escrito aquí en código. Vive en Firestore,
// en la colección "lecturas", y se administra desde el panel de
// administrador (el botón "🔧 Panel de administrador" que aparece en
// "Mis lecturas" solo para la cuenta admin — ver admin.js).
//
// Este archivo solo se encarga de TRAER esos datos y guardarlos en
// CATALOGO_LECTURAS, para que el resto del código (motor.js, inicio.js,
// menu.js) siga usándolo exactamente igual que antes.
// ==========================================================

let CATALOGO_LECTURAS = [];
let _promesaCatalogoLecturas = null;

// Oportunidades totales por lectura (compartido entre motor.js e
// inicio.js). Se guardan en la cuenta del usuario, no en el navegador.
const MAX_INTENTOS_LECTURA = 3;
const MAX_INTENTOS_CUESTIONARIO = 2;

/**
 * Trae el catálogo completo de lecturas desde Firestore y lo guarda en
 * CATALOGO_LECTURAS. Solo hace la consulta una vez (la cachea); pasa
 * "true" para forzar traerlo de nuevo (por ejemplo, después de que el
 * administrador agregue, edite o borre una lectura).
 */
function cargarCatalogoLecturas(forzarRecarga) {

    if (_promesaCatalogoLecturas && !forzarRecarga) {
        return _promesaCatalogoLecturas;
    }

    _promesaCatalogoLecturas = db.collection("lecturas")
        .orderBy("orden")
        .get()
        .then(snapshot => {
            CATALOGO_LECTURAS = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return CATALOGO_LECTURAS;
        })
        .catch(error => {
            console.error("No se pudo cargar el catálogo de lecturas:", error);
            CATALOGO_LECTURAS = [];
            return CATALOGO_LECTURAS;
        });

    return _promesaCatalogoLecturas;

}

/**
 * Busca una lectura del catálogo por su ID (ya cargado en CATALOGO_LECTURAS).
 * Devuelve undefined si no existe (útil para mostrar un error si un
 * QR apunta a un ID que ya no existe o está mal escrito).
 */
function obtenerLecturaPorId(id) {
    return CATALOGO_LECTURAS.find(lectura => lectura.id === id);
}
