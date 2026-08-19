// ==========================================================
// PANEL DE ADMINISTRADOR
// ==========================================================
// Todo lo relacionado a agregar, editar y borrar lecturas (de ambos
// sistemas) vive en este único archivo. Se incluye en las 4 páginas
// que muestran o contienen lecturas: index.html, lectura.html,
// mejora.html y lectura-mejorar.html.
//
// CÓMO SE IDENTIFICA AL ADMINISTRADOR:
// Por su correo de Google. Nadie más ve estos controles, y las reglas
// de Firestore (firestore.rules) también exigen este mismo correo para
// poder escribir en las colecciones de lecturas — así que aunque
// alguien manipulara el código desde el navegador, Firestore rechazaría
// el cambio si no inició sesión con este correo exacto.
// ==========================================================

const EMAIL_ADMIN = "joserodrigo.jrqd@gmail.com";

function esAdmin() {
    return !!(auth.currentUser && auth.currentUser.email === EMAIL_ADMIN);
}


// ==========================================================
// BANCO DE PREGUNTAS: ELEGIR AL AZAR
// ==========================================================
// Dado un banco de preguntas (ej. 10) y cuántas mostrar (ej. 3),
// devuelve esa cantidad elegida al azar. Cada usuario ve una
// combinación distinta, así que es más difícil copiarse entre ellos.

function elegirPreguntasAlAzar(banco, cantidad) {

    const copia = [...(banco || [])];

    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }

    const n = Math.min(cantidad || copia.length, copia.length);
    return copia.slice(0, n);

}


// ==========================================================
// EDITOR DE BANCO DE PREGUNTAS (usado dentro de los formularios)
// ==========================================================
// "preguntas" es un arreglo que se modifica EN SITIO (mismo patrón que
// el resto del proyecto usa para no complicar el manejo de estado).

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


// ==========================================================
// FORMULARIO: CREAR / EDITAR LECTURA (sistema de premios QR)
// ==========================================================

