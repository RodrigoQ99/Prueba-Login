// ==========================================================
// ESQUEMA (Zod) DE LAS LECTURAS EXTRAÍDAS DE UN DOCUMENTO
// ==========================================================
// Ver extraerLecturaDeDocumentoIA.js. Reusa PreguntaSchema (misma
// forma que ya usa todo el proyecto para una pregunta). Un documento
// puede traer UNA o VARIAS lecturas — la respuesta SIEMPRE es un
// arreglo (de 1 o más), así el resto del código no necesita dos
// caminos distintos según cuántas venían. Si alguna lectura no traía
// preguntas, Claude las genera igual, pero deben respetar la misma
// estructura que las que sí venían copiadas del documento.
// ==========================================================

const { z } = require("zod");
const { PreguntaSchema } = require("./esquemaPreguntas");

const LecturaExtraidaSchema = z.object({
    titulo: z.string().min(1),
    texto: z.array(z.string().min(1)).min(1),
    preguntas: z.array(PreguntaSchema)
});

const LecturasExtraidasSchema = z.object({
    lecturas: z.array(LecturaExtraidaSchema).min(1)
});

module.exports = { LecturaExtraidaSchema, LecturasExtraidasSchema };
