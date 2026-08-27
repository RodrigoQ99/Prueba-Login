// ==========================================================
// ESQUEMA (Zod) DEL BANCO DE PREGUNTAS
// ==========================================================
// Misma forma que ya usa el resto del proyecto para una pregunta (ver
// editor-preguntas.js / protagonista.js en el frontend):
//   { pregunta, opciones: [{ texto, valor }], correcta }
// Se le pasa a client.messages.parse() como output_config.format, así
// Claude queda OBLIGADO a responder con esta forma exacta — no hace
// falta (ni conviene) confiar solo en la instrucción de texto "responde
// en JSON".
// ==========================================================

const { z } = require("zod");

const OpcionSchema = z.object({
    texto: z.string().min(1),
    valor: z.string().min(1)
});

const PreguntaSchema = z.object({
    pregunta: z.string().min(1),
    opciones: z.array(OpcionSchema).min(2).max(5),
    correcta: z.string().min(1)
}).refine(
    (p) => p.opciones.some(o => o.valor === p.correcta),
    { message: "\"correcta\" debe coincidir con el \"valor\" de una de las opciones." }
);

// Zod SDK helper (zodOutputFormat) espera un objeto raíz, no un arreglo
// suelto — se envuelve en { preguntas: [...] } y se desenvuelve otra
// vez del lado de generarPreguntasIA.js antes de devolverlo al cliente.
const BancoPreguntasSchema = z.object({
    preguntas: z.array(PreguntaSchema)
});

module.exports = { PreguntaSchema, BancoPreguntasSchema };
