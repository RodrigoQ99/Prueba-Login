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
// - extraerLecturaDeDocumentoIA: lee un documento (PDF/.docx/.txt) que
//   el admin subió a Storage y arma título + texto + preguntas para
//   llenar el mismo formulario de creación de lectura.
// - extraerTextoDePdfGuardado: devuelve el texto completo de un PDF
//   guardado en Storage (SIN tocarlo con IA) para que el admin elija a
//   mano el fragmento que quiere usar en "El Hilo del día".
// - dividirFragmentoEnHiloIA: divide el fragmento YA ELEGIDO por el
//   admin en exactamente 5 partes narrativamente coherentes y en
//   orden — nunca decide qué fragmento usar, solo cómo dividirlo.
//
// Todas exigen que quien llama sea un administrador autenticado (ver
// lib/verificarAdmin.js) — cualquier otra persona recibe un error sin
// que se llegue a llamar a Claude, así no se gasta presupuesto en
// llamadas no autorizadas.
// ==========================================================

const { generarPreguntasIA } = require("./lib/generarPreguntasIA");
const { moderarPropuestaIA } = require("./lib/moderarPropuestaIA");
const { extraerLecturaDeDocumentoIA } = require("./lib/extraerLecturaDeDocumentoIA");
const { extraerTextoDePdfGuardado } = require("./lib/extraerTextoDePdfGuardado");
const { dividirFragmentoEnHiloIA } = require("./lib/dividirFragmentoEnHiloIA");

exports.generarPreguntasIA = generarPreguntasIA;
exports.moderarPropuestaIA = moderarPropuestaIA;
exports.extraerLecturaDeDocumentoIA = extraerLecturaDeDocumentoIA;
exports.extraerTextoDePdfGuardado = extraerTextoDePdfGuardado;
exports.dividirFragmentoEnHiloIA = dividirFragmentoEnHiloIA;
