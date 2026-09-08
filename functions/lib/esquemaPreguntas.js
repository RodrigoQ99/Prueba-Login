// ==========================================================
// ESQUEMA (Zod) DEL BANCO DE PREGUNTAS
// ==========================================================
// Mismo "tipo" de discriminador que usa el frontend (ver
// editor-preguntas.js / motor.js). Una pregunta sin "tipo" se trata
// como "opcionMultiple" en el resto del proyecto (retrocompatibilidad
// con lecturas ya existentes), pero la IA SIEMPRE debe declararlo
// explícito, así que aquí es obligatorio.
//
// BANCO DE RESPUESTAS (Etapa 36) — la opción múltiple ya no trae una
// lista fija de opciones: trae la respuesta correcta y un BANCO de
// distractores, y el frontend arma las opciones al azar al mostrar la
// pregunta (ver armarOpcionesOpcionMultiple en admin-comun.js), para
// que dos usuarios con la misma pregunta no vean siempre lo mismo.
// "completar" y "textoLibre" traen varias respuestas válidas por la
// misma razón (se acepta más de una forma de escribirla). "vf" y
// "ordenar" no necesitan banco: su respuesta es una sola.
//
// Se le pasa a client.messages.parse() como output_config.format, así
// Claude queda OBLIGADO a responder con alguna de estas formas exactas
// — no hace falta (ni conviene) confiar solo en la instrucción de
// texto "responde en JSON".
//
// Los "refine" van DESPUÉS de armar el discriminatedUnion, no antes:
// Zod exige que cada rama de un discriminatedUnion sea un ZodObject
// puro — un .refine() ANTES lo envuelve en ZodEffects y deja de
// calificar.
// ==========================================================

const { z } = require("zod");

// Opción múltiple: 1 respuesta correcta + un banco de distractores
// (opciones incorrectas plausibles) del que se eligen unas cuantas al
// mostrar la pregunta.
const PreguntaOpcionMultipleSchema = z.object({
    tipo: z.literal("opcionMultiple"),
    pregunta: z.string().min(1),
    respuestaCorrecta: z.string().min(1),
    distractores: z.array(z.string().min(1)).min(4).max(8)
});

const PreguntaVfSchema = z.object({
    tipo: z.literal("vf"),
    pregunta: z.string().min(1),
    correcta: z.boolean()
});

// "completar": la pregunta debe traer el espacio en blanco escrito como
// "___" dentro del propio texto (ej. "El río ___ es el más largo.").
const PreguntaCompletarSchema = z.object({
    tipo: z.literal("completar"),
    pregunta: z.string().min(1),
    respuestasValidas: z.array(z.string().min(1)).min(1).max(6)
});

// "ordenar": "partes" ya viene en el ORDEN CORRECTO — el frontend la
// revuelve para mostrarla (ver motor.js).
const PreguntaOrdenarSchema = z.object({
    tipo: z.literal("ordenar"),
    pregunta: z.string().min(1),
    partes: z.array(z.string().min(1)).min(3).max(6)
});

const PreguntaTextoLibreSchema = z.object({
    tipo: z.literal("textoLibre"),
    pregunta: z.string().min(1),
    respuestasValidas: z.array(z.string().min(1)).min(1).max(6)
});

const PreguntaSchema = z.discriminatedUnion("tipo", [
    PreguntaOpcionMultipleSchema,
    PreguntaVfSchema,
    PreguntaCompletarSchema,
    PreguntaOrdenarSchema,
    PreguntaTextoLibreSchema
]).refine(
    // El bug real que motivó esto: Claude a veces mete el "___" de
    // "completar" en una pregunta de OTRO tipo (o al revés, arma una
    // "completar" sin ningún "___" que llenar) — el resultado no tiene
    // sentido para quien juega. Como esto no se puede expresar en el
    // JSON Schema que restringe la generación (min/max/enum sí, un
    // patrón de texto condicional no), se rechaza aquí: mejor que
    // generarPreguntasIA.js falle con "intenta de nuevo" a que entregue
    // una pregunta rota.
    (p) => p.tipo === "completar" ? p.pregunta.includes("___") : !p.pregunta.includes("___"),
    { message: "El \"___\" del espacio en blanco solo puede aparecer en preguntas de tipo \"completar\", y esas SIEMPRE deben traer uno." }
).refine(
    // Un distractor idéntico a la respuesta correcta haría la pregunta
    // imposible de calificar (dos opciones correctas en pantalla).
    (p) => p.tipo !== "opcionMultiple"
        || !p.distractores.some(d => d.trim().toLowerCase() === p.respuestaCorrecta.trim().toLowerCase()),
    { message: "Ningún distractor puede ser igual a la respuesta correcta." }
);

// Zod SDK helper (zodOutputFormat) espera un objeto raíz, no un arreglo
// suelto — se envuelve en { genero, preguntas: [...] } y se desenvuelve
// otra vez del lado de generarPreguntasIA.js antes de devolverlo al
// cliente. "genero" es la clasificación automática del texto (Etapa 36,
// reemplaza el campo manual que antes llenaba el admin).
const BancoPreguntasSchema = z.object({
    genero: z.string().min(1),
    preguntas: z.array(PreguntaSchema)
});

module.exports = { PreguntaSchema, BancoPreguntasSchema };
