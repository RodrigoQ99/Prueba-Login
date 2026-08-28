// ==========================================================
// ESQUEMA (Zod) DE LA LECTURA EXTRAÍDA DE UN DOCUMENTO
// ==========================================================
// Ver extraerLecturaDeDocumentoIA.js. Reusa PreguntaSchema (misma
// forma que ya usa todo el proyecto para una pregunta) — si el
// documento no traía preguntas, Claude las genera igual, pero deben
// respetar la misma estructura.
// ==========================================================

const { z } = require("zod");
const { PreguntaSchema } = require("./esquemaPreguntas");

const LecturaExtraidaSchema = z.object({
    titulo: z.string().min(1),
    texto: z.array(z.string().min(1)).min(1),
    preguntas: z.array(PreguntaSchema)
});

module.exports = { LecturaExtraidaSchema };
