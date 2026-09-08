// ==========================================================
// EDITOR DE BANCO DE PREGUNTAS (Etapa 36)
// ==========================================================
// Compartido por el panel de administrador (admin.js, al crear/editar
// una lectura de premios o de Mejorar la lectura) y por "Ser el
// protagonista de la historia" (protagonista.js, donde el propio
// usuario escribe las preguntas de su propuesta) — es autocontenido,
// sin nada admin-only adentro, así que vive en su propio archivo.
//
// "preguntas" es un arreglo que se modifica EN SITIO (mismo patrón que
// el resto del proyecto usa para no complicar el manejo de estado).
//
// BANCO MULTITIPO: el banco trae preguntas de los CINCO tipos a la vez
// (la IA genera N de cada uno según el nivel, ver cantidadPreguntas.js
// en las Cloud Functions). Como ahora son muchas, se muestran en
// desplegables de tres niveles, TODOS CERRADOS por defecto:
//   1. un <details> por tipo, con cuántas hay de ese tipo
//   2. dentro, un <details> por pregunta, con su enunciado
//   3. dentro, las respuestas / opciones / banco de respuestas
//
// BANCO DE RESPUESTAS por pregunta:
//   - opción múltiple: 1 respuesta correcta + varios distractores; al
//     jugar se arman las opciones al azar (ver
//     armarOpcionesOpcionMultiple en admin-comun.js).
//   - completar / pregunta directa: varias respuestas válidas.
//   - verdadero/falso y ordenar: respuesta única, sin banco.
//
// Devuelve { refrescar } — quien llame a construirEditorPreguntas puede
// seguir modificando "preguntas" desde AFUERA (ej. admin-ia.js, al
// insertar las preguntas que devolvió la IA) y llamar a refrescar()
// para que el editor las vuelva a dibujar. A propósito NO se vuelve a
// llamar construirEditorPreguntas() para esto — haría que se agreguen
// un segundo juego de listeners sobre el mismo contenedor (cada clic
// terminaría disparando el manejador dos veces).
// ==========================================================

const TIPOS_PREGUNTA = [
    { valor: "opcionMultiple", etiqueta: "Opción múltiple", plural: "Preguntas de opción múltiple" },
    { valor: "vf", etiqueta: "Verdadero o falso", plural: "Preguntas de verdadero o falso" },
    { valor: "completar", etiqueta: "Completar la oración", plural: "Preguntas de completar la oración" },
    { valor: "ordenar", etiqueta: "Ordenar partes", plural: "Preguntas de ordenar partes" },
    { valor: "textoLibre", etiqueta: "Pregunta directa", plural: "Preguntas directas" }
];

const DISTRACTORES_POR_DEFECTO = 6;

function tipoDePregunta(pregunta) {
    return pregunta.tipo || "opcionMultiple";
}

// Pregunta nueva y vacía de cada tipo.
function objetoPreguntaVacia(tipo) {

    switch (tipo) {

        case "vf":
            return { tipo: "vf", pregunta: "", correcta: true };

        case "completar":
            return { tipo: "completar", pregunta: "", respuestasValidas: [""] };

        case "ordenar":
            return { tipo: "ordenar", pregunta: "", partes: ["", "", ""] };

        case "textoLibre":
            return { tipo: "textoLibre", pregunta: "", respuestasValidas: [""] };

        case "opcionMultiple":
        default:
            return {
                tipo: "opcionMultiple",
                pregunta: "",
                respuestaCorrecta: "",
                distractores: new Array(DISTRACTORES_POR_DEFECTO).fill("")
            };

    }

}

/**
 * Pasa una pregunta del formato VIEJO de opción múltiple (opciones
 * fijas + "correcta" con el valor de una de ellas) al nuevo (respuesta
 * correcta + banco de distractores). Se hace en memoria al abrir el
 * editor: una lectura vieja que se vuelva a guardar queda ya migrada,
 * y una que nunca se edite se sigue jugando igual (ver
 * armarOpcionesOpcionMultiple en admin-comun.js, que respeta ambos).
 */
