// ==========================================================
// CLOUD FUNCTION: extraerLecturaDeDocumentoIA
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// Recibe la ruta (en Firebase Storage) de un documento que el admin
// subió (PDF, .docx o .txt). El documento puede traer UNA o VARIAS
// lecturas (ej. 10 historias con sus propias preguntas cada una) — se
// devuelven TODAS las que se detecten, en el mismo formato que usa el
// resto del proyecto: título, párrafos, y banco de preguntas por cada
// una. Si una lectura ya traía sus preguntas con la respuesta correcta
// marcada, se copian tal cual (no se parafrasean); si le faltan, se
// generan (mismas cantidades por nivel/edad que ya usa generarPreguntasIA,
// descritas directamente en el prompt — ver la nota más abajo sobre por
// qué no se reusa cantidadPreguntas.js aquí).
//
// El frontend (ver activarBotonSubirDocumento en admin.js) llena UN
// formulario si solo vino una lectura, o abre una fila de formularios
// —uno a la vez— si vinieron varias; en cualquier caso, cada una queda
// completamente EDITABLE para que el admin la revise antes de guardar,
// nunca se guarda sola. El archivo se borra de Storage apenas se
// termina de leer (éxito o error) — es solo un archivo de entrada
// transitorio, nunca queda guardado de forma permanente.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
// Ver la misma nota en generarPreguntasIA.js: en la versión publicada
// del SDK (^0.70), las salidas estructuradas todavía son beta.
const { betaZodOutputFormat } = require("@anthropic-ai/sdk/helpers/beta/zod");
const { verificarAdmin } = require("./verificarAdmin");
const { LecturasExtraidasSchema } = require("./esquemaLecturaExtraida");
const { extraerTextoDeStorage } = require("./extraerTextoStorage");
const { db, admin } = require("../admin-init");

const NOMBRE_NIVEL = { facil: "fácil", intermedio: "intermedio", dificil: "difícil" };

// Tope de seguridad: pensado para varias lecturas largas en un mismo
// documento (ej. 10 lecturas de nivel difícil, ~1800 palabras cada
// una, más sus preguntas) — muy por encima de lo normal, es solo para
// no disparar el costo si alguien sube por error algo descomunal.
const LIMITE_CARACTERES_DOCUMENTO = 200000;

// Las cantidades de preguntas por nivel/edad se describen aquí DENTRO
// del texto del prompt (en vez de calcularlas nosotros con
// cantidadPreguntas.js, como sí hace generarPreguntasIA) porque un
// documento con varias lecturas necesita una cantidad DISTINTA por
// cada una, según su propia extensión — y esa división en lecturas
// individuales la hace Claude, no nuestro código. Los números son los
// mismos de siempre (fácil 200-400→5, intermedio 600-900→8, difícil
// 1200-1800→11 para premios; 3 fijas para Mejorar la lectura) — si
// cambian allá, hay que actualizarlos aquí también.
function construirPrompt({ textoDocumento, tipo, nivel, edad }) {

    const contextoAudiencia = tipo === "mejora"
        ? `Estas lecturas son para el catálogo "Mejorar la lectura", dirigidas a un lector de ${edad ? `${edad} años` : "la edad indicada"}. Si a alguna le faltan preguntas, genera 3 preguntas sencillas y directas para esa lectura.`
        : `Estas lecturas pertenecen al catálogo de premios, nivel "${NOMBRE_NIVEL[nivel] || nivel || "no especificado"}". Si a alguna le faltan preguntas, genera la cantidad correspondiente según la extensión de ESA lectura: 200-400 palabras → 5 preguntas; 600-900 palabras → 8 preguntas; 1200-1800 palabras → 11 preguntas (si no cae exactamente en ninguna banda, usa la cantidad de la banda más cercana).`;

    return `Eres un asistente que ayuda a un administrador a preparar el contenido de lecturas para una plataforma educativa de fomento a la lectura, a partir de un documento que subió.

${contextoAudiencia}

El documento puede contener UNA o VARIAS lecturas distintas (historias independientes, cada una con su propio título) — a veces incluso diez o más. Identifica CADA lectura por separado: nunca mezcles el texto de una con el de otra, ni completes una historia con contenido que en realidad pertenece a la siguiente.

Para CADA lectura que encuentres:

1. Identifica su TÍTULO (si no tiene uno explícito, propone uno breve y apropiado).
2. Separa su TEXTO PRINCIPAL en párrafos coherentes. Excluye de ahí cualquier pregunta, cuestionario, numeración de página o metadato — eso no es parte de la historia.
3. Si esa lectura YA incluye sus preguntas de comprensión con las opciones y la respuesta correcta marcada o indicada, CÓPIALAS TAL CUAL — palabra por palabra, sin parafrasear ni inventar otras distintas, igual que copiar y pegar. Solo si a esa lectura en particular le faltan preguntas (o vienen incompletas, sin indicar cuál es la correcta), genera tú las que falten según la instrucción de arriba.

Devuelve TODAS las lecturas que encuentres, en el mismo orden en que aparecen en el documento.

Texto extraído del documento:
"""
${textoDocumento}
"""`;

}