function abrirFormularioLectura(lecturaExistente, alGuardar) {

    const esNueva = !lecturaExistente;
    const preguntas = esNueva
        ? []
        : JSON.parse(JSON.stringify(lecturaExistente.bancoPreguntas || []));

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo modalCajaAdmin">
            <h2>${esNueva ? "➕ Nueva lectura" : "✏️ Editar lectura"}</h2>
            <form id="formLecturaAdmin">

                <label>ID de la lectura</label>
                <input type="text" id="campoId" required autocomplete="off"
                       value="${esNueva ? "" : lecturaExistente.id}" ${esNueva ? "" : "readonly"}
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Título</label>
                <input type="text" id="campoTitulo" required autocomplete="off"
                       value="${esNueva ? "" : (lecturaExistente.titulo || "").replace(/"/g, "&quot;")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Nivel</label>
                <select id="campoNivel" style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">
                    <option value="facil">Fácil</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="dificil">Difícil</option>
                </select>

                <label>Tiempo de lectura en segundos</label>
                <input type="number" id="campoTiempoLectura" min="10" required
                       value="${esNueva ? 60 : lecturaExistente.tiempoLectura}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Tiempo de cuestionario en segundos</label>
                <input type="number" id="campoTiempoCuestionario" min="10" required
                       value="${esNueva ? 30 : lecturaExistente.tiempoCuestionario}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Texto</label>
                <textarea id="campoTexto" rows="10" required
                          style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde); font-family:inherit;"
                >${esNueva ? "" : (lecturaExistente.texto || []).join("\n\n")}</textarea>

                <label>Cuántas preguntas se muestran por sesión</label>
                <input type="number" id="campoPreguntasAMostrar" min="1"
                       value="${esNueva ? "" : lecturaExistente.preguntasAMostrar}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Orden dentro del catálogo</label>
                <input type="number" id="campoOrden" min="0"
                       value="${esNueva ? "" : (lecturaExistente.orden ?? "")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <h3 style="margin-top:10px;">Banco de preguntas</h3>
                <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                    Marca con el círculo cuál opción es la correcta de cada pregunta.
                </p>
                <div id="editorPreguntas"></div>

                ${esNueva ? "" : `<div id="seccionCodigosLectura" style="margin-top:20px;"></div>`}

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="submit" style="flex:1;">${esNueva ? "Crear lectura" : "Guardar cambios"}</button>
                    <button type="button" class="modalCerrar" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cancelar</button>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#campoNivel").value = esNueva ? "facil" : (lecturaExistente.nivel || "facil");

    construirEditorPreguntas(overlay.querySelector("#editorPreguntas"), preguntas);

    if (!esNueva) {
        construirSeccionCodigosLectura(overlay.querySelector("#seccionCodigosLectura"), lecturaExistente.id);
    }

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector("#formLecturaAdmin").addEventListener("submit", async (e) => {

        e.preventDefault();

        const id = overlay.querySelector("#campoId").value.trim();

        // El formato solo se exige para lecturas NUEVAS. Las que ya existen
        // conservan el ID con el que salieron los códigos QR impresos (y con
        // el que ya hay progreso de usuarios guardado), aunque tengan
        // espacios u otros caracteres de antes de que existiera este panel
        // — el ID de una lectura existente ya no se puede cambiar desde
        // aquí, para no volver a romper el progreso de nadie.
        if (esNueva) {

            if (!/^[a-z0-9-]+$/i.test(id)) {
                alert("El ID solo puede tener letras, números y guiones, sin espacios ni tildes.");
                return;
            }

            if (CATALOGO_LECTURAS.some(l => l.id === id)) {
                alert("Ya existe una lectura con ese ID. Elige otro.");
                return;
            }

        }

        if (preguntas.length === 0) {
            alert("Agrega al menos una pregunta antes de guardar.");
            return;
        }

        const texto = overlay.querySelector("#campoTexto").value
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (texto.length === 0) {
            alert("El texto de la lectura no puede estar vacío.");
            return;
        }

        const preguntasAMostrarInput = Number(overlay.querySelector("#campoPreguntasAMostrar").value) || preguntas.length;
        const ordenInput = overlay.querySelector("#campoOrden").value;

        const datos = {
            titulo: overlay.querySelector("#campoTitulo").value.trim(),
            nivel: overlay.querySelector("#campoNivel").value,
            tiempoLectura: Number(overlay.querySelector("#campoTiempoLectura").value),
            tiempoCuestionario: Number(overlay.querySelector("#campoTiempoCuestionario").value),
            texto: texto,
            bancoPreguntas: preguntas,
            preguntasAMostrar: Math.min(preguntasAMostrarInput, preguntas.length),
            orden: ordenInput !== "" ? Number(ordenInput) : CATALOGO_LECTURAS.length
        };

        try {
            await db.collection("lecturas").doc(id).set(datos);
            await cargarCatalogoLecturas(true);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar la lectura:", error);
            alert("No se pudo guardar la lectura. Intenta de nuevo.");
        }

    });

}

