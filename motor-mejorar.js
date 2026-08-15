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

const parametrosMejora = new URLSearchParams(window.location.search);
const idLecturaMejora = parametrosMejora.get("id");
const ubicacion = ubicarLecturaMejora(idLecturaMejora);

let segundosTranscurridos = 0;
let cronometroInterval = null;
let yaAvanzoAlCuestionario = false;
let listaPalabrasTexto = [];


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

    if (!ubicacion) {

        document.body.innerHTML =
            "<div style='text-align:center; margin-top:80px; font-family:sans-serif;'>" +
            "<h1>Lectura no encontrada</h1>" +
            "<p>Esta lectura de práctica ya no está disponible.</p>" +
            "<a href='mejora.html'>Volver a Mejorar la lectura</a>" +
            "</div>";

        return;

    }

    const user = auth.currentUser;
    if (!user) return;

    // Revisar que esta lectura esté desbloqueada (no se pueden saltar
    // lecturas dentro de una misma edad)
    const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
    const datos = usuarioDoc.exists ? usuarioDoc.data() : {};
    const completadas = datos.mejoraCompletadas || [];

    const listaDeEstaEdad = CATALOGO_MEJORA[ubicacion.edad] || [];
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

    textoLecturaMejora.innerHTML = lectura.texto
        .map(parrafo => `<p>${parrafo}</p>`)
        .join("");

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

    // Arrancar el cronómetro
    cronometroInterval = setInterval(() => {

        segundosTranscurridos++;

        const minutos = String(Math.floor(segundosTranscurridos / 60)).padStart(2, "0");
        const segundos = String(segundosTranscurridos % 60).padStart(2, "0");
        cronometro.textContent = `${minutos}:${segundos}`;

        if (segundosTranscurridos >= TIEMPO_CHECKPOINT && !yaAvanzoAlCuestionario) {
            mostrarCheckpoint();
        }

    }, 1000);

}


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

}

// Botón "Logré leer todo" dentro del checkpoint
document.getElementById("btnLogreLeerTodo").addEventListener("click", () => {
    cajaCheckpoint.style.display = "none";
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
        cajaError.textContent = "No encontramos esas palabras en el texto. Revisa la ortografía e intenta de nuevo.";
        cajaError.style.display = "block";
        return;
    }

    cajaError.style.display = "none";
    cajaCheckpoint.style.display = "none";

    const ppm = posicionEncontrada; // ya que el checkpoint siempre es a 1 minuto exacto

    const rango = META_PPM_POR_EDAD[ubicacion.edad] || [0, 0];
    const dentroDeMeta = ppm >= rango[0];

    document.getElementById("resultadoPpm").innerHTML = `
        <p style="font-size:32px; font-weight:800; color:var(--azul); margin-bottom:6px;">
            ~${ppm} palabras por minuto
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

    textoLecturaMejora.style.display = "none";
    btnContinuarCuestionario.style.display = "none";
    cajaCheckpoint.style.display = "none";
    cronometro.style.display = "none";

    cuestionarioMejora.style.display = "block";

    listaPreguntasMejora.innerHTML = ubicacion.lectura.preguntas
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

    const preguntas = ubicacion.lectura.preguntas;
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

    // ¿Era la última lectura de su edad? Si es así, sube de edad
    const listaDeEstaEdad = CATALOGO_MEJORA[ubicacion.edad] || [];
    const eraLaUltima = ubicacion.indice === listaDeEstaEdad.length - 1;

    if (eraLaUltima && ubicacion.edad < 15) {

        const nuevaEdad = ubicacion.edad + 1;

        await db.collection("usuarios").doc(user.uid).update({
            edadActual: nuevaEdad
        });

        mensajeFinalMejora.innerHTML = `
            <p>Resultado: ${correctas}/${preguntas.length} ⭐</p>
            <p style="font-size:20px; font-weight:700; margin:12px 0;">
                🎉 ¡Felicidades! Has pasado al siguiente nivel.
            </p>
            <p>Lees como alguien de ${nuevaEdad} años.</p>
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