function migrarOpcionMultipleSiHaceFalta(pregunta) {

    if (tipoDePregunta(pregunta) !== "opcionMultiple") return pregunta;
    if (!Array.isArray(pregunta.opciones) || pregunta.respuestaCorrecta) return pregunta;

    const correcta = pregunta.opciones.find(o => o.valor === pregunta.correcta);

    return {
        tipo: "opcionMultiple",
        pregunta: pregunta.pregunta || "",
        respuestaCorrecta: correcta ? correcta.texto : "",
        distractores: pregunta.opciones
            .filter(o => !correcta || o.valor !== correcta.valor)
            .map(o => o.texto)
    };

}

/**
 * Copia del banco lista para guardar en Firestore: sin los campos
 * internos del editor/motor (los que empiezan con "_", ej. la clave de
 * los desplegables o el orden barajado de una pregunta de ordenar) y
 * sin respuestas/distractores/partes vacías.
 */
function limpiarPreguntasParaGuardar(preguntas) {

    return (preguntas || []).map(pregunta => {

        const limpia = {};

        Object.keys(pregunta).forEach(clave => {
            if (!clave.startsWith("_")) limpia[clave] = pregunta[clave];
        });

        if (Array.isArray(limpia.distractores)) {
            limpia.distractores = limpia.distractores.map(d => String(d || "").trim()).filter(d => d);
        }
        if (Array.isArray(limpia.respuestasValidas)) {
            limpia.respuestasValidas = limpia.respuestasValidas.map(r => String(r || "").trim()).filter(r => r);
        }
        if (Array.isArray(limpia.partes)) {
            limpia.partes = limpia.partes.map(p => String(p || "").trim()).filter(p => p);
        }

        return limpia;

    });

}