async function eliminarLectura(id, alEliminar) {

    if (!confirm(`¿Seguro que quieres eliminar la lectura "${id}"? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        await db.collection("lecturas").doc(id).delete();

        // Los puntos que esta lectura ya le había dado a la gente no deben
        // seguir contando en el ranking, para que no queden puntos "fantasma".
        if (typeof revertirPuntosDeLectura === "function") {
            await revertirPuntosDeLectura(id);
        }

        await cargarCatalogoLecturas(true);
        if (alEliminar) alEliminar();
    } catch (error) {
        console.error("No se pudo eliminar la lectura:", error);
        alert("No se pudo eliminar la lectura.");
    }

}


// ==========================================================
// FORMULARIO: CREAR / EDITAR LECTURA (sistema "Mejorar la lectura")
// ==========================================================

function abrirFormularioMejora(lecturaExistente, edadPorDefecto, alGuardar) {

    const esNueva = !lecturaExistente;
    const preguntas = esNueva
        ? []
        : JSON.parse(JSON.stringify(lecturaExistente.bancoPreguntas || []));

    const opcionesEdad = [];
    for (let e = RANGO_EDADES.min; e <= RANGO_EDADES.max; e++) {
        opcionesEdad.push(`<option value="${e}">${e} años</option>`);
    }
    opcionesEdad.push(`<option value="${grupoMasDelTope()}">${etiquetaEdad(grupoMasDelTope())}</option>`);

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo modalCajaAdmin">
            <h2>${esNueva ? "➕ Nueva lectura de práctica" : "✏️ Editar lectura de práctica"}</h2>
            <form id="formMejoraAdmin">

                <label>ID de la lectura</label>
                <input type="text" id="campoId" required autocomplete="off"
                       value="${esNueva ? "" : lecturaExistente.id}" ${esNueva ? "" : "readonly"}
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Título</label>
                <input type="text" id="campoTitulo" required autocomplete="off"
                       value="${esNueva ? "" : (lecturaExistente.titulo || "").replace(/"/g, "&quot;")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Edad</label>
                <select id="campoEdad" style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">
                    ${opcionesEdad.join("")}
                </select>

                <label>Texto</label>
                <textarea id="campoTexto" rows="10" required
                          style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde); font-family:inherit;"
                >${esNueva ? "" : (lecturaExistente.texto || []).join("\n\n")}</textarea>

                <label>Cuántas preguntas se muestran por sesión</label>
                <input type="number" id="campoPreguntasAMostrar" min="1"
                       value="${esNueva ? "" : lecturaExistente.preguntasAMostrar}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Orden dentro de esta edad</label>
                <input type="number" id="campoOrden" min="0"
                       value="${esNueva ? "" : (lecturaExistente.orden ?? "")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <h3 style="margin-top:10px;">Banco de preguntas</h3>
                <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                    Marca con el círculo cuál opción es la correcta de cada pregunta.
                </p>
                <div id="editorPreguntas"></div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="submit" style="flex:1;">${esNueva ? "Crear lectura" : "Guardar cambios"}</button>
                    <button type="button" class="modalCerrar" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cancelar</button>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#campoEdad").value = String(esNueva ? edadPorDefecto : lecturaExistente.edad);

    construirEditorPreguntas(overlay.querySelector("#editorPreguntas"), preguntas);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector("#formMejoraAdmin").addEventListener("submit", async (e) => {

        e.preventDefault();

        const id = overlay.querySelector("#campoId").value.trim();
        const edad = Number(overlay.querySelector("#campoEdad").value);
        const listaDeEsaEdad = CATALOGO_MEJORA[edad] || [];

        // El formato solo se exige para lecturas NUEVAS (ver misma nota
        // en abrirFormularioLectura).
        if (esNueva) {

            if (!/^[a-z0-9-]+$/i.test(id)) {
                alert("El ID solo puede tener letras, números y guiones, sin espacios ni tildes.");
                return;
            }

            if (listaDeEsaEdad.some(l => l.id === id)) {
                alert("Ya existe una lectura con ese ID. Elige otro.");
                return;
            }

        }

        if (preguntas.length === 0) {
            alert("Agrega al menos una pregunta antes de guardar.");
            return;
        }

        const texto = overlay.querySelector("#campoTexto").value
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (texto.length === 0) {
            alert("El texto de la lectura no puede estar vacío.");
            return;
        }

        const preguntasAMostrarInput = Number(overlay.querySelector("#campoPreguntasAMostrar").value) || preguntas.length;
        const ordenInput = overlay.querySelector("#campoOrden").value;

        const datos = {
            edad: edad,
            titulo: overlay.querySelector("#campoTitulo").value.trim(),
            texto: texto,
            bancoPreguntas: preguntas,
            preguntasAMostrar: Math.min(preguntasAMostrarInput, preguntas.length),
            orden: ordenInput !== "" ? Number(ordenInput) : listaDeEsaEdad.length
        };

        try {
            await db.collection("mejoraLecturas").doc(id).set(datos);
            await cargarCatalogoMejora(true);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar la lectura de práctica:", error);
            alert("No se pudo guardar la lectura. Intenta de nuevo.");
        }

    });

}

async function eliminarMejoraLectura(id, alEliminar) {

    if (!confirm(`¿Seguro que quieres eliminar la lectura "${id}"? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        await db.collection("mejoraLecturas").doc(id).delete();
        await cargarCatalogoMejora(true);
        if (alEliminar) alEliminar();
    } catch (error) {
        console.error("No se pudo eliminar la lectura de práctica:", error);
        alert("No se pudo eliminar la lectura.");
    }

}


// ==========================================================
// FORMULARIO: RANGO DE EDADES (Mejorar la lectura)
// ==========================================================

async function abrirFormularioRangoEdades(alGuardar) {

    await cargarRangoEdades();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>⚙️ Rango de edades</h2>
            <p>Define entre qué edades pueden elegir los usuarios en "Mejorar la lectura".</p>

            <label style="display:block; text-align:left; margin-top:10px;">Edad mínima</label>
            <input type="number" id="campoEdadMin" min="5" max="18" value="${RANGO_EDADES.min}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <label style="display:block; text-align:left;">Edad máxima</label>
            <input type="number" id="campoEdadMax" min="5" max="18" value="${RANGO_EDADES.max}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <button id="btnGuardarRango">Guardar</button>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:10px;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.querySelector("#btnGuardarRango").addEventListener("click", async () => {

        const min = Number(overlay.querySelector("#campoEdadMin").value);
        const max = Number(overlay.querySelector("#campoEdadMax").value);

        if (!min || !max || min > max) {
            alert("Revisa los valores: la edad mínima debe ser menor o igual a la máxima.");
            return;
        }

        try {
            await db.collection("configuracion").doc("rangoEdades").set({ min, max });
            await cargarRangoEdades(true);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar el rango de edades:", error);
            alert("No se pudo guardar el rango de edades.");
        }

    });

}


