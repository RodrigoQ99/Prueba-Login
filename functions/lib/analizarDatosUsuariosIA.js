// ==========================================================
// CLOUD FUNCTION: analizarDatosUsuariosIA (Etapa 37)
// ==========================================================
// EXCLUSIVA para el panel de administrador (ver verificarAdmin.js).
// El admin escribe una pregunta en lenguaje natural (ej. "¿Cuál es el
// género de lectura favorito entre los usuarios de 10 a 12 años?") y,
// opcionalmente, filtros (edad, género, país, géneros de lectura de
// interés) — este archivo NUNCA busca nada en internet ni inventa
// datos: solo trabaja con lo que ya existe en Firestore.
//
// IMPORTANTE PARA EL COSTO: el PROPIO CÓDIGO (no Claude) agrupa y
// cuenta los datos según los filtros ANTES de llamar a la IA — arma un
// "resumen" ya compacto (conteos, no la lista de usuarios uno por uno)
// y ESO es lo único que se le manda a Claude, junto con la pregunta.
// El trabajo de Claude es REDACTAR una explicación clara de ese
// resumen, nunca volver a contar nada desde cero. Así el costo de cada
// consulta es prácticamente el mismo sin importar si la plataforma
// tiene 50 o 50,000 usuarios.
//
// PRIVACIDAD: el resumen es siempre AGREGADO/ESTADÍSTICO (cuántos, qué
// porcentaje) — nunca incluye nombres, correos ni ningún otro dato que
// identifique a un usuario en particular. El prompt además le indica a
// Claude explícitamente que no debe inventar ni exponer datos
// individuales.
//
// Cada consulta (pregunta + respuesta + filtros + fecha) se guarda en
// la colección "analisisIA" — la "librería de respuestas" que el admin
// puede volver a filtrar después sin gastar una consulta nueva (ver
// admin-analisis.js).
// ==========================================================

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const Anthropic = require("@anthropic-ai/sdk");
const { verificarAdmin } = require("./verificarAdmin");
const { registrarUsoIA } = require("./registrarUsoIA");
const { db, admin } = require("../admin-init");

const MAXIMO_PREGUNTA_CARACTERES = 500;
const MAXIMO_GENEROS_FILTRO = 10;

// Mismas bandas que admin-estadisticas.js (ver BANDAS_EDAD_ESTADISTICAS)
// — se reescriben aquí porque Cloud Functions corre en su propio
// entorno de Node, aparte del navegador (no se puede hacer require() de
// un script de frontend).
const BANDAS_EDAD = [
    { etiqueta: "Menos de 10", min: -Infinity, max: 9 },
    { etiqueta: "10 a 12", min: 10, max: 12 },
    { etiqueta: "13 a 15", min: 13, max: 15 },
    { etiqueta: "16 a 18", min: 16, max: 18 },
    { etiqueta: "19 a 25", min: 19, max: 25 },
    { etiqueta: "26 o más", min: 26, max: Infinity }
];

function bandaDeEdad(edad) {
    const banda = BANDAS_EDAD.find(b => edad >= b.min && edad <= b.max);
    return banda ? banda.etiqueta : "Sin dato";
}

