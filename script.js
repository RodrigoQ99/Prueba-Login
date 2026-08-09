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
const ESPERA_INICIAL = 2;


// Control de velocidad de lectura
// 1 = velocidad normal
// 0.5 = más lento
// 2 = más rápido
const VELOCIDAD_LECTURA = 0.9;


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
// ==========================


function moverTextoLectura(){


    const alturaTexto =
    lectura.scrollHeight;


    const alturaCaja =
    lectura.clientHeight;



    const distancia =
    alturaTexto - alturaCaja;



    const tiempoMovimiento =
    (TIEMPO_LECTURA - ESPERA_INICIAL) * 1000;



    let inicioMovimiento = false;



    setTimeout(()=>{


        inicioMovimiento = true;


    }, ESPERA_INICIAL * 1000);



    let posicion = 0;



    function moverLectura(){



        if(inicioMovimiento){



            let velocidad =

            (distancia / tiempoMovimiento)

            * VELOCIDAD_LECTURA;



            posicion += velocidad * 20;



            lectura.scrollTop = posicion;



        }



        requestAnimationFrame(moverLectura);


    }



    moverLectura();

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