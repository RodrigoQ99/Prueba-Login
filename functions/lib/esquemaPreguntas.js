// ==========================================================
// ESQUEMA (Zod) DEL BANCO DE PREGUNTAS
// ==========================================================
// Mismo "tipo" de discriminador que usa el frontend (ver
// editor-preguntas.js / motor.js): una pregunta sin "tipo" se trata
// como "opcionMultiple" en el resto del proyecto (retrocompatibilidad
// con lecturas ya existentes), pero la IA SIEMPRE debe declararlo
// explícito, así que aquí es obligatorio.
//
// Se le pasa a client.messages.parse() como output_config.format, así
// Claude queda OBLIGADO a responder con alguna de estas formas exactas
// — no hace falta (ni conviene) confiar solo en la instrucción de
// texto "responde en JSON".
//
// El "refine" de opción múltiple (correcta === alguna opción) se
// aplica DESPUÉS de armar el discriminatedUnion, no antes: Zod exige
// que cada rama de un discriminatedUnion sea un ZodObject puro — un
// .refine() ANTES lo envuelve en ZodEffects y deja de calificar.
// ==========================================================

const { z } = require("zod");

const OpcionSchema = z.object({
    texto: z.string().min(1),
    valor: z.string().min(1)
});

const PreguntaOpcionMultipleSchema = z.object({
    tipo: z.literal("opcionMultiple"),
    pregunta: z.string().min(1),
    opciones: z.array(OpcionSchema).min(2).max(5),
    correcta: z.string().min(1)
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
    respuestasValidas: z.array(z.string().min(1)).min(1).max(5)
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
    respuestasValidas: z.array(z.string().min(1)).min(1).max(5)
});

const PreguntaSchema = z.discriminatedUnion("tipo", [
    PreguntaOpcionMultipleSchema,
    PreguntaVfSchema,
    PreguntaCompletarSchema,
    PreguntaOrdenarSchema,
    PreguntaTextoLibreSchema
]).refine(
    (p) => p.tipo !== "opcionMultiple" || p.opciones.some(o => o.valor === p.correcta),
    { message: "\"correcta\" debe coincidir con el \"valor\" de una de las opciones." }
).refine(
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
);

// Zod SDK helper (zodOutputFormat) espera un objeto raíz, no un arreglo
// suelto — se envuelve en { preguntas: [...] } y se desenvuelve otra
// vez del lado de generarPreguntasIA.js antes de devolverlo al cliente.
const BancoPreguntasSchema = z.object({
    preguntas: z.array(PreguntaSchema)
});

module.exports = { PreguntaSchema, BancoPreguntasSchema };
