// ==========================================================
// CATÁLOGO — "MEJORAR LA LECTURA" (por edad)
// ==========================================================
// Igual que en lecturas.js: el contenido YA NO vive escrito aquí, vive
// en Firestore (colección "mejoraLecturas") y se administra desde el
// panel de administrador en mejora.html.
//
// El rango de edades disponible (antes fijo en 10-15) también es
// editable ahora, y vive en Firestore en configuracion/rangoEdades.
// ==========================================================

let CATALOGO_MEJORA = {};
let _promesaCatalogoMejora = null;

let RANGO_EDADES = { min: 10, max: 15 };
let _promesaRangoEdades = null;

/**
 * Trae el catálogo completo de "Mejorar la lectura" desde Firestore,
 * agrupado por edad, y lo guarda en CATALOGO_MEJORA. Se cachea igual
 * que cargarCatalogoLecturas (pasa "true" para forzar recargar).
 */
function cargarCatalogoMejora(forzarRecarga) {

    if (_promesaCatalogoMejora && !forzarRecarga) {
        return _promesaCatalogoMejora;
    }

    _promesaCatalogoMejora = db.collection("mejoraLecturas")
        .orderBy("orden")
        .get()
        .then(snapshot => {

            const nuevoCatalogo = {};

            snapshot.docs.forEach(doc => {
                const lectura = { id: doc.id, ...doc.data() };
                if (!nuevoCatalogo[lectura.edad]) {
                    nuevoCatalogo[lectura.edad] = [];
                }
                nuevoCatalogo[lectura.edad].push(lectura);
            });

            CATALOGO_MEJORA = nuevoCatalogo;
            return CATALOGO_MEJORA;

        })
        .catch(error => {
            console.error("No se pudo cargar el catálogo de Mejorar la lectura:", error);
            CATALOGO_MEJORA = {};
            return CATALOGO_MEJORA;
        });

    return _promesaCatalogoMejora;

}

/**
 * Trae el rango de edades configurado (10-15 por defecto si el
 * administrador todavía no lo ha cambiado nunca).
 */
function cargarRangoEdades(forzarRecarga) {

    if (_promesaRangoEdades && !forzarRecarga) {
        return _promesaRangoEdades;
    }

    _promesaRangoEdades = db.collection("configuracion").doc("rangoEdades")
        .get()
        .then(doc => {
            if (doc.exists) {
                RANGO_EDADES = doc.data();
            }
            return RANGO_EDADES;
        })
        .catch(error => {
            console.error("No se pudo cargar el rango de edades:", error);
            return RANGO_EDADES;
        });

    return _promesaRangoEdades;

}

/**
 * Devuelve el arreglo de lecturas para una edad específica.
 * Si la edad está fuera del rango configurado, la ajusta al extremo
 * más cercano.
 */
function obtenerLecturasPorEdad(edad) {
    const edadAjustada = Math.min(Math.max(edad, RANGO_EDADES.min), RANGO_EDADES.max);
    return CATALOGO_MEJORA[edadAjustada] || [];
}


// Meta de palabras por minuto por edad (para mostrar retroalimentación).
// Las edades que no tengan una meta específica usan la más cercana.
const META_PPM_POR_EDAD = {
    10: [100, 125],
    11: [125, 150],
    12: [140, 170],
    13: [160, 190],
    14: [180, 220],
    15: [200, 250]
};


/**
 * Busca a qué edad y en qué posición pertenece una lectura, dado su ID.
 * Devuelve null si no existe en ningún grupo de edad.
 */
function ubicarLecturaMejora(id) {

    for (const edad of Object.keys(CATALOGO_MEJORA)) {

        const lista = CATALOGO_MEJORA[edad];
        const indice = lista.findIndex(l => l.id === id);

        if (indice !== -1) {
            return {
                edad: Number(edad),
                indice: indice,
                lectura: lista[indice],
                totalEnEdad: lista.length
            };
        }

    }

    return null;

}
