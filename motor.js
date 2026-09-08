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


// Tiempo de espera antes de comenzar a mover el texto — valor por
// defecto mientras se carga la configuración real desde Firestore (ver
// cargarConfigLecturaPremios en lecturas.js); editable desde el panel
// de administrador (⚙️ Configuración, en "Lecturas").
let ESPERA_INICIAL = 3;

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

// Marca de tiempo (Date.now()) de cuando arrancó el intento actual — se
// usa para calcular cuánto tardó en total (ver calificar), dato que
// necesita "El premio gordo" para su ranking por tiempo.
let inicioIntentoTimestamp = null;


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

    // Trae el catálogo, la lista de administradores y la configuración
    // del avance automático desde Firestore (los tres cacheados, solo
    // hacen la consulta la primera vez) — la segunda es la que necesita
    // accesoAdmin más abajo, la tercera fija ESPERA_INICIAL.
    await Promise.all([cargarCatalogoLecturas(), cargarAdministradores(), cargarConfigLecturaPremios()]);
    ESPERA_INICIAL = CONFIG_LECTURA_PREMIOS.esperaInicialSegundos;
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

    // El administrador puede entrar a cualquier lectura sin necesitar un
    // código (incluso las que no ha desbloqueado), para poder revisar el
    // contenido libremente. Pero a partir de ahí queda sujeto a las
    // MISMAS reglas que cualquier usuario (1 sola oportunidad, repaso
    // bloqueado, bono de completista, etc.) — así la cuenta admin
    // experimenta la app igual que todos los demás, errores incluidos.
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
            "<p>Todavía no has desbloqueado esta lectura. Ve a \"Lecturas\" e ingresa el código de 8 caracteres de tu golosina.</p>" +
            "<a href='index.html'>Volver al inicio</a>" +
            "</div>";

        return;

    }

    if(!user) return;

    // Cuenta cuántas veces se ha abierto esta lectura (ver "Mis
    // publicaciones" en perfil.js, para lecturas propuestas por
    // usuarios vía "Ser el protagonista de la historia"). No bloquea el
    // render ni afecta puntos/racha/ranking — es solo un contador.
    db.collection("lecturas").doc(lecturaActual.id)
        .update({ vistas: firebase.firestore.FieldValue.increment(1) })
        .catch(error => console.error("No se pudo registrar la vista de esta lectura:", error));

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

    // "El premio gordo": mientras el usuario no haya completado su meta
    // de lecturas difíciles seguidas, cualquier difícil que TODAVÍA no
    // tenga en 3/3 se puede reintentar sin límite — se salta por
    // completo la regla normal de "1 sola oportunidad" (lecturasIntentadas)
    // para esta lectura puntual. Si ya está aprobada o ya completó la
    // meta, sigue el camino normal de abajo sin cambios.
    if (lecturaActual.nivel === "dificil" && !yaAprobada
        && typeof obtenerProgresoPremioGordo === "function") {

        try {
            const progresoGordo = await obtenerProgresoPremioGordo(user.uid);
            if (!progresoGordo.completo) {
                mostrarPantallaInicio(false);
                return;
            }
        } catch (error) {
            console.error("No se pudo revisar tu progreso de El premio gordo:", error);
        }

    }

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

        mostrarRepasoBloqueado(bonoActivo, true);
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

    mostrarRepasoBloqueado(bonoActivo, false);

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
            <a href="lecturas-premiadas.html" class="menuLink"
               style="display:inline-block; max-width:240px; margin:10px auto 0; background:white; border:1px solid var(--borde); color:var(--texto-suave);">
                ← Volver a Lecturas
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
    inicioIntentoTimestamp = Date.now();

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

    mostrarRepasoBloqueado(null, false);

}


// ==========================
// REPASO BLOQUEADO (ya se usó la oportunidad de esta lectura)
// ==========================
// Puede releer el texto libremente, pero no hay camino al cuestionario.
// El mensaje cambia según si la razón es que ya la aprobó (no tiene
// sentido hablar de "reintentar") o si la falló/abandonó (ahí sí puede
// tocarle otra oportunidad en el futuro, vía código o bono de completista).

