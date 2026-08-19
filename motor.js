// ==========================================================
// MOTOR GENÉRICO DE LECTURA
// ==========================================================
// Esta misma lógica sirve para CUALQUIER lectura del catálogo.
// Sabe cuál mostrar leyendo "?id=..." de la URL (ver lecturas.js).
//
// Cada lectura se puede intentar UNA SOLA VEZ (leer + responder el
// cuestionario). La oportunidad se marca como usada apenas el usuario
// hace clic en "Comenzar" — así que si sale de la página antes de
// terminar el cuestionario, la pierde igual. Después de usada, puede
// volver a LEER el texto las veces que quiera, pero el cuestionario
// queda bloqueado (ver mostrarRepasoBloqueado).
//
// Excepción — bono de completista: si el usuario ya desbloqueó (con
// código) TODAS las lecturas del catálogo y vuelve a abrir una que
// ya usó, se le regala una oportunidad extra en una lectura al azar de
// las que había fallado (ver revisarBonoDeCompletista). Cada lectura
// solo puede recibir ese bono una vez.
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
// CARGAR LA LECTURA SEGÚN LA URL (?id=...)
// ==========================

const parametros = new URLSearchParams(window.location.search);
const idLecturaActual = parametros.get("id");

// Se asigna dentro de iniciarLectura(), una vez que el catálogo ya se
// trajo de Firestore (ver cargarCatalogoLecturas en lecturas.js).
let lecturaActual = null;

// Preguntas elegidas al azar del banco de esta lectura para ESTA sesión
// (se guardan aquí para poder calificar contra las mismas que se mostraron).
let preguntasSeleccionadas = [];


// Variables que dependen de la lectura cargada
let TIEMPO_LECTURA = 60;
let TIEMPO_CUESTIONARIO = 30;

let tiempoRestante = 0;
let tiempoRestanteCuestionario = 0;

let relojCuestionario;
let reloj;

// true entre el clic en "Comenzar" y que se califica el cuestionario.
// Mientras esté en true, cambiar de pestaña/ventana pierde la oportunidad
// de inmediato (ver abandonarPorCambioDeVisibilidad más abajo).
let intentoEnProgreso = false;


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
        mostrarCuestionario();

    }

}


// ==========================
// INICIO CONTROLADO POR LOGIN
// ==========================
// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.

async function iniciarLectura(){

    // Trae el catálogo desde Firestore (solo hace la consulta la primera vez)
    await cargarCatalogoLecturas();
    lecturaActual = obtenerLecturaPorId(idLecturaActual);

    // Si el enlace apunta a un ID que no existe en el catálogo
    if(!lecturaActual){

        document.body.innerHTML =
            "<div style='text-align:center; margin-top:80px; font-family:sans-serif;'>" +
            "<h1>Lectura no encontrada</h1>" +
            "<p>El enlace que abriste no corresponde a ninguna lectura disponible.</p>" +
            "<a href='index.html'>Volver al inicio</a>" +
            "</div>";

        return;

    }

    document.title = lecturaActual.titulo;

    const user = auth.currentUser;

    // El administrador puede entrar a cualquier lectura (incluso las que
    // no ha desbloqueado) las veces que quiera, sin gastar su propia
    // oportunidad — para poder revisar y probar el contenido libremente.
    const accesoAdmin = typeof esAdmin === "function" && esAdmin();

    let datosUsuario = {};

    if(user){
        try{
            const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
            datosUsuario = usuarioDoc.exists ? usuarioDoc.data() : {};
        }catch(error){
            console.error("No se pudo revisar tus lecturas desbloqueadas:", error);
        }
    }

    // El acceso a una lectura ahora depende de haberla desbloqueado antes
    // canjeando su código de 8 caracteres desde "Mis lecturas" (ver
    // desbloqueo.js). Ya no basta con abrir el enlace directamente.
    const desbloqueada = accesoAdmin ||
        (datosUsuario.lecturasDesbloqueadas || []).includes(lecturaActual.id);

    if(!desbloqueada){

        document.body.innerHTML =
            "<div style='text-align:center; margin-top:80px; font-family:sans-serif;'>" +
            "<h1>Lectura bloqueada</h1>" +
            "<p>Todavía no has desbloqueado esta lectura. Ve a \"Mis lecturas\" e ingresa el código de 8 caracteres de tu golosina.</p>" +
            "<a href='index.html'>Volver al inicio</a>" +
            "</div>";

        return;

    }

    if(accesoAdmin){
        arrancarLecturaCronometrada();
        return;
    }

    if(!user) return;

    let yaAprobada = false;

    try{

        const intentosPrevios = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .where("lecturaId", "==", lecturaActual.id)
            .get();

        yaAprobada = intentosPrevios.docs.some(doc => doc.data().puntosGanados > 0);

    }catch(error){
        console.error("No se pudo revisar tu progreso:", error);
    }

    const lecturasIntentadas = datosUsuario.lecturasIntentadas || [];
    const bonoActivo = datosUsuario.bonoActivo || null;

    // Si ya la había aprobado antes, es repaso bloqueado (puede releer,
    // pero no responder el cuestionario de nuevo) — sin importar cómo
    // haya quedado registrado el intento, así una cuenta con progreso de
    // antes de este sistema no se queda viendo la advertencia de "1
    // oportunidad" en una lectura que ya ganó. Pero antes de resignarse
    // a eso, si ya descubrió TODO el catálogo se le da la oportunidad de
    // un bono de completista en alguna lectura que le haya quedado
    // pendiente — si no, reescanear una lectura ya aprobada nunca
    // llevaría a ningún lado nuevo.
    if(yaAprobada){

        if(!bonoActivo){
            const otorgado = await revisarBonoDeCompletista(user, datosUsuario, lecturasIntentadas);
            if(otorgado) return;
        }

        mostrarRepasoBloqueado(bonoActivo);
        return;

    }

    const yaIntentada = lecturasIntentadas.includes(lecturaActual.id);

    // Primera vez que abre esta lectura: su única oportunidad normal.
    if(!yaIntentada){
        mostrarPantallaInicio(false);
        return;
    }

    // Ya la había intentado, pero tiene un bono activo justo en ESTA lectura.
    if(bonoActivo === lecturaActual.id){
        mostrarPantallaInicio(true);
        return;
    }

    // Ya la intentó y no tiene bono aquí. ¿Le toca un bono de completista?
    if(!bonoActivo){
        const otorgado = await revisarBonoDeCompletista(user, datosUsuario, lecturasIntentadas);
        if(otorgado) return;
    }

    mostrarRepasoBloqueado(bonoActivo);

}


