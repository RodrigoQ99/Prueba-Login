// ==========================================================
// CLOUD FUNCTIONS — PANEL DE ADMINISTRADOR
// ==========================================================
// Todas las funciones que necesitan la clave de la API de Anthropic
// (o cualquier otro secreto) viven aquí, NUNCA en el código estático
// del sitio (que corre en el navegador de cualquiera). Ver README.md
// en esta carpeta para cómo desplegar y configurar el secreto.
//
// - generarPreguntasIA: arma el banco de preguntas de una lectura a
//   partir de su texto (panel de administrador, editor de lecturas).
// - moderarPropuestaIA: da una opinión sobre una propuesta de "Ser el
//   protagonista de la historia", sin aprobar/rechazar nada por su
//   cuenta (panel de administrador, cola de propuestas).
//
// Ambas exigen que quien llama sea un administrador autenticado (ver
// lib/verificarAdmin.js) — cualquier otra persona recibe un error sin
// que se llegue a llamar a Claude, así no se gasta presupuesto en
// llamadas no autorizadas.
// ==========================================================

const { generarPreguntasIA } = require("./lib/generarPreguntasIA");
const { moderarPropuestaIA } = require("./lib/moderarPropuestaIA");

exports.generarPreguntasIA = generarPreguntasIA;
exports.moderarPropuestaIA = moderarPropuestaIA;
