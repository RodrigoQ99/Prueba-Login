// ==========================================================
// MOTOR — "MEJORAR LA LECTURA"
// ==========================================================
// A diferencia del motor.js del sistema de premios, aquí el texto
// NO se mueve solo: el usuario lo lee a su propio ritmo. Se mide
// cuánto avanza en 1 minuto para calcular sus palabras por minuto.
// Intentos ILIMITADOS, sin restricciones de sesión.
// ==========================================================

const TIEMPO_CHECKPOINT = 60; // segundos (1 minuto)

const tituloLecturaMejora = document.getElementById("tituloLecturaMejora");
const textoLecturaMejora = document.getElementById("textoLecturaMejora");
const cronometro = document.getElementById("cronometro");
const btnContinuarCuestionario = document.getElementById("btnContinuarCuestionario");
const cajaCheckpoint = document.getElementById("cajaCheckpoint");
const cajaResultadoPpm = document.getElementById("cajaResultadoPpm");
const cuestionarioMejora = document.getElementById("cuestionarioMejora");
const listaPreguntasMejora = document.getElementById("listaPreguntasMejora");
const mensajeFinalMejora = document.getElementById("mensajeFinalMejora");
const controlAsistida = document.getElementById("controlAsistida");
const switchLecturaAsistida = document.getElementById("switchLecturaAsistida");
const btnReiniciarAsistida = document.getElementById("btnReiniciarAsistida");

const parametrosMejora = new URLSearchParams(window.location.search);
const idLecturaMejora = parametrosMejora.get("id");

// Se asigna dentro de iniciarLectura(), una vez que el catálogo ya se
// trajo de Firestore (ver cargarCatalogoMejora en mejora-lecturas.js).
let ubicacion = null;

// País del usuario actual (Etapa 30) — se guarda aquí, ya calculado una
// sola vez en iniciarLectura(), para que calificarMejora() (más abajo)
// pueda volver a filtrar CATALOGO_MEJORA[ubicacion.edad] por país al
// decidir si esta era la ÚLTIMA lectura de su edad, sin tener que
// volver a leer el documento del usuario.
let paisUsuarioMejora = null;

let segundosTranscurridos = 0;
let cronometroInterval = null;
let yaAvanzoAlCuestionario = false;
let listaPalabrasTexto = [];

// Lectura asistida: va "subrayando" el texto (como un resaltador) al
// ritmo del minuto, respetando pausas más largas después de comas,
// puntos, etc. Se puede prender/apagar en cualquier momento con el
// interruptor, sin que la página se mueva sola — el usuario sigue
// haciendo scroll libremente. El botón de reinicio (solo habilitado
// mientras está prendida) vuelve el cronómetro y el resaltado a cero
// sin perder la lectura en curso.
let lecturaAsistidaActiva = false;
let spansPalabrasMejora = [];
let tiemposInicioAsistidos = [];

// Pausa extra (en segundos) que se le agrega al avance del resaltado
// después de una palabra que termina en cada uno de estos signos.
const PAUSA_POR_SIGNO_ASISTIDA = {
    ",": 0.25,
    ";": 0.50,
    ":": 0.50,
    ".": 0.80,
    "…": 1.00,
    "?": 0.80,
    "!": 0.80
};

// Preguntas elegidas al azar del banco de esta lectura para ESTA sesión.
let preguntasSeleccionadasMejora = [];


// ==========================
// NORMALIZAR TEXTO (para comparar palabras sin importar
// tildes, mayúsculas o signos de puntuación)
// ==========================

function normalizarPalabra(palabra) {
    return (palabra || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zñ0-9]/gi, "");
}


// ==========================
// INICIO (llamado por auth.js al iniciar sesión / registrarse)
// ==========================

