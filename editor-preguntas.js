// ==========================================================
// EDITOR DE BANCO DE PREGUNTAS
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
// TIPOS DE PREGUNTA (Etapa 34): cada pregunta trae un campo "tipo" —
// "opcionMultiple" (por defecto, incluso si falta el campo — así las
// preguntas de ANTES de esta etapa se siguen viendo y calificando
// igual, sin ninguna migración), "vf", "completar", "ordenar" o
// "textoLibre". Ver motor.js (renderizarPreguntas/calificar) para cómo
// se presentan y califican cada uno, y esquemaPreguntas.js (Cloud
// Functions) para la forma exacta que también puede devolver la IA.
//
// Devuelve { refrescar } — quien llame a construirEditorPreguntas puede
// seguir modificando "preguntas" desde AFUERA (ej. admin-ia.js, al
// insertar las preguntas que devolvió la IA) y llamar a refrescar()
// para que el editor las vuelva a dibujar. A propósito NO se vuelve a
// llamar construirEditorPreguntas() para esto — haría que se agreguen
// un segundo juego de listeners de input/change/click sobre el mismo
// contenedor (cada clic terminaría disparando el manejador dos veces).
// ==========================================================

const TIPOS_PREGUNTA = [
    { valor: "opcionMultiple", etiqueta: "Opción múltiple" },
    { valor: "vf", etiqueta: "Verdadero o falso" },
    { valor: "completar", etiqueta: "Completar la oración" },
    { valor: "ordenar", etiqueta: "Ordenar partes" },
    { valor: "textoLibre", etiqueta: "Pregunta directa (texto corto)" }
];

// Pregunta nueva y vacía de cada tipo — se usa tanto para "+ Agregar
// pregunta" (siempre opción múltiple, mismo comportamiento de antes)
// como al cambiar el tipo de una pregunta ya existente.
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
                opciones: [
                    { texto: "", valor: "a" },
                    { texto: "", valor: "b" },
                    { texto: "", valor: "c" }
                ],
                correcta: "a"
            };

    }

}

