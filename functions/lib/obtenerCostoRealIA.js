// ==========================================================
// CLOUD FUNCTION: obtenerCostoRealIA (Etapa 38)
// ==========================================================
// EXCLUSIVA para el panel de administrador. NO es una función de IA —
// nunca llama a Claude, no gasta nada de presupuesto de IA — es solo un
// puente de solo lectura hacia la "Usage & Cost Admin API" oficial de
// Anthropic (https://api.anthropic.com/v1/organizations/cost_report),
// que devuelve el gasto REAL ya facturado por Anthropic — no un
// estimado calculado por esta app (ver registrarUsoIA.js, que sigue
// existiendo aparte: ese es el conteo propio, este es el oficial).
//
// Esa API es HTTP puro (no forma parte del SDK de @anthropic-ai/sdk) y
// necesita una credencial DISTINTA a la que usan las demás funciones de
// IA: una "Admin API Key" (empieza con "sk-ant-admin01-..."), creada
// aparte en la Consola de Anthropic → Settings → API Keys → Admin keys.
// Guardada como el secreto ANTHROPIC_ADMIN_API_KEY (ver README.md).
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { verificarAdmin } = require("./verificarAdmin");
const { db } = require("../admin-init");

const DIAS_POR_DEFECTO = 30;
const MAXIMO_PAGINAS = 5; // salvaguarda — con 30 días y bucket de 1 día no debería hacer falta más de una.

const obtenerCostoRealIA = onCall(
    { secrets: ["ANTHROPIC_ADMIN_API_KEY"], timeoutSeconds: 30 },
    async (request) => {

        await verificarAdmin(request, db);

        const ahora = new Date();
        const desde = new Date(ahora.getTime() - DIAS_POR_DEFECTO * 24 * 60 * 60 * 1000);

        const porDia = {};
        let totalUsd = 0;
        let page = null;
        let paginasLeidas = 0;

        try {

            do {

                const parametros = new URLSearchParams({
                    starting_at: desde.toISOString(),
                    ending_at: ahora.toISOString(),
                    limit: "31"
                });
                if (page) parametros.set("page", page);

                const respuesta = await fetch(
                    `https://api.anthropic.com/v1/organizations/cost_report?${parametros.toString()}`,
                    {
                        headers: {
                            "anthropic-version": "2023-06-01",
                            "x-api-key": process.env.ANTHROPIC_ADMIN_API_KEY
                        }
                    }
                );

                if (!respuesta.ok) {
                    const textoError = await respuesta.text();
                    logger.error("La API de costos de Anthropic respondió con error:", respuesta.status, textoError);
                    throw new HttpsError(
                        "internal",
                        respuesta.status === 401 || respuesta.status === 403
                            ? "La Admin API Key de Anthropic no es válida o no tiene permiso. Revísala en Firebase (functions:secrets:set ANTHROPIC_ADMIN_API_KEY)."
                            : `Anthropic respondió con un error (${respuesta.status}).`
                    );
                }

                const cuerpo = await respuesta.json();

                (cuerpo.data || []).forEach(bucket => {
                    // "amount" viene en centésimas de centavo, como texto
                    // (ver la documentación: "123.45" en USD = $1.23) —
                    // dividir entre 100 para pasar a dólares.
                    const fecha = (bucket.starting_at || "").slice(0, 10); // YYYY-MM-DD
                    const totalDelDia = (bucket.results || [])
                        .reduce((suma, r) => suma + parseFloat(r.amount || "0"), 0) / 100;
                    porDia[fecha] = (porDia[fecha] || 0) + totalDelDia;
                    totalUsd += totalDelDia;
                });

                page = cuerpo.has_more ? cuerpo.next_page : null;
                paginasLeidas++;

            } while (page && paginasLeidas < MAXIMO_PAGINAS);

        } catch (error) {

            if (error instanceof HttpsError) throw error;
            logger.error("No se pudo consultar el costo real en Anthropic:", error);
            throw new HttpsError("internal", "No se pudo consultar el gasto real en Anthropic. Intenta de nuevo.");

        }

        const porDiaOrdenado = Object.entries(porDia)
            .map(([fecha, costoUsd]) => ({ fecha, costoUsd }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        return { totalUsd, porDia: porDiaOrdenado, dias: DIAS_POR_DEFECTO };

    }
);

module.exports = { obtenerCostoRealIA };