async function iniciarLectura() {

    const user = auth.currentUser;
    if (!user) return;

    // Trae el catálogo y el rango de edades desde Firestore (cacheados).
    await Promise.all([cargarCatalogoMejora(), cargarRangoEdades()]);

    // Se necesita el país ANTES de ubicar la lectura (Etapa 30): el
    // desbloqueo secuencial y "de cuántas" solo cuentan lecturas
    // GLOBALES o del mismo país (ver la nota en ubicarLecturaMejora,
    // mejora-lecturas.js) — nunca lecturas de otro país que este
    // usuario ni siquiera puede ver en mejora.html.
    const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
    const datos = usuarioDoc.exists ? usuarioDoc.data() : {};
    const paisUsuario = datos.pais || null;
    paisUsuarioMejora = paisUsuario;

    ubicacion = ubicarLecturaMejora(idLecturaMejora, paisUsuario);

    if (!ubicacion) {

        document.body.innerHTML =
            "<div style='text-align:center; margin-top:80px; font-family:sans-serif;'>" +
            "<h1>Lectura no encontrada</h1>" +
            "<p>Esta lectura de práctica ya no está disponible.</p>" +
            "<a href='mejora.html'>Volver a Mejorar la lectura</a>" +
            "</div>";

        return;

    }

    // Revisar que esta lectura esté desbloqueada (no se pueden saltar
    // lecturas dentro de una misma edad)
    const completadas = datos.mejoraCompletadas || [];

    const listaDeEstaEdad = filtrarPorPais(CATALOGO_MEJORA[ubicacion.edad] || [], paisUsuario);
    const completadasEnEstaEdad = listaDeEstaEdad.filter(l => completadas.includes(l.id)).length;

    if (ubicacion.indice > completadasEnEstaEdad) {

        document.getElementById("contenedorMejora").innerHTML = `
            <div style="text-align:center; padding:60px 20px;">
                <h1>🔒 Todavía no puedes abrir esta lectura</h1>
                <p style="color:var(--texto-suave); margin-top:10px;">
                    Primero tienes que completar la lectura anterior de tu edad.
                </p>
                <a href="mejora.html" class="menuLink"
                   style="display:inline-block; max-width:260px; margin:25px auto 0;">
                    ← Volver a Mejorar la lectura
                </a>
            </div>
        `;

        return;

    }

    // Cargar el texto
    const lectura = ubicacion.lectura;
    document.title = lectura.titulo;
    tituloLecturaMejora.textContent = lectura.titulo;

    // Cuenta cuántas veces se ha abierto esta lectura (ver "Mis
    // publicaciones" en perfil.js, para lecturas propuestas por
    // usuarios vía "Ser el protagonista de la historia"). No bloquea el
    // render ni afecta puntos/racha/ranking — es solo un contador.
    db.collection("mejoraLecturas").doc(lectura.id)
        .update({ vistas: firebase.firestore.FieldValue.increment(1) })
        .catch(error => console.error("No se pudo registrar la vista de esta lectura:", error));

    // Cada palabra (con su espacio pegado, para que el resaltado no deje
    // huecos entre palabras) queda envuelta en su propio <span>, para
    // poder ir "subrayándolas" progresivamente con la lectura asistida.
    const textoAsistido = prepararTextoAsistido(lectura.texto);
    textoLecturaMejora.innerHTML = textoAsistido.html;

    spansPalabrasMejora = Array.from(textoLecturaMejora.querySelectorAll(".palabraMejora"));
    tiemposInicioAsistidos = calcularIniciosAsistidos(textoAsistido.palabras);

    // Armar la lista de palabras del texto completo (para poder
    // calcular después las palabras por minuto)
    listaPalabrasTexto = lectura.texto
        .join(" ")
        .split(/\s+/)
        .map(normalizarPalabra)
        .filter(p => p.length > 0);

    // Detectar cuando el usuario llega al final del texto ANTES
    // de que se cumpla el minuto, para mostrarle el botón de avanzar
    textoLecturaMejora.addEventListener("scroll", () => {

        if (yaAvanzoAlCuestionario) return;

        const llegoAlFinal =
            textoLecturaMejora.scrollTop + textoLecturaMejora.clientHeight
            >= textoLecturaMejora.scrollHeight - 15;

        if (llegoAlFinal && segundosTranscurridos < TIEMPO_CHECKPOINT) {
            btnContinuarCuestionario.style.display = "block";
        }

    });

    // Arrancar el cronómetro (cada 100ms, para que el resaltado pueda
    // respetar pausas cortas como 0.25s o 0.50s en vez de solo enteros)
    cronometroInterval = setInterval(() => {

        segundosTranscurridos = Math.round((segundosTranscurridos + 0.1) * 10) / 10;

        const segundosEnteros = Math.floor(segundosTranscurridos);
        const minutos = String(Math.floor(segundosEnteros / 60)).padStart(2, "0");
        const segundos = String(segundosEnteros % 60).padStart(2, "0");
        cronometro.textContent = `${minutos}:${segundos}`;

        if (lecturaAsistidaActiva) actualizarResaltadoAsistido();

        if (segundosTranscurridos >= TIEMPO_CHECKPOINT && !yaAvanzoAlCuestionario) {
            mostrarCheckpoint();
        }

    }, 100);

}