// ==========================================================
// FORMULARIO: PREMIOS POR NIVEL
// ==========================================================

async function abrirFormularioPremios(alGuardar) {

    await cargarPremioPorNivel();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>🏆 Premios por nivel</h2>
            <p>Define qué gana cada quien según el nivel de la lectura que aprobó.</p>

            <label style="display:block; text-align:left; margin-top:10px;">Fácil</label>
            <input type="text" id="campoPremioFacil" value="${(PREMIO_POR_NIVEL.facil || "").replace(/"/g, "&quot;")}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <label style="display:block; text-align:left;">Intermedio</label>
            <input type="text" id="campoPremioIntermedio" value="${(PREMIO_POR_NIVEL.intermedio || "").replace(/"/g, "&quot;")}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <label style="display:block; text-align:left;">Difícil</label>
            <input type="text" id="campoPremioDificil" value="${(PREMIO_POR_NIVEL.dificil || "").replace(/"/g, "&quot;")}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <button id="btnGuardarPremios">Guardar</button>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:10px;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.querySelector("#btnGuardarPremios").addEventListener("click", async () => {

        const facil = overlay.querySelector("#campoPremioFacil").value.trim();
        const intermedio = overlay.querySelector("#campoPremioIntermedio").value.trim();
        const dificil = overlay.querySelector("#campoPremioDificil").value.trim();

        if (!facil || !intermedio || !dificil) {
            alert("Completa los 3 premios.");
            return;
        }

        try {
            await db.collection("configuracion").doc("premios").set({ facil, intermedio, dificil });
            await cargarPremioPorNivel(true);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar los premios:", error);
            alert("No se pudo guardar los premios.");
        }

    });

}


// ==========================================================
// FORMULARIO: LISTA DE PREMIADORES
// ==========================================================

let PREMIADORES = { emails: ["joserodrigo.jrqd@gmail.com"] };
let _promesaPremiadores = null;

function cargarPremiadores(forzarRecarga) {

    if (_promesaPremiadores && !forzarRecarga) {
        return _promesaPremiadores;
    }

    _promesaPremiadores = db.collection("configuracion").doc("premiadores")
        .get()
        .then(doc => {
            if (doc.exists) PREMIADORES = doc.data();
            return PREMIADORES;
        })
        .catch(error => {
            console.error("No se pudo cargar la lista de premiadores:", error);
            return PREMIADORES;
        });

    return _promesaPremiadores;

}

