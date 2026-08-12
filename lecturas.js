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
    },

    // ------------------------------------------------------
    // LECTURA 3 — DIFÍCIL
    // ------------------------------------------------------
    {
        id: "odisea-polifemo",
        titulo: "La Odisea: Odiseo en la cueva de Polifemo",
        nivel: "dificil",
        tiempoLectura: 600,
        tiempoCuestionario: 180,
        texto: [
            `Llegamos a la tierra de los Cíclopes, hombres soberbios y sin ley que, confiados en los dioses inmortales, no plantan árboles ni labran la tierra, sino que todo les nace sin semilla y sin arado... No tienen ágoras donde se reúnan para deliberar, ni leyes, sino que viven en las cumbres de las altas montañas, dentro de cuevas profundas, y cada uno gobierna a sus hijos y a sus mujeres, sin preocuparse los unos de los otros.`,
            `(...) Pronto llegamos a la gruta, mas no dimos con él, pues estaba apacentando sus gordas ovejas en el monte. Entramos y nos pusimos a contemplar con asombro todas las cosas: los canastos rebosaban de quesos; los establos estaban llenos de corderos y cabritos, clasificados por edades... Mis compañeros me rogaron que nos apoderáramos de algunos quesos y que, luego, sacando prestamente de los establos corderos y cabritos, los lleváramos a la velera nave para navegar de nuevo sobre el salobre mar. Mas yo no les hice caso —¡ojalá les hubiera escuchado!— con el propósito de ver al gigante y probar si me daría los dones de la hospitalidad. Pero su presencia no iba a ser grata para mis compañeros.`,
            `Encendimos fuego, ofrecimos un sacrificio a los dioses, tomamos algunos quesos, comimos y nos sentamos a esperarle, hasta que llegó con el ganado. Traía una carga enorme de leña seca para preparar su cena y la descargó dentro de la cueva con tal estruendo que nosotros, llenos de pavor, nos refugiamos en lo más hondo de la gruta. Luego metió en la espaciosa cueva todas las pingües ovejas que tenía que ordeñar... y después cerró la puerta con una piedra tan grande y pesada que no la hubiesen levantado veintidós sólidos carros de cuatro ruedas.`,
            `(...) Cuando hubo terminado sus faenas, encendió fuego, nos vio y nos preguntó: —¡Oh, forasteros! ¿Quiénes sois? ¿De dónde venís navegando por los húmedos caminos? ¿Venís por algún asunto o vais errantes, como los piratas que exponen su vida vagando por el mar para causar daño a los extraños?`,
            `Así dijo. Se nos partió el corazón de miedo ante el temor de su voz profunda y su aspecto monstruoso. Pero yo, hablándole, le dije estas palabras: —Somos aqueos a quienes el viento ha desviado de Troya... Nos hemos llegado a tus rodillas por si quisieras darnos los dones de la hospitalidad o cualquier otro regalo, como es costumbre entre los huéspedes. ¡Oh, el mejor de los hombres! Respeta a los dioses, que somos tus suplicantes, y Zeus es el vengador de los forasteros y los huéspedes.`,
            `Así le hablé, y él me respondió con ánimo cruel: —Eres un necio, forastero, o vienes de muy lejos, pues me ordenas temer a los dioses o evitarlos. Los Cíclopes no nos cuidamos de Zeus, ni de los dioses bienaventurados, porque somos mucho más fuertes que ellos...`,
            `Dicho esto, saltó y echó mano a mis compañeros: agarró a dos y, como si fueran cachorros, los arrojó contra el suelo; sus cerebros saltaron fuera e impregnaron la tierra. Luego los despedazó miembro a miembro y se preparó una cena. Comía como un león montaraz, sin dejarse nada: ni las entrañas, ni la carne, ni los huesos llenos de medula. Nosotros, llorando, alzamos nuestras manos a Zeus al ver tales crueldades.`,
            `(...) Cuando el Cíclope hubo llenado su vientre comiendo carne humana y bebiendo leche pura, se acostó en la cueva, tendido en medio de las ovejas. Entonces yo formé en mi magnánimo espíritu el plan de acercarme a él y, sacando la aguda espada que colgaba de mi muslo, herirle en el pecho... Pero otra consideración me detuvo: allí mismo hubiéramos perecido todos de una muerte terrible, pues no habríamos podido apartar con nuestras manos la pesada piedra que él puso en la alta entrada. Y así, gimiendo, aguardamos a la divina Aurora.`,
            `(...) Al llegar la noche volvió el Cíclope con su ganado de hermoso vellón. Cuando hubo realizado sus faenas, agarró de nuevo a otros dos de mis compañeros y se preparó la cena. Entonces yo, acercándome al Cíclope con una copa de negro vino en la mano, le dije: —¡Cíclope! Bebe vino después que has comido carne humana, para que sepas qué bebida se guardaba en nuestro buque...`,
            `Tomó el vino y lo bebió; y le agradó tanto que me pidió más: —Dame más de buen grado y dime ahora mismo tu nombre para que te dé el don de la hospitalidad.`,
            `Tres veces le di el vino y tres veces lo bebió con su total insensatez. Y cuando el vino le nubló la mente, le dije con suaves palabras: —¡Cíclope! Me preguntas mi nombre ilustre y yo te lo voy a decir; pero dame tú el don de la hospitalidad como me prometiste. Mi nombre es Nadie; Nadie me llaman mi madre, mi padre y todos mis compañeros.`,
            `Así le hablé y él me respondió con ánimo cruel: —A Nadie me lo comeré al último, después de sus compañeros; a todos los demás antes. Ese será mi don de hospitalidad.`,
            `Dijo, y se desplomó de espaldas; quedó tendido con el grueso cuello inclinado a un lado y el sueño, que todo lo vence, lo rindió. De su garganta salía vino y pedazos de carne humana. Entonces yo arrimé la estaca debajo del abundante rescoldo para que se calentase y con mis palabras infundí ánimo a todos los compañeros. Cuando la estaca de olivo estaba a punto de arder, a pesar de ser verde, y resplandecía terriblemente, la saqué del fuego... Los compañeros la tomaron y la hundieron por la punta en el ojo del Cíclope; y yo, apoyándome en la parte superior, le daba vueltas.`,
            `El Cíclope lanzó un fuerte y terrible grito; las rocas retumbaron en torno y nosotros, atemorizados, nos alejamos de él. Él se arrancó del ojo la estaca, empapada en sangre, y la arrojó lejos de sí, agitando los brazos. Y llamó a grandes voces a los Cíclopes que habitaban en las cuevas de las cumbres. Al oír sus gritos, acudieron unos por un lado y otros por otro, y se detuvieron junto a la cueva preguntándole qué le afligía: —¿Por qué, Polifemo, gritas de esa manera en la divina noche y nos despiertas a todos? ¿Es que algún hombre se lleva tu ganado contra tu voluntad? ¿O es que alguien te está matando por medio del engaño o de la fuerza?`,
            `Y el fuerte Polifemo les respondió desde la cueva: —¡Oh, amigos! Nadie me mata con engaño y no con fuerza.`,
            `Y ellos le respondieron con estas aladas palabras: —Pues si nadie te hace fuerza y estás solo, es imposible evitar la enfermedad que envía el gran Zeus; pero tú ruega a tu padre, el soberano Poseidón.`,
            `Dicho esto se marcharon, y mi corazón se rió de cómo mi nombre y mi excelente plan les habían engañado.`,
            `(...) Atamos las ovejas de tres en tres; el del medio llevaba a un hombre y los otros dos iban a los lados para proteger a mis compañeros. En cuanto a mí, escogí un carnero, el mejor de todo el rebaño, y agarrándome a su lomo, me quedé escondido bajo su velludo vientre...`,
            `Cuando estuvimos a cierta distancia de la cueva y del corral, me solté del carnero y desaté a mis compañeros. Rápidamente llevamos hacia la nave las gordas ovejas y nos pusimos a navegar. Pero cuando estábamos a una distancia desde la cual se oyen los gritos, hablé al Cíclope con palabras burlonas: —¡Cíclope! No eran de un hombre débil los compañeros que te comiste en tu hueca gruta con tu fuerza brutal. Tus maldades habían de alcanzarte, ¡cruel!, ya que no temiste comer a tus huéspedes en tu propia casa; por eso Zeus y los demás dioses te han castigado.`,
            `Así le hablé; y él, irritándose más en su corazón, arrancó la cumbre de una gran montaña y la arrojó delante de nuestra nave... El mar se agitó por la caída de la roca. Mis compañeros me instaban con dulces palabras para que no provocara más al monstruo, pero yo, no pudiendo convencer a mi corazón, de nuevo le grité con ánimo colérico: —¡Cíclope! Si alguno de los mortales te pregunta por la vergonzosa ceguera de tu ojo, dile que Odiseo, el asolador de ciudades, hijo de Laertes, que tiene su casa en Ítaca, fue quien te lo sacó.`
        ],
        preguntas: [
            {
                pregunta: "¿Cuál fue el error estratégico inicial de Odiseo que puso en peligro a su tripulación?",
                opciones: [
                    { texto: "Ignorar la petición de sus hombres de robar comida y marcharse de inmediato", valor: "a" },
                    { texto: "No haber llevado armas suficientes para enfrentar a los Cíclopes", valor: "b" },
                    { texto: "Entrar en la cueva sin antes haber ofrecido un sacrificio adecuado", valor: "c" },
                    { texto: "Subestimar la fuerza física del Cíclope al creer que podrían mover la piedra", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Por qué Odiseo decidió no matar a Polifemo mientras este dormía después de su primera cena?",
                opciones: [
                    { texto: "Comprendió que la piedra que bloqueaba la salida era imposible de mover para los humanos", valor: "a" },
                    { texto: "Temía la represalia inmediata de los otros Cíclopes vecinos", valor: "b" },
                    { texto: "Deseaba interrogarlo primero sobre la ruta de navegación más segura", valor: "c" },
                    { texto: "Recibió una señal divina de Zeus advirtiéndole que no lo hiciera", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Qué aspecto del lenguaje permitió que el engaño del nombre 'Nadie' funcionara con los otros Cíclopes?",
                opciones: [
                    { texto: "La interpretación del nombre propio como un pronombre indefinido por parte de los vecinos", valor: "a" },
                    { texto: "El uso de un dialecto que los otros Cíclopes no comprendían bien", valor: "b" },
                    { texto: "La sordera parcial de los Cíclopes por vivir en cuevas profundas", valor: "c" },
                    { texto: "El hecho de que Polifemo fuera mudo y solo gritara", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Qué detalles se mencionan sobre la estaca usada para cegar a Polifemo?",
                opciones: [
                    { texto: "Era de madera de olivo y fue endurecida al fuego a pesar de estar verde", valor: "a" },
                    { texto: "Se trataba de un mástil de barco afilado con espadas", valor: "b" },
                    { texto: "Era una lanza de bronce oculta bajo la túnica de Odiseo", valor: "c" },
                    { texto: "Fue tallada en madera de encino", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Cómo lograron Odiseo y sus hombres salir de la cueva tras cegar al gigante?",
                opciones: [
                    { texto: "Atándose bajo el vientre de las ovejas para pasar desapercibidos al tacto del Cíclope", valor: "a" },
                    { texto: "Aprovechando un momento en que el gigante salió a pedir ayuda a Poseidón", valor: "b" },
                    { texto: "Disfrazándose con las pieles de los compañeros ya devorados", valor: "c" },
                    { texto: "Cavando un túnel por debajo de la piedra que bloqueaba la entrada", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Cuál es el motivo principal por el que Odiseo revela su verdadera identidad a Polifemo al final?",
                opciones: [
                    { texto: "Su orgullo y el deseo de que su hazaña fuera atribuida a su nombre real", valor: "a" },
                    { texto: "Para asustar al Cíclope con el prestigio de su linaje", valor: "b" },
                    { texto: "Como parte de un ritual religioso obligatorio", valor: "c" },
                    { texto: "Para cumplir una profecía sobre el nombre de su cegador", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Qué consecuencia tuvo para el resto del viaje que Odiseo revelara su nombre?",
                opciones: [
                    { texto: "Permitió que Polifemo invocara a Poseidón para maldecir el regreso de Odiseo", valor: "a" },
                    { texto: "Hizo que los otros Cíclopes persiguieran la nave durante semanas", valor: "b" },
                    { texto: "Provocó que Zeus decidiera hundir la nave de Odiseo", valor: "c" },
                    { texto: "Le otorgó a Odiseo el favor inmediato de Atenea", valor: "d" }
                ],
                correcta: "a"
            }
        ]
    }

    // Para agregar más lecturas, copia el patrón de arriba
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