// ==========================
// LECTURA ASISTIDA (resaltado + reinicio)
// ==========================

// Envuelve cada palabra del texto en su propio <span>, incluyendo el
// espacio que la sigue (para que el resaltado se vea como una sola
// franja continua, sin huecos entre palabras). Devuelve también la
// lista plana de palabras (con su puntuación pegada) en el mismo
// orden, para calcular después los tiempos de cada una.
function prepararTextoAsistido(parrafos) {

    const tokensPorParrafo = parrafos.map(parrafo =>
        parrafo.split(/\s+/).filter(p => p.length > 0)
    );

    const html = tokensPorParrafo.map(tokens => {
        const palabrasHtml = tokens
            .map((palabra, i) => `<span class="palabraMejora">${palabra}${i < tokens.length - 1 ? " " : ""}</span>`)
            .join("");
        return `<p>${palabrasHtml}</p>`;
    }).join("");

    const palabras = tokensPorParrafo.reduce((todas, tokens) => todas.concat(tokens), []);

    return { html, palabras };

}

// Cuánta pausa extra le corresponde a una palabra según el signo de
// puntuación con el que termina (0 si no termina en ninguno de ellos).
function pausaTrasPalabraAsistida(palabra) {
    if (palabra.endsWith("...")) return PAUSA_POR_SIGNO_ASISTIDA["…"];
    return PAUSA_POR_SIGNO_ASISTIDA[palabra.slice(-1)] || 0;
}

// Calcula, para cada palabra, el segundo (desde que arranca la lectura)
// en el que le toca empezar a verse resaltada. La suma de la lectura
// "base" de todas las palabras más sus pausas de puntuación siempre da
// exactamente TIEMPO_CHECKPOINT, así el resaltado arranca con el
// cronómetro y termina justo al cumplirse el minuto, sin importar cuán
// largo sea el texto ni cuánta puntuación tenga.
function calcularIniciosAsistidos(palabras) {

    if (palabras.length === 0) return [];

    const pausas = palabras.map(pausaTrasPalabraAsistida);
    const pausaTotal = pausas.reduce((suma, p) => suma + p, 0);

    // Si un texto muy corto tuviera tanta puntuación que las pausas por
    // sí solas casi llenarían el minuto, se recortan proporcionalmente
    // para dejarle tiempo de sobra a la lectura de las palabras.
    const presupuestoPausas = Math.min(pausaTotal, TIEMPO_CHECKPOINT * 0.6);
    const factorPausa = pausaTotal > 0 ? presupuestoPausas / pausaTotal : 0;

    const duracionBase = (TIEMPO_CHECKPOINT - presupuestoPausas) / palabras.length;

    const inicios = [];
    let acumulado = 0;

    palabras.forEach((palabra, i) => {
        inicios.push(acumulado);
        acumulado += duracionBase + pausas[i] * factorPausa;
    });

    return inicios;

}

// Resalta (como un marcador amarillo continuo) todas las palabras cuyo
// turno ya llegó según el cronómetro. No mueve el scroll: la
// navegación en "Mejorar la lectura" es libre, el resaltado solo
// acompaña visualmente.
function actualizarResaltadoAsistido() {

    if (spansPalabrasMejora.length === 0) return;

    let indiceActual = 0;
    while (
        indiceActual < tiemposInicioAsistidos.length &&
        tiemposInicioAsistidos[indiceActual] <= segundosTranscurridos
    ) {
        indiceActual++;
    }

    spansPalabrasMejora.forEach((span, i) => {
        span.classList.toggle("palabraResaltada", i < indiceActual);
    });

}

function quitarResaltadoAsistido() {
    spansPalabrasMejora.forEach(span => {
        span.classList.remove("palabraResaltada");
    });
}

switchLecturaAsistida.addEventListener("change", () => {

    lecturaAsistidaActiva = switchLecturaAsistida.checked;
    btnReiniciarAsistida.disabled = !lecturaAsistidaActiva || yaAvanzoAlCuestionario;

    if (lecturaAsistidaActiva) {
        actualizarResaltadoAsistido();
    } else {
        quitarResaltadoAsistido();
    }

});

btnReiniciarAsistida.addEventListener("click", () => {

    if (btnReiniciarAsistida.disabled) return;

    segundosTranscurridos = 0;
    cronometro.textContent = "00:00";
    actualizarResaltadoAsistido();

});


// ==========================
// BOTÓN: "Continuar al cuestionario" (terminó antes del minuto)
// ==========================

