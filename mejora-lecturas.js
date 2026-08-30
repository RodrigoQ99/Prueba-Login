// ==========================================================
// CATÁLOGO — "MEJORAR LA LECTURA" (por edad)
// ==========================================================
// Igual que en lecturas.js: el contenido YA NO vive escrito aquí, vive
// en Firestore (colección "mejoraLecturas") y se administra desde el
// panel de administrador en mejora.html.
//
// El rango de edades disponible es editable, y vive en Firestore en
// configuracion/rangoEdades — junto con "segundosPresionar" (cuántos
// segundos hay que mantener presionada una palabra del checkpoint para
// marcarla como donde se quedó leyendo; ver motor-mejorar.js) y
// "metaPpmPorEdad" (la meta de palabras por minuto de cada edad, antes
// vivía fija en código como META_PPM_POR_EDAD — ver metaPpmParaEdad()
// más abajo). Todo en el MISMO documento a propósito, en vez de uno
// aparte: son las mismas "edades disponibles", vistas desde ángulos
// distintos. Editable desde admin-mejora-edades.html.
// ==========================================================

let CATALOGO_MEJORA = {};
let _promesaCatalogoMejora = null;

// Meta de ppm por defecto — SOLO se usa si el documento de Firestore
// todavía no tiene "metaPpmPorEdad" (proyecto nuevo, o antes de que
// existiera este campo). Una vez que el admin guarda algo desde
// admin-mejora-edades.html, esto deja de importar.
const META_PPM_POR_EDAD_POR_DEFECTO = {
    10: [100, 125],
    11: [125, 150],
    12: [140, 170],
    13: [160, 190],
    14: [180, 220],
    15: [200, 250],
    16: [220, 260],
    17: [240, 280],
    18: [250, 290],
    masDelTope: [250, 300]
};

let RANGO_EDADES = { min: 10, max: 18, segundosPresionar: 2, metaPpmPorEdad: META_PPM_POR_EDAD_POR_DEFECTO };
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
                // Por si el documento se guardó antes de que existiera este
                // campo: sin esto, un doc viejo dejaría segundosPresionar
                // en undefined en vez del valor por defecto.
                if (typeof RANGO_EDADES.segundosPresionar !== "number") {
                    RANGO_EDADES.segundosPresionar = 2;
                }
                // Mismo caso para metaPpmPorEdad: documentos guardados antes
                // de admin-mejora-edades.html no lo tienen todavía.
                if (!RANGO_EDADES.metaPpmPorEdad || typeof RANGO_EDADES.metaPpmPorEdad !== "object") {
                    RANGO_EDADES.metaPpmPorEdad = META_PPM_POR_EDAD_POR_DEFECTO;
                }
            }
            return RANGO_EDADES;
        })
        .catch(error => {
            console.error("No se pudo cargar el rango de edades:", error);
            return RANGO_EDADES;
        });

    return _promesaRangoEdades;

}

// Además de las edades individuales (RANGO_EDADES.min a RANGO_EDADES.max),
// existe un grupo final para todos los mayores al tope — internamente se
// guarda como "max + 1" (ej. si el tope es 17, ese grupo se guarda como 18),
// y se muestra como "Más de 17 años" en vez de "18 años".

function grupoMasDelTope() {
    return RANGO_EDADES.max + 1;
}

function esGrupoMasDelTope(edad) {
    return edad > RANGO_EDADES.max;
}

function etiquetaEdad(edad) {
    return esGrupoMasDelTope(edad)
        ? `+${RANGO_EDADES.max}`
        : `${edad} años`;
}

/**
 * Devuelve el arreglo de lecturas para una edad específica.
 * Si la edad está fuera del rango configurado, la ajusta al extremo
 * más cercano (incluyendo el grupo "más de X años").
 */
function obtenerLecturasPorEdad(edad) {
    const edadAjustada = Math.min(Math.max(edad, RANGO_EDADES.min), grupoMasDelTope());
    return CATALOGO_MEJORA[edadAjustada] || [];
}


// Meta de palabras por minuto por edad (para mostrar retroalimentación).
// Editable desde admin-mejora-edades.html — ver RANGO_EDADES.metaPpmPorEdad
// más arriba. Si una edad todavía no tiene meta configurada (ej. se acaba
// de ampliar el rango y no se ha guardado nada para ella todavía), usa
// [0, 0] en vez de tronar — la retroalimentación simplemente no compara
// contra nada hasta que el admin la configure.
function metaPpmParaEdad(edad) {
    const tabla = RANGO_EDADES.metaPpmPorEdad || META_PPM_POR_EDAD_POR_DEFECTO;
    if (esGrupoMasDelTope(edad)) {
        return tabla.masDelTope || [0, 0];
    }
    return tabla[edad] || [0, 0];
}


/**
 * Busca a qué edad y en qué posición pertenece una lectura, dado su ID.
 * Devuelve null si no existe en ningún grupo de edad.
 *
 * "paisUsuario" (Etapa 30) filtra la lista de esa edad al mismo
 * subconjunto que ve el usuario en la pantalla de "Mejorar la lectura"
 * (globales + las de su país, ver filtrarPorPais en lecturas.js) ANTES
 * de calcular "indice"/"totalEnEdad" — así el desbloqueo secuencial
 * (ver motor-mejorar.js) nunca lo hace esperar a completar una lectura
 * de OTRO país que ni siquiera puede ver. Si no se pasa "paisUsuario"
 * (undefined), no filtra — usa la lista completa tal cual (compatibilidad
 * hacia atrás por si algún día se llama sin ese dato).
 */
function ubicarLecturaMejora(id, paisUsuario) {

    for (const edad of Object.keys(CATALOGO_MEJORA)) {

        const listaCompleta = CATALOGO_MEJORA[edad];
        const lista = (typeof paisUsuario === "undefined")
            ? listaCompleta
            : filtrarPorPais(listaCompleta, paisUsuario);
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