// ==========================
// BONO DE COMPLETISTA
// ==========================
// Si ya desbloqueó TODAS las lecturas del catálogo y vuelve a abrir una
// que ya usó, se le regala una oportunidad extra en una lectura al azar
// de las que había fallado (y que todavía no había recibido su bono).
// Cada lectura solo puede recibir este bono una vez.

async function revisarBonoDeCompletista(user, datosUsuario, lecturasIntentadas){

    const desbloqueadas = datosUsuario.lecturasDesbloqueadas || [];

    const todasDesbloqueadas = CATALOGO_LECTURAS.length > 0 &&
        CATALOGO_LECTURAS.every(l => desbloqueadas.includes(l.id));

    if(!todasDesbloqueadas) return false;

    const bonosUsados = datosUsuario.bonosUsados || [];

    let aprobadas = [];

    try{

        const snapshot = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .get();

        aprobadas = snapshot.docs
            .filter(doc => doc.data().puntosGanados > 0)
            .map(doc => doc.data().lecturaId);

    }catch(error){
        console.error("No se pudo revisar tus lecturas aprobadas:", error);
        return false;
    }

    const candidatas = lecturasIntentadas.filter(
        id => !aprobadas.includes(id) && !bonosUsados.includes(id)
    );

    if(candidatas.length === 0) return false;

    const elegidaId = candidatas[Math.floor(Math.random() * candidatas.length)];

    try{
        await db.collection("usuarios").doc(user.uid).update({ bonoActivo: elegidaId });
    }catch(error){
        console.error("No se pudo otorgar el bono:", error);
        return false;
    }

    mostrarPantallaBono(elegidaId);
    return true;

}

function mostrarPantallaBono(elegidaId){

    ocultarElementosLectura();

    const elegida = obtenerLecturaPorId(elegidaId);

    const pantalla = obtenerPantallaIntento();
    pantalla.style.display = "block";
    pantalla.innerHTML = `
        <div style="text-align:center; padding:60px 20px;">
            <h1>${lecturaActual.titulo}</h1>
            <p style="color:var(--texto-suave); margin-top:10px;">
                🎉 Ya descubriste todo el catálogo. Como premio, te devolvemos
                una oportunidad en una lectura que te había fallado:
            </p>
            <a href="lectura.html?id=${encodeURIComponent(elegidaId)}" class="menuLink"
               style="display:inline-block; max-width:300px; margin:20px auto 0;">
                ${elegida ? elegida.titulo : "Ir a la lectura"} →
            </a>
            <a href="index.html" class="menuLink"
               style="display:inline-block; max-width:240px; margin:10px auto 0; background:white; border:1px solid var(--borde); color:var(--texto-suave);">
                ← Volver a mis lecturas
            </a>
        </div>
    `;

}