function contarPorValor(lista, extractorDeValores) {

    const conteos = {};

    lista.forEach(item => {
        const valores = extractorDeValores(item);
        (Array.isArray(valores) ? valores : [valores]).forEach(valor => {
            if (!valor) return;
            conteos[valor] = (conteos[valor] || 0) + 1;
        });
    });

    return Object.entries(conteos)
        .map(([etiqueta, cantidad]) => ({ etiqueta, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

}

/**
 * ¿Este usuario cumple con los filtros que eligió el admin? Cualquier
 * filtro vacío/ausente no descarta a nadie por ese criterio.
 */
function usuarioCoincideFiltros(usuario, filtros) {

    if (typeof filtros.edadMin === "number") {
        if (typeof usuario.edadPerfil !== "number" || usuario.edadPerfil < filtros.edadMin) return false;
    }

    if (typeof filtros.edadMax === "number") {
        if (typeof usuario.edadPerfil !== "number" || usuario.edadPerfil > filtros.edadMax) return false;
    }

    if (filtros.genero && usuario.genero !== filtros.genero) return false;

    if (filtros.pais && usuario.pais !== filtros.pais) return false;

    if (filtros.generosLectura && filtros.generosLectura.length > 0) {
        const propios = usuario.generosLectura || [];
        const coincideAlguno = filtros.generosLectura.some(g => propios.includes(g));
        if (!coincideAlguno) return false;
    }

    return true;

}

/**
 * Arma el resumen COMPACTO (ya contado) que se le manda a Claude —
 * ningún dato individual, solo conteos agregados.
 */
async function construirResumen(filtros) {

    const [usuariosSnap, lecturasSnap, mejoraSnap, progresoSnap] = await Promise.all([
        db.collection("usuarios").get(),
        db.collection("lecturas").get(),
        db.collection("mejoraLecturas").get(),
        // Un solo "where" de igualdad — el resto se filtra en memoria,
        // para no necesitar un índice compuesto (mismo patrón que
        // perfil-publicaciones.js / admin-estadisticas.js en el frontend).
        db.collection("progreso").where("puntosGanados", ">", 0).get()
    ]);

    const todosLosUsuarios = usuariosSnap.docs.map(doc => doc.data());
    const usuariosFiltrados = todosLosUsuarios.filter(u => usuarioCoincideFiltros(u, filtros));

    // --- Aprobados por lectura (un solo query, no uno por lectura) ---
    const aprobadosPorLectura = {};
    progresoSnap.forEach(doc => {
        const d = doc.data();
        aprobadosPorLectura[d.lecturaId] = (aprobadosPorLectura[d.lecturaId] || 0) + 1;
    });

    const todasLasLecturas = [
        ...lecturasSnap.docs.map(doc => ({ ...doc.data(), catalogo: "premios" })),
        ...mejoraSnap.docs.map(doc => ({ ...doc.data(), catalogo: "mejora" }))
    ];

    const masVistas = [...todasLasLecturas]
        .sort((a, b) => (b.vistas || 0) - (a.vistas || 0))
        .slice(0, 10)
        .map(l => ({ titulo: l.titulo, catalogo: l.catalogo, vistas: l.vistas || 0 }));

    const masCompletadas = todasLasLecturas
        .map(l => ({ titulo: l.titulo, catalogo: l.catalogo, aprobados: aprobadosPorLectura[l.id] || 0 }))
        .filter(l => l.aprobados > 0)
        .sort((a, b) => b.aprobados - a.aprobados)
        .slice(0, 10);

    return {
        filtrosAplicados: filtros,
        totalUsuariosEnLaApp: todosLosUsuarios.length,
        totalUsuariosQueCumplenLosFiltros: usuariosFiltrados.length,
        // Todo lo de aquí abajo es SOLO sobre los usuarios que cumplen
        // los filtros (el subconjunto filtrado).
        porGeneroDeLecturaFavorito: contarPorValor(usuariosFiltrados, u => u.generosLectura || []),
        porGeneroDeLecturaEscritoEnOtro: [], // reservado, no se calcula aquí (ver admin-estadisticas.js si se necesita)
        porPais: contarPorValor(usuariosFiltrados, u => u.pais),
        porBandaDeEdad: contarPorValor(usuariosFiltrados, u => typeof u.edadPerfil === "number" ? bandaDeEdad(u.edadPerfil) : "Sin dato"),
        porGenero: contarPorValor(usuariosFiltrados, u => u.genero || "Sin dato"),
        porTipoDeUsuario: contarPorValor(usuariosFiltrados, u => u.tipo || "Sin dato"),
        // Estas dos son GLOBALES (de TODA la app, no solo del filtro) —
        // no hay forma de saber quién vio o completó una lectura sin
        // filtro de edad/género/país, así que se etiquetan aparte para
        // que Claude no las confunda con los datos filtrados de arriba.
        lecturasMasVistasGlobal: masVistas,
        lecturasMasCompletadasGlobal: masCompletadas
    };

}

function construirPrompt({ pregunta, resumen }) {

    return `Eres un asistente que ayuda a un administrador a interpretar datos ya agregados/estadísticos de una plataforma educativa de fomento a la lectura.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con base en el resumen de datos de abajo. NUNCA inventes cifras, nombres de usuarios, ni ningún dato que no esté explícitamente en el resumen.
- El resumen es siempre AGREGADO (conteos, no personas individuales) — nunca hay nombres ni correos ahí, y tu respuesta tampoco debe mencionar ni inventar información de ningún usuario en particular.
- Si la pregunta no se puede responder con este resumen (falta el dato), dilo claramente en vez de adivinar.
- Sé claro, directo y breve — un administrador ocupado está leyendo esto.
- Responde en español.

Resumen de datos (ya contado por el sistema, no por ti):
\`\`\`json
${JSON.stringify(resumen, null, 2)}
\`\`\`

Pregunta del administrador: "${pregunta}"`;

}

const analizarDatosUsuariosIA = onCall(
    { secrets: ["ANTHROPIC_API_KEY"], memory: "512MiB", timeoutSeconds: 60 },
    async (request) => {

        await verificarAdmin(request, db);

        const datos = request.data || {};
        const pregunta = String(datos.pregunta || "").trim();
        const filtrosCrudos = datos.filtros || {};

        if (!pregunta) {
            throw new HttpsError("invalid-argument", "Escribe una pregunta.");
        }
        if (pregunta.length > MAXIMO_PREGUNTA_CARACTERES) {
            throw new HttpsError("invalid-argument", `La pregunta es demasiado larga (máximo ${MAXIMO_PREGUNTA_CARACTERES} caracteres).`);
        }

        // Los filtros se sanean acá — nunca se confía en el shape que
        // manda el navegador tal cual.
        const filtros = {
            edadMin: typeof filtrosCrudos.edadMin === "number" ? filtrosCrudos.edadMin : null,
            edadMax: typeof filtrosCrudos.edadMax === "number" ? filtrosCrudos.edadMax : null,
            genero: (filtrosCrudos.genero === "hombre" || filtrosCrudos.genero === "mujer") ? filtrosCrudos.genero : null,
            pais: typeof filtrosCrudos.pais === "string" && filtrosCrudos.pais ? filtrosCrudos.pais : null,
            generosLectura: Array.isArray(filtrosCrudos.generosLectura)
                ? filtrosCrudos.generosLectura.map(g => String(g)).slice(0, MAXIMO_GENEROS_FILTRO)
                : []
        };

        const resumen = await construirResumen(filtros);

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        let response;
        try {
            response = await client.messages.create({
                model: "claude-opus-5",
                max_tokens: 2000,
                messages: [
                    { role: "user", content: construirPrompt({ pregunta, resumen }) }
                ]
            });
        } catch (error) {
            logger.error("Error llamando a la API de Claude (analizarDatosUsuariosIA):", error);
            throw new HttpsError("internal", "No se pudo generar el análisis con IA. Intenta de nuevo.");
        }

        const bloqueTexto = response.content.find(bloque => bloque.type === "text");
        if (!bloqueTexto || !bloqueTexto.text) {
            logger.error("Claude no devolvió texto:", response.stop_reason);
            throw new HttpsError("internal", "La IA no devolvió un resultado válido. Intenta de nuevo.");
        }

        const respuesta = bloqueTexto.text.trim();

        await registrarUsoIA({
            tipo: "analisis_datos",
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens
        });

        // "Librería de respuestas" — se guarda para poder filtrarla
        // después sin volver a preguntarle a la IA (ver admin-analisis.js).
        let idGuardado = null;
        try {
            const ref = await db.collection("analisisIA").add({
                pregunta,
                respuesta,
                filtros,
                fecha: admin.firestore.FieldValue.serverTimestamp()
            });
            idGuardado = ref.id;
        } catch (error) {
            // No guardar en la "librería" no debe impedir que el admin
            // reciba su respuesta — solo se pierde el historial de esta
            // consulta en particular.
            logger.error("No se pudo guardar la consulta en la librería de respuestas:", error);
        }

        return { respuesta, id: idGuardado };

    }
);

module.exports = { analizarDatosUsuariosIA };