async function abrirFormularioPremiadores(alGuardar) {

    await cargarPremiadores();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>🎟️ Premiadores</h2>
            <p>Correos de Google autorizados para entrar a la página de canje de premios.</p>
            <div id="listaPremiadores" style="text-align:left; margin:15px 0;"></div>
            <div style="display:flex; gap:8px;">
                <input type="email" id="campoNuevoPremiador" placeholder="correo@gmail.com"
                       style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                <button id="btnAgregarPremiador" style="width:auto; margin:0; padding:10px 16px;">+ Agregar</button>
            </div>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:15px;">Cerrar</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".modalCerrar").addEventListener("click", () => {
        overlay.remove();
        if (alGuardar) alGuardar();
    });

    function render() {

        const lista = overlay.querySelector("#listaPremiadores");
        const emails = PREMIADORES.emails || [];

        lista.innerHTML = emails.map(email => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--borde);">
                <span style="font-size:14px;">${email}</span>
                <button type="button" class="botonAdminChico botonPeligro" data-quitar="${email}">🗑️</button>
            </div>
        `).join("") || "<p style='color:var(--texto-suave); font-size:14px;'>Todavía no hay premiadores.</p>";

        lista.querySelectorAll("[data-quitar]").forEach(btn => {
            btn.addEventListener("click", async () => {
                try {
                    await db.collection("configuracion").doc("premiadores").set({
                        emails: firebase.firestore.FieldValue.arrayRemove(btn.dataset.quitar)
                    }, { merge: true });
                    await cargarPremiadores(true);
                    render();
                } catch (error) {
                    console.error("No se pudo quitar el premiador:", error);
                    alert("No se pudo quitar el premiador.");
                }
            });
        });

    }

    render();

    overlay.querySelector("#btnAgregarPremiador").addEventListener("click", async () => {

        const campo = overlay.querySelector("#campoNuevoPremiador");
        const email = campo.value.trim().toLowerCase();

        if (!email || !email.includes("@")) {
            alert("Escribe un correo válido.");
            return;
        }

        try {
            await db.collection("configuracion").doc("premiadores").set({
                emails: firebase.firestore.FieldValue.arrayUnion(email)
            }, { merge: true });
            await cargarPremiadores(true);
            campo.value = "";
            render();
        } catch (error) {
            console.error("No se pudo agregar el premiador:", error);
            alert("No se pudo agregar el premiador.");
        }

    });

}


// ==========================================================
// PANEL EN "MIS LECTURAS" (index.html)
// ==========================================================

function inicializarAdminIndex() {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedor");
    const panelExistente = document.getElementById("panelAdminIndex");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminIndex";
    panel.style.marginTop = "35px";
    panel.innerHTML = `
        <hr style="margin:30px 0; border:none; border-top:1px solid var(--borde);">
        <h2 style="text-align:center;">Panel de administrador</h2>

        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">Lecturas</h3>
            <div class="seccionAdminBotones">
                <button id="btnNuevaLectura">+ Agregar lectura nueva</button>
                ${(typeof DATOS_ORIGINALES_LECTURAS !== "undefined" && CATALOGO_LECTURAS.length === 0)
                    ? `<button id="btnMigrarDatos" style="background:#2e9e5b;">Migrar datos antiguos</button>`
                    : ""}
                <button id="btnRepararPuntos" class="botonAdminContorno">Borrar puntos de lecturas eliminadas</button>
            </div>
            <div id="listaAdminLecturas"></div>
        </div>

        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">Premios</h3>
            <div class="seccionAdminBotones">
                <button id="btnEditarPremios" class="botonAdminContorno">Editar premios</button>
                <button id="btnEditarPremiadores" class="botonAdminContorno">Editar premiadores</button>
                <a href="premiador.html" target="_blank" class="botonAdminContorno"
                   style="display:inline-block; padding:15px 25px; border-radius:12px; font-weight:600; text-decoration:none; text-align:center;">
                    Ir a Premiador
                </a>
            </div>
        </div>
    `;
    contenedor.appendChild(panel);

    document.getElementById("btnNuevaLectura").addEventListener("click", () => {
        abrirFormularioLectura(null, () => inicializarAdminIndex());
    });

    document.getElementById("btnEditarPremios").addEventListener("click", () => {
        abrirFormularioPremios(() => inicializarAdminIndex());
    });

    document.getElementById("btnEditarPremiadores").addEventListener("click", () => {
        abrirFormularioPremiadores(() => inicializarAdminIndex());
    });

    const btnMigrar = document.getElementById("btnMigrarDatos");
    if (btnMigrar) {
        btnMigrar.addEventListener("click", () => migrarDatosOriginales());
    }

    document.getElementById("btnRepararPuntos").addEventListener("click", async () => {

        if (!confirm("Esto revisa TODO el historial y le resta a cada usuario los puntos de lecturas que ya no existen en el catálogo. ¿Continuar?")) {
            return;
        }

        const btn = document.getElementById("btnRepararPuntos");
        btn.disabled = true;
        btn.textContent = "Reparando...";

        try {
            const resultado = await repararPuntosDeLecturasEliminadas();
            if (resultado.usuariosAfectados === 0) {
                alert("No había puntos huérfanos que reparar. El ranking ya estaba al día.");
            } else {
                alert(`Listo. Se corrigieron ${resultado.usuariosAfectados} usuario(s), restando ${resultado.puntosRevertidos} puntos en total.`);
            }
        } catch (error) {
            console.error("No se pudo reparar los puntos huérfanos:", error);
            alert("No se pudo completar la reparación. Revisa la consola para más detalles.");
        }

        btn.disabled = false;
        btn.textContent = "Borrar puntos de lecturas eliminadas";

    });

    renderizarListaAdminLecturas();

}

// Orden fijo en el que se muestran los desplegables de nivel, sin
// importar el orden en que las lecturas vengan del catálogo.
const ORDEN_NIVELES_ADMIN = ["facil", "intermedio", "dificil"];

function renderizarListaAdminLecturas() {

    const cont = document.getElementById("listaAdminLecturas");
    if (!cont) return;

    if (CATALOGO_LECTURAS.length === 0) {
        cont.innerHTML = "<p style='text-align:center;'>Todavía no hay lecturas en el catálogo.</p>";
        return;
    }

    const tarjetaLectura = lectura => `
        <div class="tarjetaLectura" style="cursor:default;">
            <div class="tarjetaInfo">
                <p class="tarjetaTitulo">${lectura.titulo}</p>
                <p class="tarjetaNivel">${(lectura.bancoPreguntas || []).length} preguntas en el banco (muestra ${lectura.preguntasAMostrar})</p>
            </div>
            <div style="display:flex; gap:8px;">
                <a href="lectura.html?id=${encodeURIComponent(lectura.id)}" target="_blank" class="botonAdminChico" title="Abrir">🔗</a>
                <button type="button" class="botonAdminChico" data-editar="${lectura.id}">✏️</button>
                <button type="button" class="botonAdminChico botonPeligro" data-eliminar="${lectura.id}">🗑️</button>
            </div>
        </div>
    `;

    cont.innerHTML = ORDEN_NIVELES_ADMIN.map(nivel => {

        const lecturasDelNivel = CATALOGO_LECTURAS.filter(l => l.nivel === nivel);
        if (lecturasDelNivel.length === 0) return "";

        return `
            <details class="grupoNivelAdmin">
                <summary>${NOMBRE_NIVEL[nivel] || nivel} (${lecturasDelNivel.length})</summary>
                <div class="listaAdminLecturasNivel">
                    ${lecturasDelNivel.map(tarjetaLectura).join("")}
                </div>
            </details>
        `;

    }).join("");

    cont.querySelectorAll("[data-editar]").forEach(btn => {
        btn.addEventListener("click", () => {
            const lectura = CATALOGO_LECTURAS.find(l => l.id === btn.dataset.editar);
            abrirFormularioLectura(lectura, () => inicializarAdminIndex());
        });
    });

    cont.querySelectorAll("[data-eliminar]").forEach(btn => {
        btn.addEventListener("click", () => {
            eliminarLectura(btn.dataset.eliminar, () => inicializarAdminIndex());
        });
    });

}


// ==========================================================
// CÓDIGOS DE CANJE DE UNA LECTURA (uno por golosina)
// ==========================================================
// Cada código de 8 caracteres alfanuméricos desbloquea el acceso a la
// lectura UNA sola vez en total (colección "codigosLectura", ver
// firestore.rules). Esta sección vive dentro del editor de una lectura
// existente (ver abrirFormularioLectura) y permite generar tantos
// códigos como golosinas se necesiten, mostrando el estado de cada uno.

const CARACTERES_CODIGO_LECTURA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generarCodigoLecturaAlAzar() {
    let codigo = "";
    for (let i = 0; i < 8; i++) {
        codigo += CARACTERES_CODIGO_LECTURA[Math.floor(Math.random() * CARACTERES_CODIGO_LECTURA.length)];
    }
    return codigo;
}

/**
 * Genera un código nuevo para una lectura, garantizando que no choque
 * con ninguno ya existente (reintenta unas pocas veces por si acaso).
 */
async function generarCodigoLecturaNuevo(lecturaId) {

    for (let intento = 0; intento < 5; intento++) {

        const codigo = generarCodigoLecturaAlAzar();
        const ref = db.collection("codigosLectura").doc(codigo);

        const yaExiste = (await ref.get()).exists;
        if (yaExiste) continue;

        await ref.set({
            lecturaId: lecturaId,
            usado: false,
            usadoPor: null,
            usadoEn: null,
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });

        return codigo;

    }

    throw new Error("No se pudo generar un código único. Intenta de nuevo.");

}

/**
 * Arma, dentro de "contenedor", el botón "🔑 Generar código" y la lista
 * de todos los códigos ya generados para "lecturaId" (con su estado y
 * quién lo usó, si aplica).
 */
function construirSeccionCodigosLectura(contenedor, lecturaId) {

    contenedor.innerHTML = `
        <h3 style="margin-top:10px;">Códigos de canje</h3>
        <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
            Cada código de 8 caracteres desbloquea esta lectura una sola vez. Genera uno por cada golosina.
        </p>
        <button type="button" id="btnGenerarCodigoLectura">🔑 Generar código</button>
        <div id="listaCodigosLectura" style="text-align:left; margin-top:10px;"></div>
    `;

    const listaEl = contenedor.querySelector("#listaCodigosLectura");

    async function render() {

        listaEl.innerHTML = "<p style='text-align:center;'>Cargando códigos...</p>";

        let codigos = [];
        try {
            const snapshot = await db.collection("codigosLectura")
                .where("lecturaId", "==", lecturaId)
                .get();
            codigos = snapshot.docs.map(doc => ({ codigo: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("No se pudieron cargar los códigos:", error);
            listaEl.innerHTML = "<p style='text-align:center;'>No se pudieron cargar los códigos.</p>";
            return;
        }

        if (codigos.length === 0) {
            listaEl.innerHTML = "<p style='text-align:center;'>Todavía no hay códigos generados para esta lectura.</p>";
            return;
        }

        // Los disponibles primero, los usados al final
        codigos.sort((a, b) => (a.usado === b.usado) ? 0 : (a.usado ? 1 : -1));

        // Trae el nombre de quien usó cada código, sin repetir consultas
        const uidsAConsultar = [...new Set(
            codigos.filter(c => c.usado && c.usadoPor).map(c => c.usadoPor)
        )];
        const nombresPorUid = {};
        await Promise.all(uidsAConsultar.map(async uid => {
            try {
                const doc = await db.collection("usuarios").doc(uid).get();
                nombresPorUid[uid] = doc.exists ? (doc.data().nombre || uid) : uid;
            } catch (error) {
                nombresPorUid[uid] = uid;
            }
        }));

        listaEl.innerHTML = codigos.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--borde); gap:10px;">
                <span style="font-family:monospace; font-weight:700; letter-spacing:1px;">${c.codigo}</span>
                <span style="font-size:13px; text-align:right; color:var(--texto-suave);">
                    ${c.usado
                        ? `✅ Usado por ${nombresPorUid[c.usadoPor] || "alguien"}`
                        : `🟢 Disponible`}
                </span>
            </div>
        `).join("");

    }

    contenedor.querySelector("#btnGenerarCodigoLectura").addEventListener("click", async () => {

        const btn = contenedor.querySelector("#btnGenerarCodigoLectura");
        btn.disabled = true;
        btn.textContent = "Generando...";

        try {
            await generarCodigoLecturaNuevo(lecturaId);
            await render();
        } catch (error) {
            console.error("No se pudo generar el código:", error);
            alert("No se pudo generar el código. Intenta de nuevo.");
        }

        btn.disabled = false;
        btn.textContent = "🔑 Generar código";

    });

    render();

}


