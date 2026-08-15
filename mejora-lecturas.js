// ==========================================================
// CATÁLOGO — "MEJORAR LA LECTURA" (por edad)
// ==========================================================
// Aquí van las lecturas para medir y mejorar la velocidad lectora,
// organizadas por edad (10 a 15 años). Es un sistema INDEPENDIENTE
// del catálogo de premios (lecturas.js) — no comparte puntos ni
// aparece en el ranking. El "premio" aquí es subir de nivel.
//
// META DE PALABRAS POR MINUTO SUGERIDA POR EDAD
// (basado en los dos puntos que diste: 10 años = 100-125 ppm,
// 15 años = 200-250 ppm. Las edades de en medio las interpolé
// de forma pareja — ajústalas si tienes datos más precisos):
//
//   10 años → 100-125 ppm  (lecturas de ~110 palabras)
//   11 años → 125-150 ppm  (lecturas de ~135 palabras)
//   12 años → 140-170 ppm  (lecturas de ~155 palabras)
//   13 años → 160-190 ppm  (lecturas de ~175 palabras)
//   14 años → 180-220 ppm  (lecturas de ~200 palabras)
//   15 años → 200-250 ppm  (lecturas de ~225 palabras)
//
// CÓMO AGREGAR UNA LECTURA:
// Copia un bloque de ejemplo dentro del arreglo de la edad que
// corresponda. Mismo formato que lecturas.js:
//
// {
//     id: "mejora-10-1",              <- único, sin espacios
//     titulo: "Título de la lectura",
//     texto: [
//         "Primer párrafo...",
//         "Segundo párrafo..."
//     ],
//     preguntas: [
//         {
//             pregunta: "¿Pregunta?",
//             opciones: [
//                 { texto: "Opción A", valor: "a" },
//                 { texto: "Opción B", valor: "b" },
//                 { texto: "Opción C", valor: "c" }
//             ],
//             correcta: "b"
//         }
//         // 3 preguntas simples por lectura, según pediste
//     ]
// }
//
// El ORDEN dentro de cada arreglo de edad importa: la primera
// lectura del arreglo se desbloquea primero, luego la segunda, etc.
// ==========================================================

