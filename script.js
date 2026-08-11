// ==========================
// CONFIGURACIÓN DEL SISTEMA
// ==========================

// Identificador único de ESTA lectura y su nivel de dificultad.
// Cuando agregues más lecturas, cada una debe tener su propio ID.
const LECTURA_ID = "importancia-de-la-lectura";
const NIVEL_LECTURA = "facil"; // "facil" | "intermedio" | "dificil"

// Tiempo total de lectura en segundos
const TIEMPO_LECTURA = 60;


// Tiempo de espera antes de comenzar a mover el texto
// (los "3 segundos de retraso" que mencionaste antes de que arranque)
const ESPERA_INICIAL = 3;


// Margen de seguridad: el texto termina de moverse un poco antes de que
// se acabe el tiempo total, para asegurar que SIEMPRE se alcance a leer
// completo antes de que aparezca el cuestionario.
const MARGEN_SEGURIDAD = 2;


// Tiempo del cuestionario en segundos
const TIEMPO_CUESTIONARIO = 30;



// ==========================
// ELEMENTOS HTML
// ==========================

const temporizador = document.getElementById("temporizador");

const lectura = document.getElementById("lectura");

const cuestionario = document.getElementById("cuestionario");

const temporizadorCuestionario =
document.getElementById("temporizadorCuestionario");



// ==========================
// VARIABLES
// ==========================

let tiempoRestante = TIEMPO_LECTURA;

let tiempoRestanteCuestionario =
TIEMPO_CUESTIONARIO;


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



    temporizador.textContent =
    `${minutos}:${segundos}`;



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
// Ya NO arranca solo al cargar el script: ahora auth.js llama a
// iniciarLectura() recién cuando el usuario inició sesión (y, si es
// la primera vez, cuando terminó de registrarse).

function iniciarLectura(){

    // Mostrar tiempo inicial
    actualizarTemporizador();

    // Iniciar contador
    reloj = setInterval(
        actualizarTemporizador,
        1000
    );

    moverTextoLectura();
}


// ==========================
// MOVIMIENTO DE LA LECTURA
// (avanza sola, sincronizada al tiempo; el usuario puede
//  adelantarse deslizando hacia abajo, pero no puede regresar)
// ==========================


function moverTextoLectura(){


    const alturaTexto =
    lectura.scrollHeight;


    const alturaCaja =
    lectura.clientHeight;



    const distancia =
    alturaTexto - alturaCaja;



    // Segundos reales disponibles para que el texto termine de moverse,
    // ya descontando la espera inicial y el margen de seguridad.
    const segundosMovimiento = Math.max(
        TIEMPO_LECTURA - ESPERA_INICIAL - MARGEN_SEGURIDAD,
        1
    );



    // posicionMinima = el punto más lejano al que se ha llegado,
    // ya sea por el movimiento automático o porque el usuario deslizó
    // hacia abajo. Nunca puede bajar de valor: así se bloquea el regreso.
    let posicionMinima = 0;



    let inicioMovimiento = null; // marca de tiempo (ms) en que arranca el auto-scroll



    setTimeout(()=>{

        inicioMovimiento = performance.now();

    }, ESPERA_INICIAL * 1000);



    function aplicarPosicion(nuevaPosicion){

        // nunca deja que la posición baje de lo ya alcanzado
        if(nuevaPosicion > posicionMinima){

            posicionMinima = Math.min(nuevaPosicion, distancia);

        }

        lectura.scrollTop = posicionMinima;

    }



    function moverLectura(ahora){


        if(inicioMovimiento !== null){


            const segundosTranscurridos =
            (ahora - inicioMovimiento) / 1000;


            const proporcion =
            Math.min(segundosTranscurridos / segundosMovimiento, 1);


            const posicionAutomatica =
            proporcion * distancia;


            aplicarPosicion(posicionAutomatica);


        }


        requestAnimationFrame(moverLectura);

    }


    requestAnimationFrame(moverLectura);



    // Permite deslizar hacia ABAJO para leer más rápido,
    // pero bloquea cualquier intento de regresar hacia arriba.
    lectura.addEventListener("scroll", ()=>{

        if(lectura.scrollTop < posicionMinima){

            // Intentó subir: lo regresamos al punto más lejano alcanzado
            lectura.scrollTop = posicionMinima;

        }else{

            // Deslizó hacia adelante: ese es el nuevo punto mínimo
            posicionMinima = lectura.scrollTop;

        }

    });

}




// ==========================
// MOSTRAR CUESTIONARIO
// ==========================


function mostrarCuestionario(){



    lectura.style.display = "none";


    cuestionario.style.display = "block";


    temporizador.textContent = "00:00";



    iniciarTemporizadorCuestionario();


}




// ==========================
// TEMPORIZADOR CUESTIONARIO
// ==========================


function iniciarTemporizadorCuestionario(){



    relojCuestionario = setInterval(()=>{


        let minutos =
        Math.floor(tiempoRestanteCuestionario / 60);



        let segundos =
        tiempoRestanteCuestionario % 60;



        minutos =
        String(minutos).padStart(2,"0");



        segundos =
        String(segundos).padStart(2,"0");



        temporizadorCuestionario.textContent =

        `Tiempo: ${minutos}:${segundos}`;




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



    let estrellas = 0;



    const respuesta1 =
    document.querySelector('input[name="p1"]:checked');



    const respuesta2 =
    document.querySelector('input[name="p2"]:checked');



    const respuesta3 =
    document.querySelector('input[name="p3"]:checked');




    // Respuestas correctas


    if(respuesta1 && respuesta1.value === "b"){

        estrellas++;

    }



    if(respuesta2 && respuesta2.value === "b"){

        estrellas++;

    }



    if(respuesta3 && respuesta3.value === "c"){

        estrellas++;

    }




    document.getElementById("resultado").innerHTML =

    `Resultado: ${estrellas}/3 ⭐`;


    // Guardar el progreso y sumar puntos en Firestore
    const resultadoGuardado =
    await guardarProgreso(LECTURA_ID, NIVEL_LECTURA, estrellas);


    if(resultadoGuardado && resultadoGuardado.aprobo){



        document.getElementById("mensajeFinal").innerHTML =

        `¡Bien hecho! Ganaste: ${resultadoGuardado.premio} 🎉 ` +
        `(+${resultadoGuardado.puntosGanados} puntos)`;



    }else{



        document.getElementById("mensajeFinal").innerHTML =

        "Gracias por participar, te invitamos a continuar leyendo e intentando.";



    }



    // Bloquear respuestas después de calificar

    let opciones =
    document.querySelectorAll("input[type='radio']");



    opciones.forEach(opcion=>{

        opcion.disabled = true;

    });



}