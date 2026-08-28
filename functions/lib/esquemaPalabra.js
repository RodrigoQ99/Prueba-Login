// ==========================================================
// ESQUEMA (Zod) DE PALABRA(S) DEL BANCO DE AHORCADO
// ==========================================================
// Misma forma que ya usa admin.js/ahorcado.js para una palabra del
// banco: { palabra, pista } — "pista" es la definición/significado
// que se le muestra al jugador como ayuda.
// ==========================================================

const { z } = require("zod");

const PalabraSchema = z.object({
    palabra: z.string().min(1),
    pista: z.string().min(1)
});

// Para extraerPalabraDeUrlIA.js — una sola palabra por página.
const PalabraUnicaSchema = PalabraSchema;

// Para extraerPalabrasDeDocumentoIA.js / cargarGlosarioPersonalIA.js —
// una lista completa extraída (o generada) de un documento.
const ListaPalabrasSchema = z.object({
    palabras: z.array(PalabraSchema)
});

module.exports = { PalabraSchema, PalabraUnicaSchema, ListaPalabrasSchema };