const CATALOGO_MEJORA = {

    // ------------------------------------------------------
    // 10 AÑOS — meta: 100-125 palabras por minuto (~110 palabras)
    // ------------------------------------------------------
    10: [

        {
            id: "mejora-10-1",
            titulo: "El pequeño robot de Mateo",
            texto: [
                "Mateo era un niño curioso al que le encantaba construir cosas. Una tarde, encontró varias cajas, tubos de cartón y botones viejos en su casa. Decidió crear un pequeño robot.",
                "Trabajó durante toda la tarde. Primero, hizo el cuerpo con una caja. Después, colocó dos botones como ojos y utilizó los tubos para formar los brazos. Finalmente, agregó una pequeña luz en la cabeza.",
                "Cuando terminó, Mateo conectó una batería y presionó un botón. ¡El robot comenzó a moverse!",
                "Aunque solo caminaba unos pocos centímetros, Mateo estaba feliz. Comprendió que no necesitaba materiales costosos para inventar algo divertido. Solo necesitaba imaginación, paciencia y ganas de aprender."
            ],
            preguntas: [
                {
                    pregunta: "¿Qué le gustaba hacer a Mateo?",
                    opciones: [
                        { texto: "Cocinar pasteles", valor: "a" },
                        { texto: "Construir cosas", valor: "b" },
                        { texto: "Jugar fútbol", valor: "c" }
                    ],
                    correcta: "b"
                },
                {
                    pregunta: "¿Qué utilizó Mateo para hacer los ojos del robot?",
                    opciones: [
                        { texto: "Botones", valor: "a" },
                        { texto: "Piedras", valor: "b" },
                        { texto: "Monedas", valor: "c" }
                    ],
                    correcta: "a"
                },
                {
                    pregunta: "¿Qué comprendió Mateo al terminar su invento?",
                    opciones: [
                        { texto: "Que necesitaba materiales costosos", valor: "a" },
                        { texto: "Que los robots son difíciles de construir", valor: "b" },
                        { texto: "Que necesitaba imaginación, paciencia y ganas de aprender", valor: "c" }
                    ],
                    correcta: "c"
                }
            ]
        },

        {
            id: "mejora-10-2",
            titulo: "La caja escondida",
            texto: [
                "Sofía y Daniel jugaban cerca de su casa cuando escucharon un extraño sonido detrás de un árbol. Parecía un pequeño golpe que se repetía cada pocos segundos.",
                "Los dos amigos se acercaron con cuidado y descubrieron una caja de madera escondida entre las hojas. Tenía una pequeña cerradura, pero no había ninguna llave cerca.",
                "Daniel pensó que podía ser un tesoro. Sofía imaginó que quizá alguien había guardado allí un recuerdo importante.",
                "Después de buscar alrededor, encontraron una nota debajo de una piedra. La nota decía: \"Para encontrar la respuesta, mira hacia arriba\".",
                "Los niños levantaron la cabeza y descubrieron una cuerda colgada de una rama. Al tirar de ella, cayó una segunda caja llena de fotografías antiguas. Ambos sonrieron sorprendidos."
            ],
            preguntas: [
                {
                    pregunta: "¿Qué escucharon Sofía y Daniel detrás del árbol?",
                    opciones: [
                        { texto: "Un extraño sonido", valor: "a" },
                        { texto: "Una canción", valor: "b" },
                        { texto: "Un ladrido", valor: "c" }
                    ],
                    correcta: "a"
                },
                {
                    pregunta: "¿Qué encontraron escondido entre las hojas?",
                    opciones: [
                        { texto: "Una mochila", valor: "a" },
                        { texto: "Una caja de madera", valor: "b" },
                        { texto: "Una bicicleta", valor: "c" }
                    ],
                    correcta: "b"
                },
                {
                    pregunta: "¿Qué encontraron dentro de la segunda caja?",
                    opciones: [
                        { texto: "Dinero y juguetes", valor: "a" },
                        { texto: "Libros y mapas", valor: "b" },
                        { texto: "Fotografías antiguas", valor: "c" }
                    ],
                    correcta: "c"
                }
            ]
        }

    ],

    // ------------------------------------------------------
    // 11 AÑOS — meta: 125-150 palabras por minuto (~135 palabras)
    // ------------------------------------------------------
    11: [

    ],

    // ------------------------------------------------------
    // 12 AÑOS — meta: 140-170 palabras por minuto (~155 palabras)
    // ------------------------------------------------------
    12: [

    ],

    // ------------------------------------------------------
    // 13 AÑOS — meta: 160-190 palabras por minuto (~175 palabras)
    // ------------------------------------------------------
    13: [

    ],

    // ------------------------------------------------------
    // 14 AÑOS — meta: 180-220 palabras por minuto (~200 palabras)
    // ------------------------------------------------------
    14: [

    ],

    // ------------------------------------------------------
    // 15 AÑOS — meta: 200-250 palabras por minuto (~225 palabras)
    // ------------------------------------------------------
    15: [

    ]

};


/**
 * Devuelve el arreglo de lecturas para una edad específica.
 * Si la edad es menor a 10, usa las lecturas de 10 años.
 * Si es mayor a 15, usa las lecturas de 15 años (tope actual).
 */
function obtenerLecturasPorEdad(edad) {
    const edadAjustada = Math.min(Math.max(edad, 10), 15);
    return CATALOGO_MEJORA[edadAjustada] || [];
}


// Meta de palabras por minuto por edad (para mostrar retroalimentación)
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
 * Devuelve null si no existe en ningún arreglo de edad.
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
