// ==========================================================
// CATÁLOGO CENTRAL DE LECTURAS
// ==========================================================
// Aquí vive TODO el contenido de cada lectura: título, nivel,
// tiempos, texto y preguntas. Un solo lugar para agregar lecturas
// nuevas sin tener que crear páginas HTML nuevas.
//
// CÓMO AGREGAR UNA LECTURA NUEVA:
// 1. Copia uno de los bloques de abajo (entre { y },)
// 2. Cambia el "id" por uno nuevo, único, sin espacios (ej. "leyenda-del-quetzal")
// 3. Cambia nivel, tiempoLectura (segundos), texto y preguntas
// 4. Guarda este archivo y súbelo a GitHub
// 5. El QR de esa golosina debe apuntar a:
//    lectura.html?id=EL-ID-QUE-PUSISTE
//
// Sugerencia de tiempoLectura según el nivel:
//   facil:      45  - 60   (≈1 min)
//   intermedio: 120 - 300  (2-5 min)
//   dificil:    360 - 600  (6-10 min)
// ==========================================================

const CATALOGO_LECTURAS = [

    // ------------------------------------------------------
    // LECTURA 1 — FÁCIL
    // ------------------------------------------------------
    {
        id: "importancia-de-la-lectura",
        titulo: "La importancia de la lectura",
        nivel: "facil",
        tiempoLectura: 60,
        tiempoCuestionario: 30,
        texto: [
            "Érase una vez un hombre y su mujer que estaban sentados delante de su casa dispuestos a comer un pollo asado. Pero entonces el hombre vio a su anciano padre caminar hacia ellos. Rápidamente escondió el pollo, porque no quería compartirlo con su padre. El anciano llegó, se bebió un vaso de cerveza y se fue a casa. El hijo quiso volver a poner el pollo asado en la mesa, pero cuando lo tocó, el pollo se transformó en un gran pato que voló hacia la cara del hijo y no pensaba bajarse.",
            "Cuando alguien intentó quitarle el pato, éste se aferró con saña. A nadie se le permitía tocarlo y el ingrato hijo tenía que alimentarlo todos los días; de lo contrario, lo habría hecho pedazos. Todos sus amigos intentaron liberarlo del animal, pero nada funcionó.",
            "En cuanto alguien intentaba quitárselo, el pato clavaba sus uñas en la carne del hijo, que entonces gritaba de dolor: «¡No importa! Me duele demasiado». Pasó mucho tiempo antes de que el hombre se pusiera a pensar en la causa de este desastre. Y cuando por fin comprendió lo que había hecho mal, tardó mucho tiempo en asimilarlo.",
            "Un rato después, volvieron a sentarse junto a la puerta principal con un pollo asado que pensaban comer. De nuevo vio a su viejo padre acercarse a ellos. Cuando se acercó, el hijo se levantó y caminó hacia él. El padre se asustó y le preguntó:",
            "—Hijo mío, ¿por qué tienes ese feo pato en la cara? Quítatelo.",
            "—Desgraciadamente —dijo el hijo—, no puedo y nadie puede.",
            "Y cayó a los pies de su padre, confesó su avaricia y pidió perdón.",
            "—Te perdono, hijo mío —dijo el padre.",
            "Y en ese instante el pato se convirtió en el pollo asado.",
            "Juntos comieron la comida.",
            "—¡Sabe delicioso! —dijo el anciano—. Estos pollos están bien asados.",
            "—Y a mí también me saben bien, porque me has perdonado —respondió el hijo."
        ],
        preguntas: [
            {
                pregunta: "¿Qué escondió el hombre cuando vio llegar a su padre?",
                opciones: [
                    { texto: "Un vaso de cerveza", valor: "a" },
                    { texto: "El pollo asado", valor: "b" },
                    { texto: "Una comida diferente", valor: "c" }
                ],
                correcta: "b"
            },
            {
                pregunta: "¿En qué se convirtió el pollo asado?",
                opciones: [
                    { texto: "En un perro", valor: "a" },
                    { texto: "En un pato", valor: "b" },
                    { texto: "En un gato", valor: "c" }
                ],
                correcta: "b"
            },
            {
                pregunta: "¿Qué hizo finalmente el hijo?",
                opciones: [
                    { texto: "Vendió el pato", valor: "a" },
                    { texto: "Huyó de su casa", valor: "b" },
                    { texto: "Pidió perdón a su padre", valor: "c" }
                ],
                correcta: "c"
            }
        ]
    },

    // ------------------------------------------------------
    // LECTURA 2 — INTERMEDIO (ejemplo para que veas el patrón)
    // ------------------------------------------------------
    {
        id: "el-tesoro-de-la-biblioteca",
        titulo: "El tesoro de la biblioteca",
        nivel: "intermedio",
        tiempoLectura: 180,
        tiempoCuestionario: 40,
        texto: [
            "En un pueblo pequeño rodeado de montañas, había una biblioteca vieja que casi nadie visitaba. Sus paredes de madera crujían con el viento, y el bibliotecario, don Efraín, pasaba las tardes solo, ordenando libros que parecían dormir en los estantes.",
            "Un día, un grupo de niños entró corriendo, huyendo de la lluvia. Se sentaron en el suelo, empapados, sin saber qué hacer mientras esperaba a que escampara. Don Efraín, sin decir nada, les acercó un libro grande de tapa azul y lo abrió en la primera página.",
            "—¿Quieren escuchar una historia mientras esperan? —preguntó.",
            "Los niños, aburridos, aceptaron sin muchas ganas. Pero conforme don Efraín leía en voz alta, sus caras cambiaron. La historia hablaba de un mapa escondido, de un río que cambiaba de curso cada luna llena, y de un niño valiente que debía encontrar un tesoro antes de que el pueblo se quedara sin agua.",
            "Cuando la lluvia paró, ninguno de los niños se quiso ir. Le pidieron a don Efraín que siguiera leyendo, y él sonrió como no lo hacía hacía mucho tiempo.",
            "—Este libro tiene más de cien años —les dijo—, y ha esperado pacientemente a que alguien quisiera escucharlo.",
            "Desde ese día, los niños volvieron cada tarde, incluso cuando no llovía. Le contaron a sus amigos, y poco a poco la biblioteca se fue llenando de risas, preguntas y páginas pasando.",
            "Un año después, la pequeña biblioteca del pueblo ya no estaba vacía. Don Efraín decía, con orgullo, que el verdadero tesoro nunca estuvo escondido en un mapa: siempre estuvo en los estantes, esperando que alguien decidiera abrir un libro."
        ],
        preguntas: [
            {
                pregunta: "¿Por qué entraron los niños a la biblioteca la primera vez?",
                opciones: [
                    { texto: "Porque querían leer", valor: "a" },
                    { texto: "Porque estaban huyendo de la lluvia", valor: "b" },
                    { texto: "Porque los mandó su maestra", valor: "c" }
                ],
                correcta: "b"
            },
            {
                pregunta: "¿De qué trataba la historia que leyó don Efraín?",
                opciones: [
                    { texto: "De un mapa escondido y un tesoro", valor: "a" },
                    { texto: "De un partido de fútbol", valor: "b" },
                    { texto: "De un viaje en avión", valor: "c" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Qué pasó con la biblioteca después de esa tarde?",
                opciones: [
                    { texto: "Cerró para siempre", valor: "a" },
                    { texto: "Se fue llenando de niños que volvían a leer", valor: "b" },
                    { texto: "La convirtieron en una tienda", valor: "c" }
                ],
                correcta: "b"
            },
            {
                pregunta: "Según don Efraín, ¿dónde estaba el verdadero tesoro?",
                opciones: [
                    { texto: "En el río que cambiaba de curso", valor: "a" },
                    { texto: "En los estantes, esperando ser leído", valor: "b" },
                    { texto: "Escondido en las montañas", valor: "c" }
                ],
                correcta: "b"
            }
        ]
    }

    // Para agregar la lectura DIFÍCIL (o más), copia el patrón de arriba
    // y agrégala aquí como un nuevo objeto, separado por una coma.

];


/**
 * Busca una lectura del catálogo por su ID.
 * Devuelve undefined si no existe (útil para mostrar un error si un
 * QR apunta a un ID que ya no existe o está mal escrito).
 */
function obtenerLecturaPorId(id) {
    return CATALOGO_LECTURAS.find(lectura => lectura.id === id);
}