function mostrarRepasoBloqueado(bonoPendiente, aprobada){

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
                ${aprobada
                    ? "🎉 ¡Ya completaste esta lectura! Te invitamos a seguir participando."
                    : "Para volver a intentar esta lectura ingresa otro código"}
            </p>
            ${notaBono}
            <a href="lecturas-premiadas.html" class="menuLink"
               style="display:inline-block; max-width:240px; margin:15px auto 0;">
                ← Volver a Lecturas
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

    // Pintar los párrafos del texto
    lectura.innerHTML = lecturaActual.texto
        .map(parrafo => `<p>${parrafo}</p>`)
        .join("");

    // Controles de brillo / tamaño / tipografía encima del recuadro
    // (ver lector-ajustes.js). Se activan ANTES de calcular el
    // movimiento automático, porque cambiar el tamaño de letra cambia
    // la altura del texto y con ella la distancia a recorrer.
    if (typeof activarAjustesLector === "function") activarAjustesLector("lectura");

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

// ==========================================================
// TIPOS DE PREGUNTA (Etapa 34)
// ==========================================================
// Una pregunta sin "tipo" (todas las de antes de esta etapa) se trata
// como "opcionMultiple" — ver mismo criterio en editor-preguntas.js y
// esquemaPreguntas.js (Cloud Functions).

function tipoDePregunta(pregunta) {
    return pregunta.tipo || "opcionMultiple";
}

function barajarArray(arreglo) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// Sin mayúsculas/tildes/espacios extra — usada para comparar respuestas
// de texto libre ("completar" y "textoLibre") contra lo que cargó el
// admin, sin exigir una coincidencia carácter por carácter exacta.
function normalizarTextoRespuesta(s) {
    return String(s == null ? "" : s)
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ");
}

// Texto legible de la respuesta correcta de una pregunta, según su
// tipo — usado al calificar para mostrarla junto a cada pregunta (ver
// mostrarRespuestaCorrecta).
function textoRespuestaCorrecta(pregunta, tipo) {

    if (tipo === "vf") return pregunta.correcta ? "Verdadero" : "Falso";

    if (tipo === "completar" || tipo === "textoLibre") {
        return (pregunta.respuestasValidas || []).join(" / ");
    }

    if (tipo === "ordenar") {
        return (pregunta.partes || []).join(" → ");
    }

    // Opción múltiple: el formato nuevo guarda el texto correcto tal
    // cual; el viejo, el "valor" de una de sus opciones fijas.
    if (pregunta.respuestaCorrecta) return pregunta.respuestaCorrecta;

    const opciones = pregunta._opcionesMostradas || pregunta.opciones || [];
    const opcion = opciones.find(o => o.valor === (pregunta._correctaMostrada || pregunta.correcta));
    return opcion ? opcion.texto : "";

}

// Le agrega a la tarjeta de esa pregunta (ya dibujada en #listaPreguntas,
// en el mismo orden que preguntasSeleccionadas) la respuesta correcta,
// con ✅/❌ según si el usuario acertó — se llama una vez por pregunta
// al calificar.
function mostrarRespuestaCorrecta(indice, pregunta, tipo, acerto) {

    const contPregunta = listaPreguntas.children[indice];
    if (!contPregunta) return;

    contPregunta.insertAdjacentHTML("beforeend", `
        <p style="margin-top:8px; font-size:13px; ${acerto ? "color:#2e9e5b;" : "color:#c0392b;"}">
            ${acerto ? "✅" : "❌"} Respuesta correcta: <strong>${textoRespuestaCorrecta(pregunta, tipo)}</strong>
        </p>
    `);

}

function renderizarPreguntaOrdenar(pregunta, indice) {

    // El orden que ve y reacomoda el usuario vive en _ordenActual (se
    // baraja una sola vez, la primera vez que se dibuja esta pregunta).
    if (!pregunta._ordenActual) {
        pregunta._ordenActual = barajarArray(pregunta.partes);
    }

    return pregunta._ordenActual.map((parte, oi) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="flex:1; padding:8px; border:1px solid var(--borde); border-radius:8px; background:white;">${parte}</span>
            <button type="button" data-accion="mover-parte-arriba" data-indice="${indice}" data-oi="${oi}"
                    ${oi === 0 ? "disabled" : ""} style="width:auto; padding:6px 10px;">▲</button>
            <button type="button" data-accion="mover-parte-abajo" data-indice="${indice}" data-oi="${oi}"
                    ${oi === pregunta._ordenActual.length - 1 ? "disabled" : ""} style="width:auto; padding:6px 10px;">▼</button>
        </div>
    `).join("");

}

function renderizarPreguntas(){

    listaPreguntas.innerHTML = preguntasSeleccionadas
        .map((pregunta, indice) => {

            const tipo = tipoDePregunta(pregunta);

            let cuerpo = "";

            if (tipo === "vf") {
                cuerpo = `
                    <label><input type="radio" name="p${indice}" value="true"> Verdadero</label><br>
                    <label><input type="radio" name="p${indice}" value="false"> Falso</label><br>
                `;
            } else if (tipo === "completar" || tipo === "textoLibre") {
                cuerpo = `
                    <input type="text" id="respuestaTexto-${indice}" autocomplete="off"
                           placeholder="Escribe tu respuesta"
                           style="width:100%; max-width:320px; padding:10px; border-radius:8px; border:1px solid var(--borde); box-sizing:border-box;">
                `;
            } else if (tipo === "ordenar") {
                cuerpo = `<div id="ordenarPregunta-${indice}">${renderizarPreguntaOrdenar(pregunta, indice)}</div>`;
            } else {

                // opcionMultiple (por defecto): las opciones se arman al
                // vuelo desde el banco de distractores (ver
                // armarOpcionesOpcionMultiple en admin-comun.js) y se
                // guardan en la pregunta para calificar contra LAS MISMAS
                // que se mostraron.
                if (!pregunta._opcionesMostradas) {
                    const armadas = armarOpcionesOpcionMultiple(pregunta);
                    pregunta._opcionesMostradas = armadas.opciones;
                    pregunta._correctaMostrada = armadas.correcta;
                }

                cuerpo = pregunta._opcionesMostradas.map(opcion => `
                    <label>
                        <input type="radio" name="p${indice}" value="${opcion.valor}">
                        ${opcion.texto}
                    </label>
                    <br>
                `).join("");

            }

            return `
                <div class="pregunta">
                    <p>${indice + 1}. ${pregunta.pregunta}</p>
                    ${cuerpo}
                </div>
            `;

        }).join("");

}

// Botones ▲▼ de las preguntas "ordenar": un solo listener DELEGADO sobre
// todo #listaPreguntas (se registra una sola vez, fuera de
// renderizarPreguntas) — así sigue funcionando sin importar cuántas
// veces se vuelva a dibujar esa lista, y solo redibuja la propia
// pregunta "ordenar" (no todo el cuestionario, para no perder lo ya
// respondido en las demás preguntas).
listaPreguntas.addEventListener("click", (e) => {

    const btn = e.target.closest("[data-accion='mover-parte-arriba'], [data-accion='mover-parte-abajo']");
    if (!btn) return;

    const indice = Number(btn.dataset.indice);
    const oi = Number(btn.dataset.oi);
    const pregunta = preguntasSeleccionadas[indice];
    const destino = btn.dataset.accion === "mover-parte-arriba" ? oi - 1 : oi + 1;

    if (destino < 0 || destino >= pregunta._ordenActual.length) return;

    [pregunta._ordenActual[oi], pregunta._ordenActual[destino]] =
        [pregunta._ordenActual[destino], pregunta._ordenActual[oi]];

    document.getElementById(`ordenarPregunta-${indice}`).innerHTML = renderizarPreguntaOrdenar(pregunta, indice);

});


// ==========================
// MOVIMIENTO DE LA LECTURA
// (avanza sola, sincronizada al tiempo; el usuario puede adelantarse
// deslizando hacia abajo —por si lee más rápido que el avance automático—
// pero no puede regresar hacia atrás una vez que avanzó)
// ==========================
// La velocidad se calcula para que, avanzando SOLO al ritmo automático
// (sin que el usuario deslice nada), el texto complete su recorrido
// completo antes de que se acabe TIEMPO_LECTURA — así nadie se queda a
// medias si no se adelanta manualmente (ver segundosMovimiento abajo,
// y MARGEN_SEGURIDAD como colchón extra).

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

        const actual = lectura.scrollTop;

        // Menos de 1px de diferencia = es el REDONDEO de nuestro propio
        // scroll automático, no un gesto del usuario. Antes se escribía
        // ese valor redondeado de vuelta en los acumuladores, y como el
        // avance por cuadro suele ser una fracción de píxel, el
        // movimiento quedaba cuantizado: se veía a saltitos en vez de
        // fluido. Ignorarlo deja que el acumulador siga en decimales.
        if(Math.abs(actual - posicionMinima) < 1) return;

        if(actual < posicionMinima){

            lectura.scrollTop = posicionMinima;

        }else{

            posicionMinima = actual;
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

        const tipo = tipoDePregunta(pregunta);
        let acerto = false;

        if (tipo === "vf") {

            const respuesta = document.querySelector(`input[name="p${indice}"]:checked`);
            acerto = !!respuesta && (respuesta.value === "true") === pregunta.correcta;

        } else if (tipo === "completar" || tipo === "textoLibre") {

            const campo = document.getElementById(`respuestaTexto-${indice}`);
            const dada = normalizarTextoRespuesta(campo ? campo.value : "");
            acerto = dada.length > 0 && pregunta.respuestasValidas.some(
                valida => normalizarTextoRespuesta(valida) === dada
            );

        } else if (tipo === "ordenar") {

            const actual = pregunta._ordenActual || pregunta.partes;
            acerto = actual.length === pregunta.partes.length
                && actual.every((parte, i) => parte === pregunta.partes[i]);

        } else {

            // opcionMultiple (por defecto): se compara contra la correcta
            // DE LAS OPCIONES QUE SE MOSTRARON (ver renderizarPreguntas).
            const respuesta = document.querySelector(`input[name="p${indice}"]:checked`);
            const correcta = pregunta._correctaMostrada || pregunta.correcta;
            acerto = !!respuesta && respuesta.value === correcta;

        }

        if (acerto) estrellas++;

        mostrarRespuestaCorrecta(indice, pregunta, tipo, acerto);

    });

    // Cuánto tardó en total este intento (lectura + cuestionario) — lo usa
    // "El premio gordo" para su ranking por tiempo (ver guardarProgreso).
    const duracionSegundos = inicioIntentoTimestamp
        ? Math.round((Date.now() - inicioIntentoTimestamp) / 1000)
        : null;

    // Guardar el progreso, sumar puntos y generar el código de premio en Firestore
    const resultadoGuardado = await guardarProgreso(
        lecturaActual.id,
        lecturaActual.nivel,
        estrellas,
        totalPreguntas,
        duracionSegundos
    );

    // Las estrellas y el mensaje final se pintan juntos, en la misma
    // actualización de la pantalla, en vez de que las estrellas aparezcan
    // primero y el mensaje después (guardarProgreso ya terminó para
    // este punto, así que ambos quedan listos al mismo tiempo).
    document.getElementById("resultado").innerHTML =
        generarHTMLEstrellas(estrellas, totalPreguntas);

    // Palabras del texto + cuánto tardó ESTE usuario en esta lectura
    // (lectura + cuestionario). El mismo dato queda en "progreso" y
    // alimenta el reporte de tiempos del admin (ver admin-tiempos.js).
    const anteriorDatos = document.getElementById("datosFinalLectura");
    if (anteriorDatos) anteriorDatos.remove();
    const palabrasTexto = (typeof contarPalabrasLectura === "function")
        ? contarPalabrasLectura(lecturaActual) : 0;
    const tiempoTexto = (typeof formatearDuracionLectura === "function")
        ? formatearDuracionLectura(duracionSegundos) : `${duracionSegundos || "—"}s`;
    document.getElementById("resultado").insertAdjacentHTML("afterend", `
        <p id="datosFinalLectura" style="font-size:14px; color:var(--texto-suave); margin:6px 0;">
            📖 ${palabrasTexto} palabras · ⏱️ Tu tiempo: ${tiempoTexto}
        </p>
    `);

    // Bloquear respuestas después de calificar (todos los tipos de
    // pregunta: opción múltiple/vf son radios, completar/textoLibre son
    // texto, y ordenar son los botones ▲▼ de reacomodar).
    document.querySelectorAll("#listaPreguntas input, #listaPreguntas button").forEach(campo => {
        campo.disabled = true;
    });
    document.getElementById("btnTerminarCuestionario").style.display = "none";

    if(resultadoGuardado && resultadoGuardado.aprobo){

        document.getElementById("mensajeFinal").innerHTML = `
            <p>¡Bien hecho! Ganaste: ${resultadoGuardado.premio} 🎉 (+${resultadoGuardado.puntosGanados} puntos).</p>
            <a href="premios.html" class="menuLink" style="display:inline-block; max-width:220px; margin:10px auto 0;">🎁 Ir a Mis premios</a>
        `;

    }else if(resultadoGuardado && resultadoGuardado.yaCompletada){

        document.getElementById("mensajeFinal").innerHTML =
            "Ya habías completado esta lectura antes, recuerda que no se suman puntos dos veces por la misma lectura.";

    }else{

        document.getElementById("mensajeFinal").innerHTML =
            "Para volver a intentar esta lectura ingresa otro código";

    }

    // Bloques después del mensaje final, en un solo insertAdjacentHTML
    // (así el orden en pantalla queda fijo sin importar el orden del
    // código): el enlace a libro recomendado (opcional, por lectura) y
    // la invitación a "Ser el protagonista" — esta última SIEMPRE
    // aparece, sin importar el resultado, para dar a conocer esa función.
    const anteriorExtras = document.getElementById("extrasFinalLectura");
    if (anteriorExtras) anteriorExtras.remove();

    const escLibro = (s) => String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const libroHtml = (lecturaActual && lecturaActual.libroRecomendadoUrl) ? `
        <p style="text-align:center; margin:12px 0;">
            📚 <a href="${escLibro(lecturaActual.libroRecomendadoUrl)}" target="_blank" rel="noopener noreferrer">
                ${escLibro(lecturaActual.libroRecomendadoTexto || "¿Te gustó esta lectura? Conoce este libro")}
            </a>
        </p>
    ` : "";

    document.getElementById("mensajeFinal").insertAdjacentHTML("afterend", `
        <div id="extrasFinalLectura">
            ${libroHtml}
            <div style="text-align:center; margin:16px 0; padding:14px; border:1px dashed var(--azul); border-radius:12px;">
                <p style="margin:0 0 8px; font-weight:600;">✍️ Haznos saber qué te gustaría leer y gana increíbles premios</p>
                <a href="perfil-protagonista.html" class="menuLink" style="display:inline-block; max-width:220px; margin:0 auto;">Ser el protagonista</a>
            </div>
        </div>
    `);

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
        <a id="btnVolverInicio" href="lecturas-premiadas.html" class="menuLink"
           style="display:inline-block; max-width:240px; margin:0 auto;">
            ← Volver a Lecturas
        </a>
    `;

    cuestionario.appendChild(contenedorBoton);

}