// ==========================
// PANTALLA PREVIA (1 SOLA OPORTUNIDAD)
// ==========================
// Se muestra antes de empezar a leer. Solo al hacer clic en "Comenzar"
// se registra la oportunidad como usada y arranca el tiempo de lectura.

function mostrarPantallaInicio(esBono){

    ocultarElementosLectura();

    const pantalla = obtenerPantallaIntento();
    pantalla.style.display = "block";
    pantalla.innerHTML = `
        <div style="text-align:center; padding:60px 20px;">
            <h1>${lecturaActual.titulo}</h1>
            <p style="color:var(--texto-suave); margin-top:10px;">
                ⚠️ ${esBono ? "Esta es tu oportunidad extra" : "Solo tienes 1 oportunidad"} para esta lectura.
                Si sales antes de terminar el cuestionario, la pierdes.
            </p>
            <button id="btnComenzarIntento" style="max-width:280px; margin:20px auto 0;">
                Comenzar
            </button>
        </div>
    `;

    document.getElementById("btnComenzarIntento").addEventListener(
        "click", () => registrarIntentoYComenzar(esBono)
    );

}

async function registrarIntentoYComenzar(esBono){

    const pantalla = document.getElementById("pantallaIntento");
    if(pantalla) pantalla.style.display = "none";

    const user = auth.currentUser;

    if(user){

        const cambios = {
            lecturasIntentadas: firebase.firestore.FieldValue.arrayUnion(lecturaActual.id)
        };

        if(esBono){
            cambios.bonoActivo = firebase.firestore.FieldValue.delete();
            cambios.bonosUsados = firebase.firestore.FieldValue.arrayUnion(lecturaActual.id);
        }

        try{
            await db.collection("usuarios").doc(user.uid).update(cambios);
        }catch(error){
            console.error("No se pudo registrar la oportunidad:", error);
        }

    }

    intentoEnProgreso = true;

    mostrarElementosLectura();
    arrancarLecturaCronometrada();

}


// ==========================
// PERDER LA OPORTUNIDAD AL CAMBIAR DE PESTAÑA/VENTANA
// ==========================
// Si el usuario ya empezó a leer (o ya está en el cuestionario) y cambia
// de pestaña o minimiza la ventana, se trata igual que si hubiera salido
// de la página: pierde la oportunidad en ese mismo instante, sin esperar
// a que regrese. La oportunidad ya había quedado marcada como usada en
// Firestore desde que hizo clic en "Comenzar" (ver registrarIntentoYComenzar);
// esto solo se encarga de que la pantalla lo refleje de inmediato.

document.addEventListener("visibilitychange", () => {
    if(document.hidden && intentoEnProgreso){
        abandonarPorCambioDeVisibilidad();
    }
});

function abandonarPorCambioDeVisibilidad(){

    intentoEnProgreso = false;

    clearInterval(reloj);
    clearInterval(relojCuestionario);

    cuestionario.style.display = "none";

    mostrarRepasoBloqueado(null);

}


// ==========================
// REPASO BLOQUEADO (ya se usó la oportunidad de esta lectura)
// ==========================
// Puede releer el texto libremente, pero no hay camino al cuestionario.

function mostrarRepasoBloqueado(bonoPendiente){

    temporizador.style.display = "none";

    tituloLectura.style.display = "";
    tituloLectura.textContent = lecturaActual.titulo;

    lectura.style.display = "";
    lectura.innerHTML = lecturaActual.texto
        .map(parrafo => `<p>${parrafo}</p>`)
        .join("");
    lectura.scrollTop = 0;

    const btnIrCuestionario = document.getElementById("btnIrCuestionario");
    if(btnIrCuestionario) btnIrCuestionario.style.display = "none";

    if (typeof mostrarBotonEditarLectura === "function") {
        mostrarBotonEditarLectura(lecturaActual);
    }

    let notaBono = "";

    if(bonoPendiente){
        const elegida = obtenerLecturaPorId(bonoPendiente);
        notaBono = `
            <p style="margin-top:10px;">
                🎁 Tienes una oportunidad extra pendiente en:
                <a href="lectura.html?id=${encodeURIComponent(bonoPendiente)}">${elegida ? elegida.titulo : "una lectura"}</a>
            </p>
        `;
    }

    const pantalla = obtenerPantallaIntento();
    pantalla.style.display = "block";
    pantalla.innerHTML = `
        <div style="text-align:center; padding-bottom:10px;">
            <p style="color:var(--texto-suave);">
                Para volver a intentar esta lectura ingresa otro código
            </p>
            ${notaBono}
            <a href="index.html" class="menuLink"
               style="display:inline-block; max-width:240px; margin:15px auto 0;">
                ← Volver a mis lecturas
            </a>
        </div>
    `;

}

