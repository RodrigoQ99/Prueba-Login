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

// Nombre legible de cada nivel — lo usan inicio.js, admin.js y
// admin-estadisticas.js.
const NOMBRE_NIVEL = {
    facil: "Fácil",
    intermedio: "Intermedio",
    dificil: "Difícil"
};

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


// ==========================================================
// CONFIGURACIÓN DEL AVANCE AUTOMÁTICO (lecturas de premios)
// ==========================================================
// Cuántos segundos espera el texto antes de empezar a desplazarse solo
// (ver ESPERA_INICIAL en motor.js) — editable desde el panel de
// administrador (⚙️ Configuración, en "Lecturas"). Mismo patrón que
// RANGO_EDADES en mejora-lecturas.js: vive aquí (no en motor.js) para
// que tanto motor.js como admin.js/admin-lecturas.js lo compartan.

let CONFIG_LECTURA_PREMIOS = { esperaInicialSegundos: 3 };
let _promesaConfigLecturaPremios = null;

function cargarConfigLecturaPremios(forzarRecarga) {

    if (_promesaConfigLecturaPremios && !forzarRecarga) {
        return _promesaConfigLecturaPremios;
    }

    _promesaConfigLecturaPremios = db.collection("configuracion").doc("lecturaPremios")
        .get()
        .then(doc => {
            if (doc.exists) {
                CONFIG_LECTURA_PREMIOS = doc.data();
                // Por si el documento se guardó antes de que existiera este
                // campo: sin esto, un doc viejo dejaría esperaInicialSegundos
                // en undefined en vez del valor por defecto.
                if (typeof CONFIG_LECTURA_PREMIOS.esperaInicialSegundos !== "number") {
                    CONFIG_LECTURA_PREMIOS.esperaInicialSegundos = 3;
                }
            }
            return CONFIG_LECTURA_PREMIOS;
        })
        .catch(error => {
            console.error("No se pudo cargar la configuración de lecturas de premios:", error);
            return CONFIG_LECTURA_PREMIOS;
        });

    return _promesaConfigLecturaPremios;

}
