// ==========================================================
// MOTOR GENÉRICO DE LECTURA
// ==========================================================
// Esta misma lógica sirve para CUALQUIER lectura del catálogo.
// Sabe cuál mostrar leyendo "?id=..." de la URL (ver lecturas.js).
// ==========================================================


// Tiempo de espera antes de comenzar a mover el texto
const ESPERA_INICIAL = 3;

// Margen de seguridad: el texto termina de moverse un poco antes de que
// se acabe el tiempo total, para asegurar que SIEMPRE se alcance a leer
// completo antes de que aparezca el cuestionario.
const MARGEN_SEGURIDAD = 2;


// ==========================
// ELEMENTOS HTML
// ==========================

const temporizador = document.getElementById("temporizador");
const tituloLectura = document.getElementById("tituloLectura");
const lectura = document.getElementById("lectura");
const cuestionario = document.getElementById("cuestionario");
const listaPreguntas = document.getElementById("listaPreguntas");
const temporizadorCuestionario = document.getElementById("temporizadorCuestionario");


// ==========================
// CARGAR LA LECTURA SEGÚN EL QR (?id=...)
// ==========================

const parametros = new URLSearchParams(window.location.search);
const idLecturaActual = parametros.get("id");
const lecturaActual = obtenerLecturaPorId(idLecturaActual);


// Variables que dependen de la lectura cargada
let TIEMPO_LECTURA = 60;
let TIEMPO_CUESTIONARIO = 30;

let tiempoRestante = 0;
let tiempoRestanteCuestionario = 0;

let relojCuestionario;
let reloj;


// ==========================
// TEMPORIZADOR LECTURA
// ==========================

function actualizarTemporizador(){

    let minutos = Math.floor(tiempoRestante / 60);
    let segundos = tiempoRestante % 60;

    minutos = String(minutos).padStart(2,"0");
    segundos = String(segundos).padStart(2,"0");

    temporizador.textContent = `${minutos}:${segundos}`;

    if(tiempoRestante > 0){

        tiempoRestante--;

    }else{

        clearInterval(reloj);
        finalizarLectura();

    }

}


// ==========================
// INICIO CONTROLADO POR LOGIN
// ==========================
// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.

// Marca si ESTA lectura ya había sido completada con éxito antes
// (se usa más abajo para permitir repasarla sin mostrar el cuestionario)
let lecturaYaCompletadaAntes = false;

async function iniciarLectura(){

    // Si el QR apunta a un ID que no existe en el catálogo
    if(!lecturaActual){

        document.body.innerHTML =
            "<div style='text-align:center; margin-top:80px; font-family:sans-serif;'>" +
            "<h1>Lectura no encontrada</h1>" +
            "<p>El código QR que escaneaste no corresponde a ninguna lectura disponible.</p>" +
            "<a href='index.html'>Volver al inicio</a>" +
            "</div>";

        return;

    }

    const user = auth.currentUser;

    // Marcar esta lectura como "desbloqueada" (escaneada), para que
    // aparezca en "Mis lecturas". No importa si ya estaba desbloqueada:
    // arrayUnion no la duplica.
    if(user){

        db.collection("usuarios").doc(user.uid).update({
            lecturasDesbloqueadas: firebase.firestore.FieldValue.arrayUnion(lecturaActual.id)
        }).catch(error => console.error("No se pudo desbloquear la lectura:", error));

    }

    // ¿Ya la había completado con éxito antes? Si es así, se le va a
    // permitir REPASAR el texto, pero no va a poder responder el
    // cuestionario de nuevo (ver finalizarLectura más abajo).
    if(user){

        try{

            const intentosPrevios = await db.collection("progreso")
                .where("usuarioId", "==", user.uid)
                .where("lecturaId", "==", lecturaActual.id)
                .get();

            lecturaYaCompletadaAntes = intentosPrevios.docs.some(
                doc => doc.data().puntosGanados > 0
            );

        }catch(error){
            console.error("No se pudo revisar el progreso previo:", error);
        }

    }

    // El bloqueo de "una sola sesión" (para evitar reiniciar el tiempo
    // saliendo y regresando) solo aplica a intentos que TODAVÍA no se
    // han completado. Si ya la completó antes, puede reabrirla las
    // veces que quiera para repasar.
    if(!lecturaYaCompletadaAntes){

        const claveIntento = `lectura_iniciada_${lecturaActual.id}`;

        if(sessionStorage.getItem(claveIntento)){

            mostrarMensajeYaIntentado();
            return;

        }

        sessionStorage.setItem(claveIntento, "en-progreso");

    }

    // Cargar los datos de esta lectura
    TIEMPO_LECTURA = lecturaActual.tiempoLectura;
    TIEMPO_CUESTIONARIO = lecturaActual.tiempoCuestionario || 30;

    tiempoRestante = TIEMPO_LECTURA;
    tiempoRestanteCuestionario = TIEMPO_CUESTIONARIO;

    document.title = lecturaActual.titulo;
    tituloLectura.textContent = lecturaActual.titulo;

    // Pintar los párrafos del texto
    lectura.innerHTML = lecturaActual.texto
        .map(parrafo => `<p>${parrafo}</p>`)
        .join("");

    // Pintar las preguntas del cuestionario
    listaPreguntas.innerHTML = lecturaActual.preguntas
        .map((pregunta, indice) => `
            <div class="pregunta">
                <p>${indice + 1}. ${pregunta.pregunta}</p>
                ${pregunta.opciones.map(opcion => `
                    <label>
                        <input type="radio" name="p${indice}" value="${opcion.valor}">
                        ${opcion.texto}
                    </label>
                    <br>
                `).join("")}
            </div>
        `).join("");


    // Mostrar tiempo inicial
    actualizarTemporizador();

    // Iniciar contador
    reloj = setInterval(actualizarTemporizador, 1000);

    moverTextoLectura();

}