function obtenerPantallaIntento(){

    let pantalla = document.getElementById("pantallaIntento");

    if(!pantalla){
        pantalla = document.createElement("div");
        pantalla.id = "pantallaIntento";
        document.getElementById("contenedor").prepend(pantalla);
    }

    return pantalla;

}

function ocultarElementosLectura(){
    temporizador.style.display = "none";
    tituloLectura.style.display = "none";
    lectura.style.display = "none";
}

function mostrarElementosLectura(){
    temporizador.style.display = "";
    tituloLectura.style.display = "";
    lectura.style.display = "";
}


// ==========================
// ARRANCAR LA LECTURA CRONOMETRADA
// ==========================

function arrancarLecturaCronometrada(){

    // Por si se llega aquí directo (admin, o bono ya aceptado) sin pasar
    // antes por mostrarPantallaInicio/ocultarElementosLectura.
    mostrarElementosLectura();

    TIEMPO_LECTURA = lecturaActual.tiempoLectura;
    TIEMPO_CUESTIONARIO = lecturaActual.tiempoCuestionario || 30;

    tiempoRestante = TIEMPO_LECTURA;
    tiempoRestanteCuestionario = TIEMPO_CUESTIONARIO;

    tituloLectura.textContent = lecturaActual.titulo;

    if (typeof mostrarBotonEditarLectura === "function") {
        mostrarBotonEditarLectura(lecturaActual);
    }

    // Pintar los párrafos del texto
    lectura.innerHTML = lecturaActual.texto
        .map(parrafo => `<p>${parrafo}</p>`)
        .join("");

    // Elegir al azar las preguntas de esta sesión, del banco de la lectura
    // (así cada usuario ve una combinación distinta y es más difícil copiarse)
    preguntasSeleccionadas = elegirPreguntasAlAzar(
        lecturaActual.bancoPreguntas,
        lecturaActual.preguntasAMostrar
    );

    renderizarPreguntas();

    // Mostrar tiempo inicial
    actualizarTemporizador();

    // Iniciar contador
    reloj = setInterval(actualizarTemporizador, 1000);

    moverTextoLectura();

}

function renderizarPreguntas(){

    listaPreguntas.innerHTML = preguntasSeleccionadas
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
    mostrarCuestionario();

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
    intentoEnProgreso = false;

    let estrellas = 0;
    const totalPreguntas = preguntasSeleccionadas.length;

    preguntasSeleccionadas.forEach((pregunta, indice) => {

        const respuesta = document.querySelector(`input[name="p${indice}"]:checked`);

        if(respuesta && respuesta.value === pregunta.correcta){
            estrellas++;
        }

    });

    // Guardar el progreso, sumar puntos y generar el código de premio en Firestore
    const resultadoGuardado = await guardarProgreso(
        lecturaActual.id,
        lecturaActual.nivel,
        estrellas,
        totalPreguntas
    );

    // Las estrellas y el mensaje final se pintan juntos, en la misma
    // actualización de la pantalla, en vez de que las estrellas aparezcan
    // primero y el mensaje después (guardarProgreso ya terminó para
    // este punto, así que ambos quedan listos al mismo tiempo).
    document.getElementById("resultado").innerHTML =
        generarHTMLEstrellas(estrellas, totalPreguntas);

    // Bloquear respuestas después de calificar
    document.querySelectorAll("input[type='radio']").forEach(opcion => {
        opcion.disabled = true;
    });
    document.getElementById("btnTerminarCuestionario").style.display = "none";

    if(resultadoGuardado && resultadoGuardado.aprobo){

        document.getElementById("mensajeFinal").innerHTML =
            `¡Bien hecho! Ganaste: ${resultadoGuardado.premio} 🎉 ` +
            `(+${resultadoGuardado.puntosGanados} puntos). Ve a "Mis premios" para canjearlo.`;

    }else if(resultadoGuardado && resultadoGuardado.yaCompletada){

        document.getElementById("mensajeFinal").innerHTML =
            "Ya habías completado esta lectura antes, recuerda que no se suman puntos dos veces por la misma lectura.";

    }else{

        document.getElementById("mensajeFinal").innerHTML =
            "Para volver a intentar esta lectura ingresa otro código";

    }

    mostrarBotonVolver();

}


// ==========================
// BOTÓN "VOLVER A MIS LECTURAS"
// ==========================

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
