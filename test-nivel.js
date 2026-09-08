// ==========================================================
// TEST DE UBICACIÓN DE NIVEL DE LECTURA (Etapa 37)
// ==========================================================
// A esta pantalla llega quien, al registrarse, eligió "Desconozco mi
// nivel" (ver registro.js). Mide dos cosas con una sola lectura:
//
//   1. VELOCIDAD (palabras por minuto): se cronometra desde que toca
//      "Empezar a leer" hasta que toca "Ya terminé de leer".
//   2. COMPRENSIÓN (% de aciertos): un cuestionario corto sobre el
//      texto, que solo aparece DESPUÉS de terminar de leer — el texto
//      se esconde para que no pueda volver a buscarlo.
//
// El nivel final es el MÁS BAJO de los dos (ver calcularNivelLectura en
// niveles-lectura.js): quien lee rapidísimo pero no entendió no es un
// lector avanzado.
//
// El resultado se guarda en usuarios/{uid}.nivelLectura y apaga la
// bandera "pendienteTestNivel", para que no se le vuelva a pedir.
// ==========================================================

const TEXTO_TEST_NIVEL = [
    "Durante siglos, leer fue una de las pocas maneras de viajar sin moverse. Quien abría un libro entraba a una conversación lenta, sostenida, en la que alguien más había ordenado sus ideas con cuidado para que otro pudiera seguirlas. Esa conversación exigía algo poco común hoy: quedarse quieto. No había manera de avanzar en la página sin entregarle a esas líneas una parte del día, y ese tiempo entregado era justamente lo que convertía la lectura en un hábito y no en un accidente.",

    "La llegada de las pantallas no eliminó la lectura; la multiplicó y la partió en pedazos. Hoy leemos más palabras que nunca: mensajes, titulares, comentarios, descripciones de productos, subtítulos que pasan volando. Pero casi todas esas palabras están diseñadas para consumirse en segundos y para competir entre sí. Cada una pelea por un instante de atención y, apenas lo consigue, aparece la siguiente. El resultado es una lectura veloz y superficial, entrenada para saltar de un estímulo a otro sin detenerse en ninguno.",

    "El problema no es la tecnología en sí misma, sino el tipo de atención que premia. Una aplicación bien diseñada aprende qué nos mantiene mirando y nos ofrece más de eso, sin pausas incómodas. Un libro, en cambio, no se adapta a nosotros: exige que nosotros nos adaptemos a él. Nos pide sostener una idea durante varias páginas antes de recompensarnos, y esa espera se ha vuelto difícil de tolerar para una mente acostumbrada a que el premio llegue de inmediato. Muchos lectores describen la misma sensación: quieren leer, se sientan a hacerlo, y a los pocos minutos su mano busca el teléfono sin que ellos lo hayan decidido.",

    "Ese gesto casi automático explica buena parte de la pérdida. El hábito de la lectura no desaparece de golpe por una decisión consciente, sino que se erosiona en interrupciones pequeñas y repetidas. Cada notificación obliga a reconstruir el hilo de lo que se venía entendiendo, y reconstruirlo cuesta más energía de la que parece. Después de varias interrupciones, el texto se siente pesado, y la conclusión equivocada llega sola: uno cree que el libro es aburrido, cuando en realidad lo que se perdió fue la continuidad.",

    "La comprensión profunda depende de esa continuidad. Entender un texto largo no consiste solo en reconocer palabras, sino en sostener en la memoria lo que se leyó hace tres párrafos para conectarlo con lo que se está leyendo ahora. Esa conexión es la que permite inferir, dudar, comparar y llegar a una conclusión propia. Cuando la lectura se fragmenta, la información sigue entrando, pero deja de convertirse en pensamiento organizado, y quedamos con la impresión de haber leído mucho sin poder explicar bien qué.",

    "Recuperar el hábito no exige renunciar a las pantallas ni volver a un pasado idealizado. Exige, más bien, defender deliberadamente ratos de atención continua: elegir un momento del día, quitar de en medio lo que interrumpe y aceptar que los primeros minutos van a ser incómodos, porque la mente tardará un rato en bajar de revoluciones. La lectura sostenida se parece a un músculo: responde al entrenamiento constante y se debilita con el abandono. Cada sesión sin interrupciones lo fortalece un poco, y esa fuerza acumulada es la que, con el tiempo, vuelve a hacer que leer se sienta natural en lugar de forzado."
];