// ==========================================================
// PANEL EN "MEJORAR LA LECTURA" (mejora.html)
// ==========================================================

function inicializarAdminMejora(edadActual) {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedor");
    const panelExistente = document.getElementById("panelAdminMejora");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminMejora";
    panel.style.marginTop = "35px";
    panel.innerHTML = `
        <hr style="margin:30px 0; border:none; border-top:1px solid var(--borde);">
        <h2 style="text-align:center;">🔧 Panel de administrador</h2>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:15px 0;">
            <button id="btnNuevaMejora" style="max-width:260px;">+ Agregar lectura — ${etiquetaEdad(edadActual)}</button>
            <button id="btnEditarRango" style="max-width:260px; background:white; color:var(--azul); border:2px solid var(--azul);">⚙️ Editar rango de edades</button>
        </div>
        <div id="listaAdminMejora"></div>
    `;
    contenedor.appendChild(panel);

    document.getElementById("btnNuevaMejora").addEventListener("click", () => {
        abrirFormularioMejora(null, edadActual, () => inicializarAdminMejora(edadActual));
    });

    document.getElementById("btnEditarRango").addEventListener("click", () => {
        abrirFormularioRangoEdades(() => inicializarAdminMejora(edadActual));
    });

    renderizarListaAdminMejora(edadActual);

}