btnContinuarCuestionario.addEventListener("click", () => {
    avanzarAlCuestionario();
});


// ==========================
// CHECKPOINT AL MINUTO
// ==========================

function mostrarCheckpoint() {

    clearInterval(cronometroInterval);
    btnContinuarCuestionario.style.display = "none";
    cajaCheckpoint.style.display = "block";
    btnReiniciarAsistida.disabled = true;

    // Habilita el cursor de "clickeable" sobre las palabras mientras el
    // checkpoint está activo (ver métodos 1 y 2 más abajo).
    textoLecturaMejora.classList.add("marcandoCheckpoint");

}

// Botón "Logré leer todo" dentro del checkpoint
document.getElementById("btnLogreLeerTodo").addEventListener("click", () => {
    cajaCheckpoint.style.display = "none";
    textoLecturaMejora.classList.remove("marcandoCheckpoint");
    avanzarAlCuestionario();
});

// Envío del formulario de "últimas 3 palabras"
document.getElementById("formUltimasPalabras").addEventListener("submit", (e) => {

    e.preventDefault();

    const valor = document.getElementById("inputUltimasPalabras").value.trim();
    if (!valor) return;

    calcularPalabrasPorMinuto(valor);

});


// ==========================
// MARCAR LA POSICIÓN DIRECTAMENTE SOBRE EL TEXTO
// ==========================
// Dos formas más de indicar dónde se quedó, además de escribir las
// últimas 3 palabras arriba: seleccionando texto directamente sobre la
// lectura (método 1), o manteniendo presionada la última palabra leída
// (método 2). Las tres conviven — el usuario usa la que prefiera — y
// las dos de aquí abajo arman un fragmento de texto equivalente a lo
// que se escribiría a mano, y se lo pasan a la MISMA
// calcularPalabrasPorMinuto() de siempre: solo cambia cómo se obtiene
// ese fragmento, no cómo se calculan las palabras por minuto.

function checkpointEstaActivo() {
    return cajaCheckpoint.style.display === "block";
}

// Arma un fragmento de hasta 3 palabras que termina en "span" (esa
// palabra más hasta 2 anteriores) — el mismo tipo de fragmento que el
// usuario escribiría a mano en "últimas palabras que leíste".
function obtenerFragmentoDesdeSpan(span) {

    const indice = spansPalabrasMejora.indexOf(span);
    if (indice === -1) return "";

    const desde = Math.max(0, indice - 2);

    return spansPalabrasMejora
        .slice(desde, indice + 1)
        .map(s => s.textContent)
        .join(" ");

}

// --- Método 1: seleccionar/marcar texto directamente sobre la lectura ---

function manejarSeleccionEnTexto() {

    if (!checkpointEstaActivo()) return;

    const seleccion = window.getSelection();
    if (!seleccion || seleccion.isCollapsed) return;

    // Ignora selecciones que empiecen fuera del texto de la lectura
    // (por ejemplo, si el usuario selecciona el mensaje de error).
    const ancla = seleccion.anchorNode;
    if (!ancla || !textoLecturaMejora.contains(ancla)) return;

    const texto = seleccion.toString().trim();
    seleccion.removeAllRanges();

    if (texto) calcularPalabrasPorMinuto(texto);

}

textoLecturaMejora.addEventListener("mouseup", manejarSeleccionEnTexto);
textoLecturaMejora.addEventListener("touchend", manejarSeleccionEnTexto);

// --- Método 2: mantener presionada (clic o dedo) la última palabra leída ---

let temporizadorPresionarPalabra = null;
let coordenadasInicioPresionar = null;

function cancelarPresionarPalabra() {

    if (temporizadorPresionarPalabra) {
        clearTimeout(temporizadorPresionarPalabra);
        temporizadorPresionarPalabra = null;
    }

    coordenadasInicioPresionar = null;
    spansPalabrasMejora.forEach(span => span.classList.remove("palabraPresionada"));

}

textoLecturaMejora.addEventListener("pointerdown", (e) => {

    if (!checkpointEstaActivo()) return;

    const span = e.target.closest(".palabraMejora");
    if (!span) return;

    cancelarPresionarPalabra();
    coordenadasInicioPresionar = { x: e.clientX, y: e.clientY };
    span.classList.add("palabraPresionada");

    // Configurable desde el panel de administrador (⚙️ Configuración,
    // dentro de "Mejorar la lectura"); 2 segundos si nunca se ha
    // configurado (ver mejora-lecturas.js).
    const segundosEspera = RANGO_EDADES.segundosPresionar || 2;

    temporizadorPresionarPalabra = setTimeout(() => {

        temporizadorPresionarPalabra = null;
        span.classList.remove("palabraPresionada");

        if (!checkpointEstaActivo()) return;

        const fragmento = obtenerFragmentoDesdeSpan(span);
        if (fragmento) calcularPalabrasPorMinuto(fragmento);

    }, segundosEspera * 1000);

});

