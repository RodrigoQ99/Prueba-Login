// ==========================================================
// ESQUEMA (Zod) DEL VEREDICTO DE MODERACIÓN
// ==========================================================
// Ver moderarPropuestaIA.js — esto es SOLO una opinión para el admin,
// nunca aprueba/rechaza/publica nada por su cuenta (eso lo sigue
// haciendo el admin manualmente, igual que hoy).
// ==========================================================

const { z } = require("zod");

const ModeracionSchema = z.object({
    veredicto: z.enum(["apropiado", "revisar con cuidado"]),
    motivo: z.string().min(1),
    temas_detectados: z.array(z.string())
});

module.exports = { ModeracionSchema };