function renderizarListaAdminMejora(edadActual) {

    const cont = document.getElementById("listaAdminMejora");
    if (!cont) return;

    const lista = CATALOGO_MEJORA[edadActual] || [];

    cont.innerHTML = lista.map(lectura => `
        <div class="tarjetaLectura" style="cursor:default;">
            <div class="tarjetaInfo">
                <p class="tarjetaTitulo">${lectura.titulo}</p>
                <p class="tarjetaNivel">${(lectura.bancoPreguntas || []).length} preguntas en el banco (muestra ${lectura.preguntasAMostrar})</p>
            </div>
            <div style="display:flex; gap:8px;">
                <a href="lectura-mejorar.html?id=${encodeURIComponent(lectura.id)}" target="_blank" class="botonAdminChico" title="Abrir">🔗</a>
                <button type="button" class="botonAdminChico" data-editar="${lectura.id}">✏️</button>
                <button type="button" class="botonAdminChico botonPeligro" data-eliminar="${lectura.id}">🗑️</button>
            </div>
        </div>
    `).join("") || "<p style='text-align:center;'>Todavía no hay lecturas para esta edad.</p>";

    cont.querySelectorAll("[data-editar]").forEach(btn => {
        btn.addEventListener("click", () => {
            const lectura = lista.find(l => l.id === btn.dataset.editar);
            abrirFormularioMejora(lectura, edadActual, () => inicializarAdminMejora(edadActual));
        });
    });

    cont.querySelectorAll("[data-eliminar]").forEach(btn => {
        btn.addEventListener("click", () => {
            eliminarMejoraLectura(btn.dataset.eliminar, () => inicializarAdminMejora(edadActual));
        });
    });

}