const PREGUNTAS_TEST_NIVEL = [
    {
        pregunta: "Según el texto, ¿qué exigía la lectura tradicional que hoy es poco común?",
        opciones: ["Quedarse quieto y entregarle tiempo", "Leer en voz alta", "Memorizar cada página", "Leer acompañado"],
        correcta: 0
    },
    {
        pregunta: "¿Qué afirma el texto sobre la cantidad de palabras que leemos hoy?",
        opciones: ["Leemos menos que nunca", "Leemos más que nunca, pero fragmentado", "Leemos igual que antes", "Ya casi nadie lee palabras"],
        correcta: 1
    },
    {
        pregunta: "¿Cuál es, según el texto, la diferencia clave entre una aplicación y un libro?",
        opciones: [
            "El libro es más barato",
            "La aplicación se adapta a nosotros; el libro exige que nos adaptemos a él",
            "El libro tiene más información",
            "La aplicación requiere más concentración"
        ],
        correcta: 1
    },
    {
        pregunta: "¿Cómo se pierde el hábito de la lectura, según el texto?",
        opciones: [
            "Por una decisión consciente de dejar de leer",
            "Por falta de libros disponibles",
            "Se erosiona en interrupciones pequeñas y repetidas",
            "Porque los textos actuales son más difíciles"
        ],
        correcta: 2
    },
    {
        pregunta: "¿Por qué la continuidad es importante para la comprensión profunda?",
        opciones: [
            "Porque permite leer más rápido",
            "Porque evita tener que releer",
            "Porque permite sostener en la memoria lo leído antes y conectarlo con lo actual",
            "Porque hace la lectura más entretenida"
        ],
        correcta: 2
    },
    {
        pregunta: "¿Qué propone el texto para recuperar el hábito?",
        opciones: [
            "Renunciar por completo a las pantallas",
            "Defender ratos de atención continua, aceptando que al inicio será incómodo",
            "Leer solo textos cortos",
            "Volver a como se leía en el pasado"
        ],
        correcta: 1
    }
];

function contarPalabrasTexto(parrafos) {
    return parrafos.join(" ").trim().split(/\s+/).filter(p => p.length > 0).length;
}

const PALABRAS_TEST = contarPalabrasTexto(TEXTO_TEST_NIVEL);

let inicioLecturaMs = null;
let ppmMedido = null;

const contenedorTest = () => document.getElementById("contenedorTest");

// ---------------- PANTALLA 1: INTRO ----------------
function pintarIntro() {

    contenedorTest().innerHTML = `
        <h1 style="text-align:center;">📏 Test de ubicación</h1>
        <p style="text-align:center; color:var(--texto-suave); margin-bottom:20px;">
            Vamos a medir tu velocidad y tu comprensión con una lectura corta. No es un examen:
            sirve para saber desde dónde empiezas.
        </p>

        <div class="cajaCheckpoint" style="max-width:520px; margin:0 auto;">
            <p style="margin-bottom:12px;"><strong>Cómo funciona:</strong></p>
            <ol style="margin:0 0 16px 18px; line-height:1.7;">
                <li>Tocas "Empezar a leer" y aparece el texto (${PALABRAS_TEST} palabras).</li>
                <li>Lees a tu ritmo normal, sin apurarte de más.</li>
                <li>Al terminar tocas "Ya terminé de leer" y respondes unas preguntas.</li>
            </ol>
            <p style="font-size:13px; color:var(--texto-suave); margin-bottom:16px;">
                El texto desaparece al pasar a las preguntas, así que léelo con calma la primera vez.
            </p>
            <button type="button" id="btnEmpezarTest" style="width:100%;">Empezar a leer</button>
        </div>
    `;

    document.getElementById("btnEmpezarTest").addEventListener("click", pintarLectura);

}

// ---------------- PANTALLA 2: LECTURA CRONOMETRADA ----------------
function pintarLectura() {

    inicioLecturaMs = Date.now();

    contenedorTest().innerHTML = `
        <div class="cajaCheckpoint" style="max-width:640px; margin:0 auto;">
            <p style="font-size:13px; color:var(--texto-suave); margin-bottom:14px;">
                ⏱️ Leyendo… toca el botón del final apenas termines.
            </p>
            <div style="text-align:left; line-height:1.7; font-size:17px;">
                ${TEXTO_TEST_NIVEL.map(p => `<p style="margin-bottom:14px;">${p}</p>`).join("")}
            </div>
            <button type="button" id="btnTermineLeer" style="width:100%; margin-top:10px;">Ya terminé de leer</button>
        </div>
    `;

    document.getElementById("btnTermineLeer").addEventListener("click", () => {

        const segundos = (Date.now() - inicioLecturaMs) / 1000;
        // Un piso de 10 segundos evita que un toque accidental dé una
        // velocidad absurda (y con ella un nivel que no es real).
        ppmMedido = PALABRAS_TEST / (Math.max(segundos, 10) / 60);
        pintarPreguntas();

    });

}