// Soltar antes de tiempo, o mover el dedo/cursor lo suficiente como
// para que ya no sea "mantener presionado" (por ejemplo, un scroll),
// cancela sin marcar nada.
textoLecturaMejora.addEventListener("pointerup", cancelarPresionarPalabra);
textoLecturaMejora.addEventListener("pointercancel", cancelarPresionarPalabra);

textoLecturaMejora.addEventListener("pointermove", (e) => {

    if (!coordenadasInicioPresionar) return;

    const distancia = Math.hypot(
        e.clientX - coordenadasInicioPresionar.x,
        e.clientY - coordenadasInicioPresionar.y
    );

    if (distancia > 10) cancelarPresionarPalabra();

});


// ==========================
// CALCULAR PALABRAS POR MINUTO
// ==========================

function calcularPalabrasPorMinuto(textoIngresado) {

    const palabrasIngresadas = textoIngresado
        .split(/\s+/)
        .map(normalizarPalabra)
        .filter(p => p.length > 0);

    if (palabrasIngresadas.length === 0) return;

    let posicionEncontrada = -1;

    for (let i = 0; i <= listaPalabrasTexto.length - palabrasIngresadas.length; i++) {

        const coincide = palabrasIngresadas.every(
            (palabra, j) => listaPalabrasTexto[i + j] === palabra
        );

        if (coincide) {
            posicionEncontrada = i + palabrasIngresadas.length; // palabras leídas hasta aquí
            break;
        }

    }

    const cajaError = document.getElementById("errorUltimasPalabras");

    if (posicionEncontrada === -1) {
        cajaError.textContent = "No pudimos ubicar esas palabras en el texto. Revisa e intenta de nuevo.";
        cajaError.style.display = "block";
        return;
    }

    cajaError.style.display = "none";
    cajaCheckpoint.style.display = "none";
    textoLecturaMejora.classList.remove("marcandoCheckpoint");
    cancelarPresionarPalabra();

    const ppm = posicionEncontrada; // ya que el checkpoint siempre es a 1 minuto exacto

    const rango = metaPpmParaEdad(ubicacion.edad);
    const dentroDeMeta = ppm >= rango[0];

    document.getElementById("resultadoPpm").innerHTML = `
        <p style="font-size:32px; font-weight:800; color:var(--azul); margin-bottom:6px;">
            ${ppm} palabras por minuto
        </p>
        <p style="color:var(--texto-suave); margin-bottom:14px;">
            Meta para tu edad: ${rango[0]}-${rango[1]} ppm
        </p>
        <p style="font-weight:600;">
            ${dentroDeMeta
                ? "¡Excelente ritmo de lectura! 🎉"
                : "¡Bien hecho, sigue así y llegarás a la meta! 💪"}
        </p>
    `;

    cajaResultadoPpm.style.display = "block";

}

// Botón "Intentar de nuevo" dentro del resultado de PPM
document.getElementById("btnIntentarDeNuevo").addEventListener("click", () => {
    window.location.reload();
});


// ==========================
// PASAR AL CUESTIONARIO
// ==========================

function avanzarAlCuestionario() {

    yaAvanzoAlCuestionario = true;
    clearInterval(cronometroInterval);
    btnReiniciarAsistida.disabled = true;

    textoLecturaMejora.style.display = "none";
    btnContinuarCuestionario.style.display = "none";
    cajaCheckpoint.style.display = "none";
    cronometro.style.display = "none";
    controlAsistida.style.display = "none";

    cuestionarioMejora.style.display = "block";

    preguntasSeleccionadasMejora = elegirPreguntasAlAzar(
        ubicacion.lectura.bancoPreguntas,
        ubicacion.lectura.preguntasAMostrar
    );

    // Sin preguntas no hay nada que calificar — antes esto dejaba el
    // cuestionario vacío pero con "Terminar cuestionario" habilitado, y
    // calificarMejora() lo aprobaba solo (0 correctas === 0 preguntas).
    // Se corta acá para que ni siquiera se pueda intentar.
    if (preguntasSeleccionadasMejora.length === 0) {
        listaPreguntasMejora.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>" +
            "Esta lectura todavía no tiene preguntas configuradas. Avísale a un administrador." +
            "</p>";
        document.getElementById("btnCalificarMejora").style.display = "none";
        return;
    }

    listaPreguntasMejora.innerHTML = preguntasSeleccionadasMejora
        .map((pregunta, indice) => `
            <div class="pregunta">
                <p>${indice + 1}. ${pregunta.pregunta}</p>
                ${pregunta.opciones.map(opcion => `
                    <label>
                        <input type="radio" name="mp${indice}" value="${opcion.valor}">
                        ${opcion.texto}
                    </label>
                    <br>
                `).join("")}
            </div>
        `).join("");

}


