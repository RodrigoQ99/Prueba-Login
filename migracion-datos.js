// ==========================================================
// COPIA DE RESPALDO DE LAS LECTURAS ORIGINALES
// ==========================================================
// Este archivo existe UNA SOLA VEZ para poder subir a Firestore las
// lecturas que ya tenías escritas directamente en el código (antes de
// que existiera el panel de administrador), sin perder nada.
//
// Se usa desde el botón "🚀 Migrar datos antiguos" que aparece en el
// panel de administrador (index.html) SOLO mientras la base de datos
// esté vacía. Una vez migrado, el botón desaparece solo.
//
// Después de migrar exitosamente, puedes pedir que se borre este
// archivo (y su <script> en index.html) — ya no se necesita porque el
// contenido pasa a vivir en Firestore, editable desde el panel.
// ==========================================================

const DATOS_ORIGINALES_LECTURAS = [

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

    {
        id: "A la deriva",
        titulo: "A la deriva (Horacio Quiroga)",
        nivel: "intermedio",
        tiempoLectura: 300,
        tiempoCuestionario: 120,
        texto: [
            `El hombre pisó blanduzco, y en seguida sintió la mordedura en el pie. Saltó adelante, y al volverse con un juramento vio una yararacusú que arrollada sobre sí misma esperaba otro ataque.`,
            `El hombre echó una veloz ojeada a su pie, donde dos gotitas de sangre engrosaban dificultosamente, y sacó el machete de la cintura. La víbora vio la amenaza, y hundió más la cabeza en el centro mismo de su espiral; pero el machete cayó de lomo, dislocándole las vértebras.`,
            `El hombre se bajó hasta la mordedura, quitó las gotitas de sangre, y durante un instante contempló. Un dolor agudo nacía de los dos puntitos violetas, y comenzaba a invadir todo el pie. Apresuradamente se ligó el tobillo con su pañuelo y siguió por la picada hacia su rancho.`,
            `El dolor en el pie aumentaba, con sensación de tirante abultamiento, y de pronto el hombre sintió dos o tres fulgurantes puntadas que como relámpagos habían irradiado desde la herida hasta la mitad de la pantorrilla. Movía la pierna con dificultad; una metálica sequedad de garganta, seguida de sed quemante, le arrancó un nuevo juramento.`,
            `Llegó por fin al rancho, y se echó de brazos sobre la rueda de un trapiche. Los dos puntitos violeta desaparecían ahora en la monstruosa hinchazón del pie entero. La piel parecía adelgazada y a punto de ceder, de tensa. Quiso llamar a su mujer, y la voz se quebró en un ronco arrastre de garganta reseca. La sed lo devoraba.`,
            `—¡Dorotea! —alcanzó a lanzar en un estertor—. ¡Dame caña!`,
            `Su mujer corrió con un vaso lleno, que el hombre sorbió en tres tragos. Pero no había sentido gusto alguno.`,
            `—¡Te pedí caña, no agua! —rugió de nuevo. ¡Dame caña!`,
            `—¡Pero es caña, Paulino! —protestó la mujer espantada.`,
            `—¡No, me diste agua! ¡Quiero caña, te digo!`,
            `La mujer corrió otra vez, volviendo con la damajuana. El hombre tragó uno tras otro dos vasos, pero no sintió nada en la garganta.`,
            `—Bueno; esto se pone feo —murmuró entonces, mirando su pie lívido y ya con lustre gangrenoso. Sobre la honda ligadura del pañuelo, la carne desbordaba como una monstruosa morcilla.`,
            `Los dolores fulgurantes se sucedían en continuos relampagueos, y llegaban ahora a la ingle. La atroz sequedad de garganta que el aliento parecía caldear más, aumentaba a la par. Cuando pretendió incorporarse, un fulminante vómito lo mantuvo medio minuto con la frente apoyada en la rueda de palo.`,
            `Pero el hombre no quería morir, y descendiendo hasta la costa subió a su canoa. Sentóse en la popa y comenzó a palear hasta el centro del Paraná. Allí la corriente del río, que en las inmediaciones del Iguazú corre seis millas, lo llevaría antes de cinco horas a Tacurú-Pucú.`,
            `El hombre, con sombría energía, pudo efectivamente llegar hasta el medio del río; pero allí sus manos dormidas dejaron caer la pala en la canoa, y tras un nuevo vómito —de sangre esta vez— dirigió una mirada al sol que ya trasponía el monte.`,
            `La pierna entera, hasta medio muslo, era ya un bloque deforme y durísimo que reventaba la ropa. El hombre cortó la ligadura y abrió el pantalón con su cuchillo: el bajo vientre desbordó hinchado, con grandes manchas lívidas y terriblemente doloroso. El hombre pensó que no podría jamás llegar él solo a Tacurú-Pucú, y se decidió a pedir ayuda a su compadre Alves, aunque hacía mucho tiempo que estaban disgustados.`,
            `La corriente del río se precipitaba ahora hacia la costa brasileña, y el hombre pudo fácilmente atracar. Se arrastró por la picada en cuesta arriba, pero a los veinte metros, exhausto, quedó tendido de pecho.`,
            `—¡Alves! —gritó con cuanta fuerza pudo; y prestó oído en vano.`,
            `—¡Compadre Alves! ¡No me niegue este favor! —clamó de nuevo, alzando la cabeza del suelo. En el silencio de la selva no se oyó un solo rumor. El hombre tuvo aún valor para llegar hasta su canoa, y la corriente, cogiéndola de nuevo, la llevó velozmente a la deriva.`,
            `El Paraná corre allí en el fondo de una inmensa hoya, cuyas paredes, altas de cien metros, encajonan fúnebremente el río. Desde las orillas bordeadas de negros bloques de basalto, asciende el bosque, negro también. Adelante, a los costados, detrás, la eterna muralla lúgubre, en cuyo fondo el río arremolinado se precipita en incesantes borbollones de agua fangosa. El paisaje es agresivo, y reina en él un silencio de muerte. Al atardecer, sin embargo, su belleza sombría y calma cobra una majestad única.`,
            `El sol había caído ya cuando el hombre, semitendido en el fondo de la canoa, tuvo un violento escalofrío. Y de pronto, con asombro, enderezó pesadamente la cabeza: se sentía mejor. La pierna le dolía apenas, la sed disminuía, y su pecho, libre ya, se abría en lenta inspiración.`,
            `El veneno comenzaba a irse, no había duda. Se hallaba casi bien, y aunque no tenía fuerzas para mover la mano, contaba con la caída del rocío para reponerse del todo. Calculó que antes de tres horas estaría en Tacurú-Pucú.`,
            `El bienestar avanzaba, y con él una somnolencia llena de recuerdos. No sentía ya nada ni en la pierna ni en el vientre. ¿Viviría aún su compadre Gaona en Tacurú-Pucú? Acaso viera también a su ex patrón mister Dougald, y al recibidor del obraje.`,
            `¿Llegaría pronto? El cielo, al poniente, se abría ahora en pantalla de oro, y el río se había coloreado también. Desde la costa paraguaya, ya entenebrecida, el monte dejaba caer sobre el río su frescura crepuscular, en penetrantes efluvios de azahar y miel silvestre. Una pareja de guacamayos cruzó muy alto y en silencio hacia el Paraguay.`,
            `Allá abajo, sobre el río de oro, la canoa derivaba velozmente, girando a ratos sobre sí misma ante el borbollón de un remolino. El hombre que iba en ella se sentía cada vez mejor, y pensaba entretanto en el tiempo justo que había pasado sin ver a su ex patrón Dougald. ¿Tres años? Tal vez no, no tanto. ¿Dos años y nueve meses? Acaso. ¿Ocho meses y medio? Eso sí, seguramente.`,
            `De pronto sintió que estaba helado hasta el pecho. ¿Qué sería? Y la respiración también...`,
            `Al recibidor de maderas de mister Dougald, Lorenzo Cubilla, lo había conocido en Puerto Esperanza un viernes santo... ¿Viernes? Sí, o jueves...`,
            `El hombre estiró lentamente los dedos de la mano.`,
            `—Un jueves...`,
            `Y cesó de respirar.`
        ],
        preguntas: [
            {
                pregunta: "¿Qué le mordió el pie al hombre al inicio del cuento?",
                opciones: [
                    { texto: "Una yararacusú (una serpiente venenosa)", valor: "a" },
                    { texto: "Una araña grande", valor: "b" },
                    { texto: "Un escorpión", valor: "c" },
                    { texto: "Un caimán", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Por qué el hombre le reclamó a su esposa Dorotea que le había dado agua en vez de caña?",
                opciones: [
                    { texto: "Porque el veneno ya le había quitado la capacidad de sentir sabores", valor: "a" },
                    { texto: "Porque ella en verdad le dio agua por error", valor: "b" },
                    { texto: "Porque quería emborracharse para soportar el dolor", valor: "c" },
                    { texto: "Porque la caña se le había terminado en la casa", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Por qué el hombre decidió subirse a la canoa y remar por el río?",
                opciones: [
                    { texto: "Para intentar llegar más rápido a Tacurú-Pucú y buscar ayuda", valor: "a" },
                    { texto: "Porque quería alejarse de su esposa tras la discusión", valor: "b" },
                    { texto: "Porque pensó que el agua fría le calmaría el dolor", valor: "c" },
                    { texto: "Porque escuchó a alguien llamándolo desde el otro lado del río", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "¿Qué pasó cuando el hombre llamó a su compadre Alves pidiendo ayuda?",
                opciones: [
                    { texto: "Nadie respondió y tuvo que volver solo a la canoa", valor: "a" },
                    { texto: "Alves lo escuchó y llegó a ayudarlo de inmediato", valor: "b" },
                    { texto: "Alves le gritó que no lo ayudaría por su vieja pelea", valor: "c" },
                    { texto: "Alves ya se había mudado de esa zona hace tiempo", valor: "d" }
                ],
                correcta: "a"
            },
            {
                pregunta: "Al final del cuento, cuando el hombre siente que 'se sentía mejor', ¿qué está ocurriendo en realidad?",
                opciones: [
                    { texto: "Es una falsa mejoría; en realidad el veneno lo está matando y muere poco después", valor: "a" },
                    { texto: "El veneno realmente ha dejado de hacer efecto y se salva", valor: "b" },
                    { texto: "Ha llegado a Tacurú-Pucú y lo están atendiendo médicos", valor: "c" },
                    { texto: "Está soñando todo el episodio de la mordedura", valor: "d" }
                ],
                correcta: "a"
            }
        ]
    },

    {
        id: "odisea-polifemo",
        titulo: "La Odisea: Odiseo en la cueva de Polifemo",
        nivel: "dificil",
        tiempoLectura: 480,
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

];


const DATOS_ORIGINALES_MEJORA = {

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

    11: [],
    12: [],
    13: [],
    14: [],
    15: []

};


// ==========================
// EJECUTAR LA MIGRACIÓN
// ==========================
// Sube todo lo de arriba a Firestore. Usa .set() (no .add()), así que
// si se ejecuta más de una vez por error, simplemente sobreescribe con
// los mismos datos — no duplica nada.

async function migrarDatosOriginales() {

    if (!esAdmin()) return;

    const confirmado = confirm(
        "Esto va a copiar las lecturas originales (el pollo, A la deriva, " +
        "la Odisea, y las de Mejorar la lectura) a la base de datos. " +
        "¿Continuar?"
    );

    if (!confirmado) return;

    try {

        const lote = db.batch();

        DATOS_ORIGINALES_LECTURAS.forEach((lectura, indice) => {
            const ref = db.collection("lecturas").doc(lectura.id);
            lote.set(ref, {
                titulo: lectura.titulo,
                nivel: lectura.nivel,
                tiempoLectura: lectura.tiempoLectura,
                tiempoCuestionario: lectura.tiempoCuestionario,
                texto: lectura.texto,
                bancoPreguntas: lectura.preguntas,
                preguntasAMostrar: lectura.preguntas.length,
                orden: indice
            });
        });

        Object.keys(DATOS_ORIGINALES_MEJORA).forEach(edad => {
            DATOS_ORIGINALES_MEJORA[edad].forEach((lectura, indice) => {
                const ref = db.collection("mejoraLecturas").doc(lectura.id);
                lote.set(ref, {
                    edad: Number(edad),
                    titulo: lectura.titulo,
                    texto: lectura.texto,
                    bancoPreguntas: lectura.preguntas,
                    preguntasAMostrar: lectura.preguntas.length,
                    orden: indice
                });
            });
        });

        await lote.commit();
        await cargarCatalogoLecturas(true);
        await cargarCatalogoMejora(true);

        alert("¡Listo! Se migraron todas las lecturas a la base de datos.");

        if (typeof inicializarAdminLecturasPremios === "function") inicializarAdminLecturasPremios();

    } catch (error) {
        console.error("Error migrando los datos originales:", error);
        alert("Ocurrió un error migrando los datos. Revisa la consola (F12) para más detalles.");
    }

}