function construirEditorPreguntas(contenedor, preguntas) {

    const esc = (s) => String(s == null ? "" : s).replace(/"/g, "&quot;");

    // Migra en memoria las de formato viejo la primera vez que se dibuja.
    preguntas.forEach((pregunta, i) => {
        preguntas[i] = migrarOpcionMultipleSiHaceFalta(pregunta);
    });

    // ---- Nivel 3: el cuerpo editable de UNA pregunta ----
    function cuerpoPregunta(pregunta, pi) {

        const tipo = tipoDePregunta(pregunta);

        const textoEnunciado = `
            <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Enunciado</label>
            <textarea data-accion="texto-pregunta" data-pi="${pi}" rows="2"
                      placeholder="${tipo === "completar" ? "Usa ___ donde va el espacio en blanco" : "Escribe la pregunta"}"
                      style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--borde); margin-bottom:10px; font-family:inherit;"
            >${pregunta.pregunta || ""}</textarea>
        `;

        let especifico = "";

        if (tipo === "vf") {

            especifico = `
                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Respuesta correcta</label>
                <label style="display:inline-flex; align-items:center; gap:6px; margin-right:15px;">
                    <input type="radio" name="vf-${pi}" data-accion="marcar-vf" data-pi="${pi}" value="true" ${pregunta.correcta === true ? "checked" : ""}>
                    Verdadero
                </label>
                <label style="display:inline-flex; align-items:center; gap:6px;">
                    <input type="radio" name="vf-${pi}" data-accion="marcar-vf" data-pi="${pi}" value="false" ${pregunta.correcta === false ? "checked" : ""}>
                    Falso
                </label>
            `;

        } else if (tipo === "completar" || tipo === "textoLibre") {

            const respuestas = pregunta.respuestasValidas || [];
            especifico = `
                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">
                    Banco de respuestas válidas (cualquiera cuenta como correcta)
                </label>
                <p style="font-size:12px; color:var(--texto-suave); margin:0 0 8px;">
                    Se comparan sin importar mayúsculas ni tildes. Agrega variantes: con y sin artículo, singular/plural, sinónimos.
                </p>
                ${respuestas.map((resp, ri) => `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <input type="text" data-accion="texto-respuesta" data-pi="${pi}" data-ri="${ri}"
                               value="${esc(resp)}" placeholder="Ej. río Amazonas"
                               style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                        <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-respuesta" data-pi="${pi}" data-ri="${ri}">✕</button>
                    </div>
                `).join("")}
                <button type="button" class="botonAdminChico" data-accion="agregar-respuesta" data-pi="${pi}">+ Agregar respuesta válida</button>
            `;

        } else if (tipo === "ordenar") {

            const partes = pregunta.partes || [];
            especifico = `
                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">
                    Partes, EN EL ORDEN CORRECTO (se revuelven solas al jugar)
                </label>
                ${partes.map((parte, oi) => `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-weight:700; color:var(--texto-suave); width:18px;">${oi + 1}.</span>
                        <input type="text" data-accion="texto-parte" data-pi="${pi}" data-oi="${oi}"
                               value="${esc(parte)}" placeholder="Ej. Primero el sol salió por el este"
                               style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                        <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-parte" data-pi="${pi}" data-oi="${oi}">✕</button>
                    </div>
                `).join("")}
                <button type="button" class="botonAdminChico" data-accion="agregar-parte" data-pi="${pi}">+ Agregar parte</button>
            `;

        } else {

            const distractores = pregunta.distractores || [];
            especifico = `
                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">Respuesta correcta</label>
                <input type="text" data-accion="texto-correcta" data-pi="${pi}"
                       value="${esc(pregunta.respuestaCorrecta)}" placeholder="La opción correcta"
                       style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--borde); margin-bottom:12px;">

                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">
                    Banco de distractores (opciones incorrectas)
                </label>
                <p style="font-size:12px; color:var(--texto-suave); margin:0 0 8px;">
                    Al jugar se muestran la correcta + 3 de estos al azar, así no todos ven las mismas opciones.
                </p>
                ${distractores.map((distractor, di) => `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <input type="text" data-accion="texto-distractor" data-pi="${pi}" data-di="${di}"
                               value="${esc(distractor)}" placeholder="Una opción incorrecta pero creíble"
                               style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                        <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-distractor" data-pi="${pi}" data-di="${di}">✕</button>
                    </div>
                `).join("")}
                <button type="button" class="botonAdminChico" data-accion="agregar-distractor" data-pi="${pi}">+ Agregar distractor</button>
            `;

        }

        return `
            ${textoEnunciado}
            ${especifico}
            <div style="margin-top:12px; text-align:right;">
                <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-pregunta" data-pi="${pi}">🗑️ Quitar esta pregunta</button>
            </div>
        `;

    }

    // ---- Nivel 2: una pregunta, colapsada, dentro de su tipo ----
    function detallePregunta(pregunta, pi, numeroEnTipo) {

        const enunciado = (pregunta.pregunta || "").trim();
        const resumen = enunciado
            ? (enunciado.length > 70 ? enunciado.slice(0, 70) + "…" : enunciado)
            : "(sin enunciado todavía)";

        return `
            <details data-clave="p-${pi}" class="grupoNivelAdmin" style="margin-bottom:8px;">
                <summary style="cursor:pointer;">
                    ${numeroEnTipo}. <span style="font-weight:400;">${resumen}</span>
                </summary>
                <div style="padding:12px 4px 4px;">
                    ${cuerpoPregunta(pregunta, pi)}
                </div>
            </details>
        `;

    }

    // ---- Nivel 1: un desplegable por tipo ----
    function render() {

        // Qué desplegables estaban abiertos, para no cerrarlos todos
        // cada vez que se agrega o quita algo.
        const abiertos = new Set(
            [...contenedor.querySelectorAll("details[data-clave]")]
                .filter(d => d.open)
                .map(d => d.dataset.clave)
        );

        contenedor.innerHTML = TIPOS_PREGUNTA.map(tipo => {

            // Índice GLOBAL en "preguntas" (no el de dentro del grupo):
            // es el que usan todos los data-pi de los controles.
            const delTipo = preguntas
                .map((pregunta, pi) => ({ pregunta, pi }))
                .filter(({ pregunta }) => tipoDePregunta(pregunta) === tipo.valor);

            return `
                <details data-clave="t-${tipo.valor}" class="grupoNivelAdmin" style="margin-bottom:10px;">
                    <summary style="cursor:pointer; font-weight:600;">
                        ${tipo.plural} (${delTipo.length})
                    </summary>
                    <div style="padding:10px 4px 4px;">
                        ${delTipo.map(({ pregunta, pi }, i) => detallePregunta(pregunta, pi, i + 1)).join("")
                            || `<p style="color:var(--texto-suave); font-size:13px; margin:0 0 10px;">Todavía no hay preguntas de este tipo.</p>`}
                        <button type="button" class="botonAdminChico" data-accion="agregar-pregunta-tipo" data-tipo="${tipo.valor}">
                            + Agregar pregunta de este tipo
                        </button>
                    </div>
                </details>
            `;

        }).join("");

        contenedor.querySelectorAll("details[data-clave]").forEach(d => {
            if (abiertos.has(d.dataset.clave)) d.open = true;
        });

    }

    contenedor.addEventListener("input", (e) => {

        const pi = Number(e.target.dataset.pi);
        const accion = e.target.dataset.accion;
        if (!accion || Number.isNaN(pi) || !preguntas[pi]) return;

        if (accion === "texto-pregunta") {
            preguntas[pi].pregunta = e.target.value;
        }

        if (accion === "texto-correcta") {
            preguntas[pi].respuestaCorrecta = e.target.value;
        }

        if (accion === "texto-distractor") {
            preguntas[pi].distractores[Number(e.target.dataset.di)] = e.target.value;
        }

        if (accion === "texto-respuesta") {
            preguntas[pi].respuestasValidas[Number(e.target.dataset.ri)] = e.target.value;
        }

        if (accion === "texto-parte") {
            preguntas[pi].partes[Number(e.target.dataset.oi)] = e.target.value;
        }

    });

    contenedor.addEventListener("change", (e) => {

        if (e.target.dataset.accion !== "marcar-vf") return;

        const pi = Number(e.target.dataset.pi);
        if (!preguntas[pi]) return;

        preguntas[pi].correcta = e.target.value === "true";

    });

    contenedor.addEventListener("click", (e) => {

        const boton = e.target.closest("[data-accion]");
        if (!boton || !contenedor.contains(boton)) return;

        const accion = boton.dataset.accion;
        const pi = Number(boton.dataset.pi);

        if (accion === "agregar-pregunta-tipo") {

            preguntas.push(objetoPreguntaVacia(boton.dataset.tipo));

        } else if (accion === "quitar-pregunta") {

            preguntas.splice(pi, 1);

        } else if (accion === "agregar-distractor") {

            preguntas[pi].distractores.push("");

        } else if (accion === "quitar-distractor") {

            preguntas[pi].distractores.splice(Number(boton.dataset.di), 1);

        } else if (accion === "agregar-respuesta") {

            preguntas[pi].respuestasValidas.push("");

        } else if (accion === "quitar-respuesta") {

            preguntas[pi].respuestasValidas.splice(Number(boton.dataset.ri), 1);

        } else if (accion === "agregar-parte") {

            preguntas[pi].partes.push("");

        } else if (accion === "quitar-parte") {

            preguntas[pi].partes.splice(Number(boton.dataset.oi), 1);

        } else {

            return; // clic en un campo de texto u otra cosa sin acción

        }

        render();

    });

    render();

    return { refrescar: render };

}