// ==========================
// CALIFICAR CUESTIONARIO
// ==========================

async function calificarMejora() {

    const preguntas = preguntasSeleccionadasMejora;

    // Ver la misma nota en avanzarAlCuestionario(): sin preguntas no hay
    // nada que calificar — "correctas === preguntas.length" sería
    // 0 === 0 (aprobado solo), así que no se puede seguir.
    if (preguntas.length === 0) return;

    let correctas = 0;

    preguntas.forEach((pregunta, indice) => {

        const respuesta = document.querySelector(`input[name="mp${indice}"]:checked`);

        if (respuesta && respuesta.value === pregunta.correcta) {
            correctas++;
        }

    });

    document.querySelectorAll("#listaPreguntasMejora input[type='radio']").forEach(opcion => {
        opcion.disabled = true;
    });

    document.getElementById("btnCalificarMejora").style.display = "none";

    const aprobo = correctas === preguntas.length;

    if (!aprobo) {

        mensajeFinalMejora.innerHTML = `
            <p>Resultado: ${correctas}/${preguntas.length} ⭐</p>
            <p>Casi lo logras — ¡inténtalo de nuevo cuando quieras!</p>
            <button onclick="window.location.reload()" style="margin-top:10px;">
                Intentar de nuevo
            </button>
            <a href="mejora.html" class="menuLink"
               style="display:inline-block; max-width:260px; margin:15px auto 0;">
                ← Volver a Mejorar la lectura
            </a>
        `;

        return;

    }

    // Aprobó: guardar el avance
    const user = auth.currentUser;

    await db.collection("usuarios").doc(user.uid).update({
        mejoraCompletadas: firebase.firestore.FieldValue.arrayUnion(ubicacion.lectura.id)
    });

    // Cuenta como actividad del día para la racha 🔥 — aquí "completada"
    // ya significa aprobada (hay intentos ilimitados, así que reprobar
    // no cuenta como completar la lectura; ver racha.js).
    if (typeof registrarActividadRacha === "function") {
        await registrarActividadRacha();
    }

    // ¿Era la última lectura de su edad? Si es así, sube de edad. Mismo
    // filtro por país que en iniciarLectura() — "última" debe ser
    // relativo a lo que este usuario puede ver, no a TODO el catálogo
    // mundial de esa edad.
    const listaDeEstaEdad = filtrarPorPais(CATALOGO_MEJORA[ubicacion.edad] || [], paisUsuarioMejora);
    const eraLaUltima = ubicacion.indice === listaDeEstaEdad.length - 1;

    if (eraLaUltima && !esGrupoMasDelTope(ubicacion.edad)) {

        const nuevaEdad = ubicacion.edad + 1;

        await db.collection("usuarios").doc(user.uid).update({
            edadActual: nuevaEdad
        });

        mensajeFinalMejora.innerHTML = `
            <p>Resultado: ${correctas}/${preguntas.length} ⭐</p>
            <p style="font-size:20px; font-weight:700; margin:12px 0;">
                🎉 ¡Felicidades! Has pasado al siguiente nivel.
            </p>
            <p>Lees a un nivel de ${etiquetaEdad(nuevaEdad)}.</p>
            <a href="mejora.html" class="menuLink"
               style="display:inline-block; max-width:260px; margin:15px auto 0;">
                ← Volver a Mejorar la lectura
            </a>
        `;

    } else {

        mensajeFinalMejora.innerHTML = `
            <p>Resultado: ${correctas}/${preguntas.length} ⭐</p>
            <p>¡Bien hecho! Lectura superada 🎉</p>
            <a href="mejora.html" class="menuLink"
               style="display:inline-block; max-width:260px; margin:15px auto 0;">
                ← Volver a Mejorar la lectura
            </a>
        `;

    }

}
