// ==========================================================
// CUÁNTAS PREGUNTAS PEDIRLE A LA IA (Etapa 36)
// ==========================================================
// Antes: un solo número de preguntas por lectura, calculado por la
// cantidad de palabras del texto. AHORA el banco es MULTITIPO — se
// generan N preguntas de CADA UNO de los cinco tipos, y N depende del
// NIVEL de la lectura (no del tamaño del texto):
//
//   Fácil      -> 3 por tipo  = 15 preguntas en el banco
//   Intermedio -> 5 por tipo  = 25 preguntas en el banco
//   Difícil    -> 7 por tipo  = 35 preguntas en el banco
//
// Del banco, al usuario se le muestran solo unas cuantas al azar,
// mezclando tipos distintos (ver elegirPreguntasAlAzar en
// admin-comun.js): 4 / 6 / 8 según el nivel. Esa cantidad se
// pre-llena sola en el formulario, pero el admin puede cambiarla.
//
// "Mejorar la lectura" no tiene nivel (se organiza por edad) y sus
// textos son mucho más cortos, así que usa su propio par de números:
// un banco chico de 2 por tipo (10 en total) y 3 preguntas mostradas,
// que es el patrón que ese catálogo ya usaba.
// ==========================================================

const TIPOS_PREGUNTA = ["opcionMultiple", "vf", "completar", "ordenar", "textoLibre"];

const PREGUNTAS_POR_TIPO_SEGUN_NIVEL = {
    facil: 3,
    intermedio: 5,
    dificil: 7
};

const PREGUNTAS_A_MOSTRAR_SEGUN_NIVEL = {
    facil: 4,
    intermedio: 6,
    dificil: 8
};

const PREGUNTAS_POR_TIPO_MEJORA = 2;
const PREGUNTAS_MEJORA_POR_DEFECTO = 3;

// Cuántos distractores (opciones incorrectas) guarda CADA pregunta de
// opción múltiple, y cuántas opciones se arman al mostrarla: la
// correcta + (OPCIONES_A_MOSTRAR - 1) distractores elegidos al azar de
// ese banco, para que dos usuarios con la misma pregunta no vean
// necesariamente las mismas opciones.
const DISTRACTORES_POR_PREGUNTA = 6;
const OPCIONES_A_MOSTRAR = 4;

// Rango aproximado de palabras para "Mejorar la lectura" — lo usa
// generarLecturaOriginalIA.js para pedirle a Claude un texto del tamaño
// correcto al INVENTAR una historia nueva.
const RANGO_PALABRAS_MEJORA = { min: 100, max: 225 };

function contarPalabras(texto) {
    return (texto || "").trim().split(/\s+/).filter(p => p.length > 0).length;
}

/**
 * Cuántas preguntas de CADA TIPO pedirle a Claude.
 * - "premio": según el nivel de la lectura (3 / 5 / 7).
 * - "mejora": siempre PREGUNTAS_POR_TIPO_MEJORA.
 */
function determinarPreguntasPorTipo(tipo, nivel) {

    if (tipo === "mejora") return PREGUNTAS_POR_TIPO_MEJORA;

    return PREGUNTAS_POR_TIPO_SEGUN_NIVEL[nivel] || PREGUNTAS_POR_TIPO_SEGUN_NIVEL.facil;

}

/**
 * Cuántas preguntas se le muestran al usuario en el cuestionario (el
 * valor con el que se pre-llena "preguntasAMostrar" en el formulario).
 */
function determinarPreguntasAMostrar(tipo, nivel) {

    if (tipo === "mejora") return PREGUNTAS_MEJORA_POR_DEFECTO;

    return PREGUNTAS_A_MOSTRAR_SEGUN_NIVEL[nivel] || PREGUNTAS_A_MOSTRAR_SEGUN_NIVEL.facil;

}

module.exports = {
    contarPalabras,
    determinarPreguntasPorTipo,
    determinarPreguntasAMostrar,
    TIPOS_PREGUNTA,
    PREGUNTAS_POR_TIPO_SEGUN_NIVEL,
    PREGUNTAS_A_MOSTRAR_SEGUN_NIVEL,
    PREGUNTAS_POR_TIPO_MEJORA,
    PREGUNTAS_MEJORA_POR_DEFECTO,
    DISTRACTORES_POR_PREGUNTA,
    OPCIONES_A_MOSTRAR,
    RANGO_PALABRAS_MEJORA
};