const extraerLecturaDeDocumentoIA = onCall(
    { secrets: ["ANTHROPIC_API_KEY"], memory: "1GiB", timeoutSeconds: 300 },
    async (request) => {

        await verificarAdmin(request, db);

        const datos = request.data || {};
        const storagePath = datos.storagePath;
        const tipo = datos.tipo;
        const nivel = datos.nivel || null;
        const edad = typeof datos.edad === "number" ? datos.edad : null;

        // "fuentesLecturas/" es la ÚNICA carpeta que estas funciones tocan
        // (ver storage.rules) — no se acepta ninguna otra ruta, por si
        // alguien manipulara la llamada desde la consola del navegador.
        if (!storagePath || typeof storagePath !== "string" || !storagePath.startsWith("fuentesLecturas/")) {
            throw new HttpsError("invalid-argument", "Falta la ruta del documento subido.");
        }

        if (tipo !== "premio" && tipo !== "mejora") {
            throw new HttpsError("invalid-argument", "\"tipo\" debe ser \"premio\" o \"mejora\".");
        }

        const archivo = admin.storage().bucket().file(storagePath);

        let textoDocumento;
        try {
            textoDocumento = (await extraerTextoDeStorage(storagePath)).trim();
        } catch (error) {
            logger.error("No se pudo extraer texto del documento:", error);
            archivo.delete().catch(() => {});
            throw new HttpsError(
                "invalid-argument",
                "No se pudo leer ese documento — puede estar dañado, protegido, o en un formato no soportado. Completa el formulario a mano."
            );
        }

        // Ya se tiene el texto en memoria — el archivo original ya no hace
        // falta. Se borra siempre desde aquí en adelante (éxito o error de
        // Claude), es solo un archivo de entrada transitorio.
        archivo.delete().catch(error => logger.warn("No se pudo borrar el documento temporal:", error));

        if (!textoDocumento || textoDocumento.length < 20) {
            throw new HttpsError("invalid-argument", "El documento no parece tener texto legible. Completa el formulario a mano.");
        }

        textoDocumento = textoDocumento.slice(0, LIMITE_CARACTERES_DOCUMENTO);

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const formato = betaZodOutputFormat(LecturasExtraidasSchema);

        // Con max_tokens tan alto (pensado para varias lecturas largas
        // en un mismo documento), el SDK EXIGE streaming — client.beta
        // .messages.parse() usa una petición normal por debajo, y esta
        // función se puso a tronar con "Streaming is required for
        // operations that may take longer than 10 minutes" apenas se
        // probó con un documento real. .stream() no tiene ese límite, y
        // formato.parse(...) (el mismo validador Zod que usa .parse()
        // por dentro) se puede llamar a mano sobre el texto final.
        let parsedOutput;
        try {

            const stream = client.beta.messages.stream({
                model: "claude-opus-5",
                max_tokens: 32000,
                messages: [
                    { role: "user", content: construirPrompt({ textoDocumento, tipo, nivel, edad }) }
                ],
                output_format: formato
            });

            const mensaje = await stream.finalMessage();
            const bloqueTexto = mensaje.content.find(bloque => bloque.type === "text");

            if (!bloqueTexto) {
                throw new Error("Claude no devolvió contenido de texto.");
            }

            parsedOutput = formato.parse(bloqueTexto.text);

        } catch (error) {
            logger.error("Error llamando a la API de Claude (extraerLecturaDeDocumentoIA):", error);
            throw new HttpsError("internal", "No se pudo procesar el documento con IA. Intenta de nuevo, o completa el formulario a mano.");
        }

        if (!parsedOutput || !Array.isArray(parsedOutput.lecturas) || parsedOutput.lecturas.length === 0) {
            logger.error("Claude no devolvió ninguna lectura válida.");
            throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo, o completa el formulario a mano.");
        }

        return { lecturas: parsedOutput.lecturas };

    }
);

module.exports = { extraerLecturaDeDocumentoIA };