// ---------------- PANTALLA 3: COMPRENSIÓN ----------------
function pintarPreguntas() {

    contenedorTest().innerHTML = `
        <div class="cajaCheckpoint" style="max-width:640px; margin:0 auto;">
            <h2 style="margin-bottom:6px;">¿Qué tanto quedó?</h2>
            <p style="color:var(--texto-suave); font-size:14px; margin-bottom:18px;">
                Responde sin volver al texto — si dudas, elige lo que recuerdes.
            </p>

            <div style="text-align:left;">
                ${PREGUNTAS_TEST_NIVEL.map((p, i) => `
                    <div style="margin-bottom:18px;">
                        <p style="font-weight:600; margin-bottom:8px;">${i + 1}. ${p.pregunta}</p>
                        ${p.opciones.map((opcion, oi) => `
                            <label style="display:block; margin-bottom:6px; cursor:pointer;">
                                <input type="radio" name="tp${i}" value="${oi}"> ${opcion}
                            </label>
                        `).join("")}
                    </div>
                `).join("")}
            </div>

            <p id="avisoTest" class="errorTexto" style="display:none;"></p>
            <button type="button" id="btnCalificarTest" style="width:100%;">Ver mi resultado</button>
        </div>
    `;

    document.getElementById("btnCalificarTest").addEventListener("click", calificarTest);

}

async function calificarTest() {

    const aviso = document.getElementById("avisoTest");
    const sinResponder = PREGUNTAS_TEST_NIVEL
        .map((p, i) => document.querySelector(`input[name="tp${i}"]:checked`) ? null : i + 1)
        .filter(n => n !== null);

    if (sinResponder.length > 0) {
        aviso.textContent = `Te faltan las preguntas: ${sinResponder.join(", ")}.`;
        aviso.style.display = "block";
        return;
    }

    aviso.style.display = "none";

    let aciertos = 0;
    PREGUNTAS_TEST_NIVEL.forEach((p, i) => {
        const marcada = document.querySelector(`input[name="tp${i}"]:checked`);
        if (marcada && Number(marcada.value) === p.correcta) aciertos++;
    });

    const comprension = (aciertos / PREGUNTAS_TEST_NIVEL.length) * 100;
    const resultado = calcularNivelLectura(ppmMedido, comprension);

    pintarResultado(resultado, aciertos);
    await guardarResultado(resultado);

}

// ---------------- PANTALLA 4: RESULTADO ----------------
function pintarResultado(resultado, aciertos) {

    contenedorTest().innerHTML = `
        <div class="cajaCheckpoint" style="max-width:520px; margin:0 auto; text-align:center;">
            <p style="color:var(--texto-suave); margin-bottom:4px;">Tu nivel de lectura es</p>
            <p style="font-size:40px; font-weight:800; margin:0; color:var(--azul);">Nivel ${resultado.nivel}</p>
            <p style="font-size:20px; font-weight:700; margin:0 0 10px;">${resultado.nombre}</p>
            <p style="color:var(--texto-suave); margin-bottom:20px;">${resultado.descripcion}</p>

            <div class="tarjetasResumen" style="margin-bottom:20px;">
                <div class="tarjetaResumen">
                    <strong>${resultado.ppm}</strong>
                    <span>palabras por minuto</span>
                </div>
                <div class="tarjetaResumen">
                    <strong>${resultado.comprension}%</strong>
                    <span>comprensión (${aciertos}/${PREGUNTAS_TEST_NIVEL.length})</span>
                </div>
            </div>

            <p style="font-size:13px; color:var(--texto-suave); margin-bottom:18px;">
                Tu nivel se toma del más bajo entre velocidad y comprensión, para que refleje
                cuánto entendiste y no solo qué tan rápido leíste.
            </p>

            <a href="index.html" class="menuLink" style="display:inline-block; max-width:260px;">Continuar a Inicio →</a>
        </div>
    `;

}

async function guardarResultado(resultado) {

    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection("usuarios").doc(user.uid).update({
            nivelLectura: {
                nivel: resultado.nivel,
                nombre: resultado.nombre,
                ppm: resultado.ppm,
                comprension: resultado.comprension,
                origen: "test",
                fecha: firebase.firestore.Timestamp.now()
            },
            pendienteTestNivel: false
        });
    } catch (error) {
        console.error("No se pudo guardar tu nivel de lectura:", error);
    }

}

auth.onAuthStateChanged((user) => {

    if (!user) {
        contenedorTest().innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para hacer el test.</p>";
        return;
    }

    pintarIntro();

});
