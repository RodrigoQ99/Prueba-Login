// ==========================================================
// GENERAR CUESTIONARIO PARA TAREA ESCOLAR (IA)
// ==========================================================
// Cloud Function que genera un banco amplio de preguntas
// basadas en el título y nivel de una tarea escolar.
// Usa el mismo patrón que generarPreguntasIA pero con prompt
// adaptado para contenido académico.
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { verificarAdmin } = require("./verificarAdmin");
const { registrarUsoIA } = require("./registrarUsoIA");
const Anthropic = require("@anthropic-ai/sdk").default;

const generarCuestionarioTareaIA = onCall(
    {
        region: "us-central1",
        timeoutSeconds: 120,
        memory: "512MiB",
        secrets: ["ANTHROPIC_API_KEY"]
    },
    async (request) => {

        // No verificar admin: los maestros también pueden generar
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
        }

        const { titulo, cantidadPreguntas, nivel } = request.data;

        if (!titulo) {
            throw new HttpsError("invalid-argument", "Falta el título de la tarea.");
        }

        const cantidad = cantidadPreguntas || 20;

        const client = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });

        const prompt = `Genera exactamente ${cantidad} preguntas de evaluación para estudiantes de nivel "${nivel || 'general'}" sobre el tema: "${titulo}".

Debe haber variedad de tipos:
- opcionMultiple: con campo "respuestaCorrecta" (string) y "distractores" (array de 5 strings incorrectos)
- verdaderoFalso: con campo "respuestaCorrecta" que sea "verdadero" o "falso"
- completar: con campo "respuestaCorrecta" (la palabra o frase que completa)

Cada pregunta debe tener:
- "tipo": "opcionMultiple" | "verdaderoFalso" | "completar"
- "pregunta": el texto de la pregunta
- "respuestaCorrecta": la respuesta correcta
- "distractores": (solo para opcionMultiple) array de opciones incorrectas

Devuelve SOLO un JSON válido con la estructura: { "preguntas": [...] }
No incluyas explicaciones ni texto adicional fuera del JSON.`;

        try {

            const respuesta = await client.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4000,
                messages: [
                    { role: "user", content: prompt }
                ]
            });

            const textoRespuesta = respuesta.content[0].text;

            // Registrar uso de IA
            await registrarUsoIA({
                funcion: "generarCuestionarioTareaIA",
                tokensEntrada: respuesta.usage.input_tokens,
                tokensSalida: respuesta.usage.output_tokens,
                modelo: "claude-sonnet-4-20250514"
            });

            // Parsear JSON
            const jsonMatch = textoRespuesta.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new HttpsError("internal", "La IA no devolvió un JSON válido.");
            }

            const resultado = JSON.parse(jsonMatch[0]);
            return { preguntas: resultado.preguntas || [] };

        } catch (error) {
            if (error instanceof HttpsError) throw error;
            console.error("Error al generar cuestionario:", error);
            throw new HttpsError("internal", "No se pudieron generar las preguntas.");
        }

    }
);

module.exports = { generarCuestionarioTareaIA };
