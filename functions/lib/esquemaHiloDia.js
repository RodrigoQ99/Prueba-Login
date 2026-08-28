// ==========================================================
// ESQUEMA (Zod) DE LOS 5 FRAGMENTOS DE "EL HILO DEL DÍA"
// ==========================================================
// Ver dividirFragmentoEnHiloIA.js. SIEMPRE exactamente 5 — el juego
// (hilo-del-dia.js) los desordena solo al mostrarlos; la base de
// datos siempre guarda el orden narrativo real.
// ==========================================================

const { z } = require("zod");

const FragmentosHiloSchema = z.object({
    fragmentos: z.array(z.string().min(1)).length(5)
});

module.exports = { FragmentosHiloSchema };