function construirEditorPreguntas(contenedor, preguntas) {

    function tipoDe(pregunta) {
        return pregunta.tipo || "opcionMultiple";
    }

    function subeditorHtml(pregunta, pi) {

        const tipo = tipoDe(pregunta);

        if (tipo === "vf") {
            return `
                <label style="display:inline-flex; align-items:center; gap:6px; margin-right:15px;">
                    <input type="radio" name="vf-${pi}" data-accion="marcar-vf" data-pi="${pi}" value="true" ${pregunta.correcta === true ? "checked" : ""}>
                    Verdadero
                </label>
                <label style="display:inline-flex; align-items:center; gap:6px;">
                    <input type="radio" name="vf-${pi}" data-accion="marcar-vf" data-pi="${pi}" value="false" ${pregunta.correcta === false ? "checked" : ""}>
                    Falso
                </label>
            `;
        }

        if (tipo === "completar" || tipo === "textoLibre") {
            const respuestas = pregunta.respuestasValidas || [];
            return `
                ${tipo === "completar" ? `
                    <p style="font-size:12px; color:var(--texto-suave); margin:-4px 0 8px;">
                        Escribe el espacio en blanco como <code>___</code> dentro de la pregunta de arriba.
                    </p>
                ` : ""}
                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">
                    Respuesta${respuestas.length === 1 ? "" : "s"} válida${respuestas.length === 1 ? "" : "s"} (una por línea, cualquiera cuenta como correcta)
                </label>
                ${respuestas.map((resp, ri) => `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <input type="text" data-accion="texto-respuesta" data-pi="${pi}" data-ri="${ri}"
                               value="${(resp || "").replace(/"/g, "&quot;")}"
                               placeholder="Ej. río Amazonas"
                               style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                        <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-respuesta" data-pi="${pi}" data-ri="${ri}">✕</button>
                    </div>
                `).join("")}
                <button type="button" class="botonAdminChico" data-accion="agregar-respuesta" data-pi="${pi}">+ Agregar respuesta válida</button>
            `;
        }

        if (tipo === "ordenar") {
            const partes = pregunta.partes || [];
            return `
                <label style="display:block; font-size:13px; font-weight:600; margin-bottom:4px;">
                    Partes, EN EL ORDEN CORRECTO (se revuelven solas al jugar)
                </label>
                ${partes.map((parte, oi) => `
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-weight:700; color:var(--texto-suave); width:18px;">${oi + 1}.</span>
                        <input type="text" data-accion="texto-parte" data-pi="${pi}" data-oi="${oi}"
                               value="${(parte || "").replace(/"/g, "&quot;")}"
                               placeholder="Ej. Primero el sol salió por el este"
                               style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                        <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-parte" data-pi="${pi}" data-oi="${oi}">✕</button>
                    </div>
                `).join("")}
                <button type="button" class="botonAdminChico" data-accion="agregar-parte" data-pi="${pi}">+ Agregar parte</button>
            `;
        }

        // opcionMultiple (por defecto)
        const opciones = pregunta.opciones || [];
        return `
            ${opciones.map((opcion, oi) => `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <input type="radio" name="correcta-${pi}" data-accion="marcar-correcta" data-pi="${pi}" data-oi="${oi}"
                           ${pregunta.correcta === opcion.valor ? "checked" : ""}>
                    <input type="text" data-accion="texto-opcion" data-pi="${pi}" data-oi="${oi}"
                           value="${(opcion.texto || "").replace(/"/g, "&quot;")}"
                           placeholder="Texto de esta opción"
                           style="flex:1; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                    <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-opcion" data-pi="${pi}" data-oi="${oi}">✕</button>
                </div>
            `).join("")}
            <button type="button" class="botonAdminChico" data-accion="agregar-opcion" data-pi="${pi}" style="margin-top:4px;">+ Agregar opción</button>
        `;

    }

    function render() {

        contenedor.innerHTML = preguntas.map((pregunta, pi) => `
            <div style="border:1px solid var(--borde); border-radius:10px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; flex-wrap:wrap;">
                    <strong>Pregunta ${pi + 1}</strong>
                    <select data-accion="cambiar-tipo" data-pi="${pi}" style="padding:6px; border-radius:8px; border:1px solid var(--borde);">
                        ${TIPOS_PREGUNTA.map(t => `<option value="${t.valor}" ${tipoDe(pregunta) === t.valor ? "selected" : ""}>${t.etiqueta}</option>`).join("")}
                    </select>
                    <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-pregunta" data-pi="${pi}">🗑️ Quitar</button>
                </div>
                <textarea data-accion="texto-pregunta" data-pi="${pi}" rows="2"
                          placeholder="Escribe la pregunta"
                          style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--borde); margin-bottom:10px; font-family:inherit;"
                >${pregunta.pregunta || ""}</textarea>
                ${subeditorHtml(pregunta, pi)}
            </div>
        `).join("") + `<button type="button" data-accion="agregar-pregunta" style="width:100%;">+ Agregar pregunta</button>`;

    }

    contenedor.addEventListener("input", (e) => {

        const pi = Number(e.target.dataset.pi);
        const accion = e.target.dataset.accion;

        if (accion === "texto-pregunta") {
            preguntas[pi].pregunta = e.target.value;
        }

        if (accion === "texto-opcion") {
            const oi = Number(e.target.dataset.oi);
            preguntas[pi].opciones[oi].texto = e.target.value;
        }

        if (accion === "texto-respuesta") {
            const ri = Number(e.target.dataset.ri);
            preguntas[pi].respuestasValidas[ri] = e.target.value;
        }

        if (accion === "texto-parte") {
            const oi = Number(e.target.dataset.oi);
            preguntas[pi].partes[oi] = e.target.value;
        }

    });

    contenedor.addEventListener("change", (e) => {

        const pi = Number(e.target.dataset.pi);
        const accion = e.target.dataset.accion;

        if (accion === "marcar-correcta") {
            const oi = Number(e.target.dataset.oi);
            preguntas[pi].correcta = preguntas[pi].opciones[oi].valor;
        }

        if (accion === "marcar-vf") {
            preguntas[pi].correcta = e.target.value === "true";
        }

        if (accion === "cambiar-tipo") {
            const textoPreguntaActual = preguntas[pi].pregunta;
            preguntas[pi] = objetoPreguntaVacia(e.target.value);
            preguntas[pi].pregunta = textoPreguntaActual;
            render();
        }

    });

    contenedor.addEventListener("click", (e) => {

        const accion = e.target.dataset.accion;
        if (!accion) return;

        const letras = "abcdefghij";

        if (accion === "agregar-pregunta") {

            preguntas.push(objetoPreguntaVacia("opcionMultiple"));

        } else if (accion === "quitar-pregunta") {

            preguntas.splice(Number(e.target.dataset.pi), 1);

        } else if (accion === "agregar-opcion") {

            const pi = Number(e.target.dataset.pi);
            const letra = letras[preguntas[pi].opciones.length] || `x${preguntas[pi].opciones.length}`;
            preguntas[pi].opciones.push({ texto: "", valor: letra });

        } else if (accion === "quitar-opcion") {

            const pi = Number(e.target.dataset.pi);
            const oi = Number(e.target.dataset.oi);
            const eraCorrecta = preguntas[pi].opciones[oi].valor === preguntas[pi].correcta;

            preguntas[pi].opciones.splice(oi, 1);

            if (eraCorrecta && preguntas[pi].opciones[0]) {
                preguntas[pi].correcta = preguntas[pi].opciones[0].valor;
            }

        } else if (accion === "agregar-respuesta") {

            const pi = Number(e.target.dataset.pi);
            preguntas[pi].respuestasValidas.push("");

        } else if (accion === "quitar-respuesta") {

            const pi = Number(e.target.dataset.pi);
            const ri = Number(e.target.dataset.ri);
            preguntas[pi].respuestasValidas.splice(ri, 1);

        } else if (accion === "agregar-parte") {

            const pi = Number(e.target.dataset.pi);
            preguntas[pi].partes.push("");

        } else if (accion === "quitar-parte") {

            const pi = Number(e.target.dataset.pi);
            const oi = Number(e.target.dataset.oi);
            preguntas[pi].partes.splice(oi, 1);

        } else {

            return; // clic en algo sin acción (ej. una opción de texto), no re-renderizar

        }

        render();

    });

    render();

    return { refrescar: render };

}
