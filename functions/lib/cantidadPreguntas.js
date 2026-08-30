// ==========================================================
// CUÁNTAS PREGUNTAS PEDIRLE A LA IA
// ==========================================================
// Lecturas de premios: se determina por cantidad de palabras del texto,
// con las MISMAS bandas que ya existen en protagonista.js
// (BANDAS_SUGERENCIA_PROTAGONISTA / sugerirPreguntasProtagonista) —
// portadas aquí tal cual, sin cambiar los rangos ni las cantidades,
// porque ese archivo vive en el navegador y Cloud Functions corre en
// su propio entorno de Node aparte (no se puede hacer require() de un
// script de frontend). Si algún día cambian esos números allá, hay que
// actualizarlos aquí también.
//
// Mejorar la lectura: los textos son mucho más cortos (100-225 palabras
// aprox.) y el patrón ya usado en ese catálogo es 3 preguntas fijas —
// no depende del tamaño del texto.
// ==========================================================

const BANDAS_PREGUNTAS_PREMIO = [
    { min: 200, max: 400, preguntas: 5 },   // fácil
    { min: 600, max: 900, preguntas: 8 },   // intermedio
    { min: 1200, max: 1800, preguntas: 11 } // difícil
];

const PREGUNTAS_MEJORA_POR_DEFECTO = 3;

// Rango aproximado de palabras para "Mejorar la lectura" (ver nota más
// arriba) — hasta ahora solo vivía en un comentario; se sube a
// constante exportada porque generarLecturaOriginalIA.js también lo
// necesita (para pedirle a Claude un texto del tamaño correcto al
// INVENTAR una historia nueva, no solo al generar preguntas de una ya
// existente).
const RANGO_PALABRAS_MEJORA = { min: 100, max: 225 };

function contarPalabras(texto) {
    return (texto || "").trim().split(/\s+/).filter(p => p.length > 0).length;
}

/**
 * Cuántas preguntas pedirle a Claude, según el tipo de catálogo:
 * - "premio": según la cantidad de palabras del texto completo, con la
 *   misma banda más cercana que ya usa protagonista.js (si el texto
 *   cae exactamente en una banda, esa; si no, la banda más cercana).
 * - "mejora": siempre PREGUNTAS_MEJORA_POR_DEFECTO.
 */
function determinarCantidadPreguntas(tipo, cantidadPalabras) {

    if (tipo === "mejora") {
        return PREGUNTAS_MEJORA_POR_DEFECTO;
    }

    for (const banda of BANDAS_PREGUNTAS_PREMIO) {
        if (cantidadPalabras >= banda.min && cantidadPalabras <= banda.max) {
            return banda.preguntas;
        }
    }

    let mejor = BANDAS_PREGUNTAS_PREMIO[0];
    let mejorDistancia = Infinity;

    BANDAS_PREGUNTAS_PREMIO.forEach(banda => {
        const distancia = cantidadPalabras < banda.min
            ? banda.min - cantidadPalabras
            : cantidadPalabras - banda.max;
        if (distancia < mejorDistancia) {
            mejorDistancia = distancia;
            mejor = banda;
        }
    });

    return mejor.preguntas;

}

module.exports = {
    contarPalabras,
    determinarCantidadPreguntas,
    BANDAS_PREGUNTAS_PREMIO,
    PREGUNTAS_MEJORA_POR_DEFECTO,
    RANGO_PALABRAS_MEJORA
};