// ==========================
// MENSAJE SI YA HABÍA ENTRADO ANTES
// ==========================

function mostrarMensajeYaIntentado(){

    document.getElementById("contenedor").innerHTML = `
        <div style="text-align:center; padding:60px 20px;">
            <h1>Gracias por participar 🙌</h1>
            <p style="color:var(--texto-suave); margin-top:10px;">
                Ya habías comenzado esta lectura en esta sesión.
                Para evitar reinicios, no se puede volver a abrir.
            </p>
            <a href="index.html" class="menuLink"
               style="display:inline-block; max-width:240px; margin:25px auto 0;">
                ← Volver a mis lecturas
            </a>
        </div>
    `;

}


// ==========================
// MOVIMIENTO DE LA LECTURA
// (avanza sola, sincronizada al tiempo; el usuario puede
//  adelantarse deslizando hacia abajo, pero no puede regresar)
// ==========================

function moverTextoLectura(){

    const alturaTexto = lectura.scrollHeight;
    const alturaCaja = lectura.clientHeight;
    const distancia = alturaTexto - alturaCaja;

    const segundosMovimiento = Math.max(
        TIEMPO_LECTURA - ESPERA_INICIAL - MARGEN_SEGURIDAD,
        1
    );

    let posicionMinima = 0;
    let posicionAutomatica = 0;

    const velocidadPxPorMs = distancia / (segundosMovimiento * 1000);

    let inicioMovimiento = false;
    let ultimoTimestamp = null;
    let botonMostrado = false;

    const btnIrCuestionario = document.getElementById("btnIrCuestionario");

    setTimeout(()=>{
        inicioMovimiento = true;
    }, ESPERA_INICIAL * 1000);

    function aplicarPosicion(nuevaPosicion){

        if(nuevaPosicion > posicionMinima){
            posicionMinima = Math.min(nuevaPosicion, distancia);
        }

        lectura.scrollTop = posicionMinima;

        // Si ya se mostró todo el texto (por avance automático o porque
        // el usuario se adelantó deslizando), habilitar el botón para
        // pasar de una vez al cuestionario sin esperar el tiempo restante.
        const yaSeVioTodo = distancia <= 0 || posicionMinima >= distancia;

        if(!botonMostrado && yaSeVioTodo && btnIrCuestionario){
            btnIrCuestionario.style.display = "block";
            botonMostrado = true;
        }

    }

    function moverLectura(ahora){

        if(inicioMovimiento){

            if(ultimoTimestamp === null){
                ultimoTimestamp = ahora;
            }

            const deltaMs = ahora - ultimoTimestamp;
            ultimoTimestamp = ahora;

            posicionAutomatica = Math.min(
                posicionAutomatica + (velocidadPxPorMs * deltaMs),
                distancia
            );

            aplicarPosicion(posicionAutomatica);

        }

        requestAnimationFrame(moverLectura);

    }

    requestAnimationFrame(moverLectura);

    // Permite deslizar hacia ABAJO para leer más rápido,
    // pero bloquea cualquier intento de regresar hacia arriba.
    lectura.addEventListener("scroll", ()=>{

        if(lectura.scrollTop < posicionMinima){

            lectura.scrollTop = posicionMinima;

        }else{

            posicionMinima = lectura.scrollTop;
            posicionAutomatica = Math.max(posicionAutomatica, posicionMinima);

            if(!botonMostrado && posicionMinima >= distancia && btnIrCuestionario){
                btnIrCuestionario.style.display = "block";
                botonMostrado = true;
            }

        }

    });

}


