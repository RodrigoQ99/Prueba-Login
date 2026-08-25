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
// ==========================================================

function construirEditorPreguntas(contenedor, preguntas) {

    function render() {

        contenedor.innerHTML = preguntas.map((pregunta, pi) => `
            <div style="border:1px solid var(--borde); border-radius:10px; padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong>Pregunta ${pi + 1}</strong>
                    <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-pregunta" data-pi="${pi}">🗑️ Quitar</button>
                </div>
                <textarea data-accion="texto-pregunta" data-pi="${pi}" rows="2"
                          placeholder="Escribe la pregunta"
                          style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--borde); margin-bottom:10px; font-family:inherit;"
                >${pregunta.pregunta || ""}</textarea>
                ${pregunta.opciones.map((opcion, oi) => `
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
            </div>
        `).join("") + `<button type="button" data-accion="agregar-pregunta" style="width:100%;">+ Agregar pregunta</button>`;

    }

    contenedor.addEventListener("input", (e) => {

        const pi = Number(e.target.dataset.pi);

        if (e.target.dataset.accion === "texto-pregunta") {
            preguntas[pi].pregunta = e.target.value;
        }

        if (e.target.dataset.accion === "texto-opcion") {
            const oi = Number(e.target.dataset.oi);
            preguntas[pi].opciones[oi].texto = e.target.value;
        }

    });

    contenedor.addEventListener("change", (e) => {

        if (e.target.dataset.accion === "marcar-correcta") {
            const pi = Number(e.target.dataset.pi);
            const oi = Number(e.target.dataset.oi);
            preguntas[pi].correcta = preguntas[pi].opciones[oi].valor;
        }

    });

    contenedor.addEventListener("click", (e) => {

        const accion = e.target.dataset.accion;
        if (!accion) return;

        const letras = "abcdefghij";

        if (accion === "agregar-pregunta") {

            preguntas.push({
                pregunta: "",
                opciones: [
                    { texto: "", valor: "a" },
                    { texto: "", valor: "b" },
                    { texto: "", valor: "c" }
                ],
                correcta: "a"
            });

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

        } else {

            return; // clic en algo sin acción (ej. una opción de texto), no re-renderizar

        }

        render();

    });

    render();

}
