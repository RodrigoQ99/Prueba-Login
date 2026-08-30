// ==========================================================
// CLOUD FUNCTIONS — PANEL DE ADMINISTRADOR
// ==========================================================
// Todas las funciones que necesitan la clave de la API de Anthropic
// (o cualquier otro secreto) viven aquí, NUNCA en el código estático
// del sitio (que corre en el navegador de cualquiera). Ver README.md
// en esta carpeta para cómo desplegar y configurar el secreto.
//
// Todas exclusivas para administradores (ver lib/verificarAdmin.js) —
// cualquier otra persona recibe un error sin que se llegue a llamar a
// Claude, así no se gasta presupuesto en llamadas no autorizadas. Ya NO
// hay ninguna función de IA abierta a usuarios normales (ver nota sobre
// cargarGlosarioPersonalIA más abajo) — subir documentos y usar IA
// queda exclusivamente para el panel de administrador.
//
// - generarPreguntasIA: arma el banco de preguntas de una lectura a
//   partir de su texto (panel de administrador, editor de lecturas).
// - moderarPropuestaIA: da una opinión sobre una propuesta de "Ser el
//   protagonista de la historia", sin aprobar/rechazar nada por su
//   cuenta (panel de administrador, cola de propuestas).
// - generarLecturaOriginalIA: INVENTA una historia 100% original (nunca
//   copiada) que combina el/los géneros que elige el admin, junto con
//   su banco de preguntas — mismas bandas de palabras/preguntas que ya
//   usa el resto del proyecto (Etapa 29).
// - extraerTextoDePdfGuardado: devuelve el texto completo de un PDF
//   guardado en Storage (SIN tocarlo con IA) para que el admin elija a
//   mano el fragmento que quiere usar en "El Hilo del día".
// - dividirFragmentoEnHiloIA: divide el fragmento YA ELEGIDO por el
//   admin en exactamente 5 partes narrativamente coherentes y en
//   orden — nunca decide qué fragmento usar, solo cómo dividirlo.
// - extraerPalabraDeUrlIA: lee una página de diccionario en línea (ej.
//   RAE) y extrae SOLO la palabra y su definición, para el banco
//   general de Ahorcado.
// - extraerPalabrasDeDocumentoIA: lee un documento con una lista de
//   palabras (con o sin definiciones) para el banco general de
//   Ahorcado.
//
// DESCONECTADA (Etapa 28): extraerLecturaDeDocumentoIA — el admin pidió
// quitar por completo la opción de crear lecturas subiendo un
// documento. El archivo lib/extraerLecturaDeDocumentoIA.js (y su
// esquema, esquemaLecturaExtraida.js — este último SÍ sigue en uso, lo
// reusa generarLecturaOriginalIA) se dejaron sin borrar por si algún
// día se retoma, pero ya NO se exporta aquí abajo. Su envoltorio en el
// frontend (extraerLecturaDeDocumentoConIA, admin-ia.js) también quedó
// comentado.
//
// DESCONECTADA (Etapa 29): cargarGlosarioPersonalIA — era la ÚNICA
// función abierta a cualquier usuario autenticado (no solo admins): le
// dejaba subir un documento y usar IA para armar su propio glosario de
// Ahorcado. El admin pidió que los usuarios YA NO puedan subir ningún
// documento ni usar IA — eso queda exclusivo del panel de
// administrador. El código sigue en lib/cargarGlosarioPersonalIA.js sin
// borrar, pero ya no está exportada; su envoltorio en el frontend
// (subirGlosarioPersonalConIA, ahorcado-ia.js) y todo el selector de
// "banco general / glosario personal" en ahorcado.html/ahorcado.js
// también se quitaron — ahora Ahorcado solo usa el banco general
// (bancoPalabras), que el admin llena a mano, con IA (URL/documento) o
// importando un Excel (Etapa 28, sin IA, ver admin.js).
// ==========================================================

const { generarPreguntasIA } = require("./lib/generarPreguntasIA");
const { moderarPropuestaIA } = require("./lib/moderarPropuestaIA");
const { generarLecturaOriginalIA } = require("./lib/generarLecturaOriginalIA");
const { extraerTextoDePdfGuardado } = require("./lib/extraerTextoDePdfGuardado");
const { dividirFragmentoEnHiloIA } = require("./lib/dividirFragmentoEnHiloIA");
const { extraerPalabraDeUrlIA } = require("./lib/extraerPalabraDeUrlIA");
const { extraerPalabrasDeDocumentoIA } = require("./lib/extraerPalabrasDeDocumentoIA");
// const { extraerLecturaDeDocumentoIA } = require("./lib/extraerLecturaDeDocumentoIA"); // DESCONECTADA — ver nota arriba
// const { cargarGlosarioPersonalIA } = require("./lib/cargarGlosarioPersonalIA"); // DESCONECTADA — ver nota arriba

exports.generarPreguntasIA = generarPreguntasIA;
exports.moderarPropuestaIA = moderarPropuestaIA;
exports.generarLecturaOriginalIA = generarLecturaOriginalIA;
exports.extraerTextoDePdfGuardado = extraerTextoDePdfGuardado;
exports.dividirFragmentoEnHiloIA = dividirFragmentoEnHiloIA;
exports.extraerPalabraDeUrlIA = extraerPalabraDeUrlIA;
exports.extraerPalabrasDeDocumentoIA = extraerPalabrasDeDocumentoIA;
// exports.extraerLecturaDeDocumentoIA = extraerLecturaDeDocumentoIA; // DESCONECTADA — ver nota arriba
// exports.cargarGlosarioPersonalIA = cargarGlosarioPersonalIA; // DESCONECTADA — ver nota arriba