// ==========================
// PASAR AL CUESTIONARIO ANTES DE TIEMPO
// (botón que aparece cuando ya se mostró todo el texto)
// ==========================

function pasarACuestionarioAhora(){

    clearInterval(reloj);
    finalizarLectura();

}


// ==========================
// DECIDIR QUÉ MOSTRAR AL TERMINAR LA LECTURA
// ==========================
// Si es la primera vez → cuestionario normal.
// Si ya la había completado antes → solo un mensaje de repaso,
// sin poder volver a responder el cuestionario.

function finalizarLectura(){

    if(lecturaYaCompletadaAntes){

        mostrarMensajeRepaso();

    }else{

        mostrarCuestionario();

    }

}


// ==========================
// MENSAJE DE REPASO (lectura ya completada antes)
// ==========================

async function mostrarMensajeRepaso(){

    lectura.style.display = "none";
    temporizador.textContent = "00:00";

    const btnIrCuestionario = document.getElementById("btnIrCuestionario");
    if(btnIrCuestionario){
        btnIrCuestionario.style.display = "none";
    }

    cuestionario.style.display = "block";
    listaPreguntas.innerHTML = "";
    document.getElementById("resultado").innerHTML = "";

    const btnTerminar = document.getElementById("btnTerminarCuestionario");
    if(btnTerminar){
        btnTerminar.style.display = "none";
    }

    document.getElementById("mensajeFinal").innerHTML = `
        Ya habías completado esta lectura antes — ¡gracias por repasarla! 📖
    `;

    // Como este QR ya lo habías escaneado, le sugerimos una lectura
    // nueva al azar (si todavía le queda alguna por descubrir)
    await mostrarSugerenciaAleatoria();

    mostrarBotonVolver();

}


// ==========================
// SUGERIR UNA LECTURA NUEVA AL AZAR
// (cuando el QR escaneado ya se había usado antes)
// ==========================

async function mostrarSugerenciaAleatoria(){

    const user = auth.currentUser;
    if(!user) return;

    try{

        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        const desbloqueadas = (usuarioDoc.exists && usuarioDoc.data().lecturasDesbloqueadas) || [];

        const pendientesPorDescubrir = CATALOGO_LECTURAS.filter(
            l => !desbloqueadas.includes(l.id)
        );

        if(pendientesPorDescubrir.length === 0){
            return; // ya descubrió todo el catálogo, no hay nada que sugerir
        }

        const sugerida = pendientesPorDescubrir[
            Math.floor(Math.random() * pendientesPorDescubrir.length)
        ];

        const cajaSugerencia = document.createElement("div");
        cajaSugerencia.className = "cajaSugerencia";
        cajaSugerencia.style.marginTop = "20px";
        cajaSugerencia.innerHTML = `
            <p>🎲 Este código ya lo habías escaneado antes. ¡Prueba con algo nuevo!</p>
            <a href="lectura.html?id=${encodeURIComponent(sugerida.id)}" class="menuLink"
               style="display:inline-block; max-width:300px; margin:12px auto 0;">
                Descubrir una nueva lectura sorpresa →
            </a>
        `;

        cuestionario.appendChild(cajaSugerencia);

    }catch(error){
        console.error("No se pudo cargar la sugerencia aleatoria:", error);
    }

}