// ==========================================================
// BOTÓN "EDITAR ESTA LECTURA" DENTRO DE lectura.html / lectura-mejorar.html
// ==========================================================

function mostrarBotonEditarLectura(lectura) {

    if (!esAdmin()) return;
    if (document.getElementById("btnEditarLecturaAdmin")) return;

    const btn = document.createElement("button");
    btn.id = "btnEditarLecturaAdmin";
    btn.type = "button";
    btn.textContent = "✏️ Editar esta lectura";
    btn.style.cssText = "max-width:280px; margin:10px auto; display:block; background:white; color:var(--azul); border:2px solid var(--azul);";
    btn.addEventListener("click", () => {
        abrirFormularioLectura(lectura, () => location.reload());
    });

    const titulo = document.getElementById("tituloLectura");
    if (titulo) titulo.insertAdjacentElement("afterend", btn);

}

function mostrarBotonEditarMejora(lectura) {

    if (!esAdmin()) return;
    if (document.getElementById("btnEditarLecturaAdmin")) return;

    const btn = document.createElement("button");
    btn.id = "btnEditarLecturaAdmin";
    btn.type = "button";
    btn.textContent = "✏️ Editar esta lectura";
    btn.style.cssText = "max-width:280px; margin:10px auto; display:block; background:white; color:var(--azul); border:2px solid var(--azul);";
    btn.addEventListener("click", () => {
        abrirFormularioMejora(lectura, lectura.edad, () => location.reload());
    });

    const titulo = document.getElementById("tituloLecturaMejora");
    if (titulo) titulo.insertAdjacentElement("afterend", btn);

}