// ==========================
// MOSTRAR CUESTIONARIO
// ==========================

function mostrarCuestionario(){

    lectura.style.display = "none";
    cuestionario.style.display = "block";
    temporizador.textContent = "00:00";

    const btnIrCuestionario = document.getElementById("btnIrCuestionario");
    if(btnIrCuestionario){
        btnIrCuestionario.style.display = "none";
    }

    iniciarTemporizadorCuestionario();

}


// ==========================
// TEMPORIZADOR CUESTIONARIO
// ==========================

function iniciarTemporizadorCuestionario(){

    relojCuestionario = setInterval(()=>{

        let minutos = Math.floor(tiempoRestanteCuestionario / 60);
        let segundos = tiempoRestanteCuestionario % 60;

        minutos = String(minutos).padStart(2,"0");
        segundos = String(segundos).padStart(2,"0");

        temporizadorCuestionario.textContent = `Tiempo: ${minutos}:${segundos}`;

        if(tiempoRestanteCuestionario > 0){

            tiempoRestanteCuestionario--;

        }else{

            clearInterval(relojCuestionario);
            calificar();

        }

    },1000);

}


// ==========================
// CALIFICAR CUESTIONARIO
// ==========================

async function calificar(){

    clearInterval(relojCuestionario);

    // Ya se calificó (sin importar si salió bien o mal): se borra la marca
    // de "en progreso" para que, si falló, SÍ pueda volver a intentarlo.
    // El bloqueo de "ya habías comenzado" solo debe aplicar si abandona
    // a la mitad, sin llegar a calificar.
    sessionStorage.removeItem(`lectura_iniciada_${lecturaActual.id}`);

    let estrellas = 0;
    const totalPreguntas = lecturaActual.preguntas.length;

    lecturaActual.preguntas.forEach((pregunta, indice) => {

        const respuesta = document.querySelector(`input[name="p${indice}"]:checked`);

        if(respuesta && respuesta.value === pregunta.correcta){
            estrellas++;
        }

    });

    document.getElementById("resultado").innerHTML =
        `Resultado: ${estrellas}/${totalPreguntas} ⭐`;

    // Guardar el progreso y sumar puntos en Firestore
    const resultadoGuardado = await guardarProgreso(
        lecturaActual.id,
        lecturaActual.nivel,
        estrellas,
        totalPreguntas
    );

    if(resultadoGuardado && resultadoGuardado.aprobo){

        document.getElementById("mensajeFinal").innerHTML =
            `¡Bien hecho! Ganaste: ${resultadoGuardado.premio} 🎉 ` +
            `(+${resultadoGuardado.puntosGanados} puntos)`;

    }else if(resultadoGuardado && resultadoGuardado.yaCompletada){

        document.getElementById("mensajeFinal").innerHTML =
            "Ya habías completado esta lectura antes, recuerda que no se suman puntos dos veces por la misma lectura" +
            "(Te invitamos a seguir escaneando y participando)";

    }else{

        document.getElementById("mensajeFinal").innerHTML =
            "Gracias por participar, te invitamos a continuar leyendo e intentando.";

    }

    // Bloquear respuestas después de calificar
    document.querySelectorAll("input[type='radio']").forEach(opcion => {
        opcion.disabled = true;
    });

    mostrarBotonVolver();

}


// ==========================
// BOTÓN "VOLVER A MIS LECTURAS"
// ==========================
// Aparece siempre al terminar, ya sea que calificó el cuestionario
// o que solo repasó una lectura ya completada antes.

function mostrarBotonVolver(){

    if(document.getElementById("btnVolverInicio")){
        return; // ya está mostrado, no lo dupliques
    }

    const contenedorBoton = document.createElement("div");
    contenedorBoton.style.textAlign = "center";
    contenedorBoton.style.marginTop = "20px";

    contenedorBoton.innerHTML = `
        <a id="btnVolverInicio" href="index.html" class="menuLink"
           style="display:inline-block; max-width:240px; margin:0 auto;">
            ← Volver a mis lecturas
        </a>
    `;

    cuestionario.appendChild(contenedorBoton);

}
