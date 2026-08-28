// ==========================================================
// PANEL DE ADMINISTRADOR
// ==========================================================
// Todo lo relacionado a agregar, editar y borrar lecturas (de ambos
// sistemas), Hilos del día y palabras de Ahorcado, y el resto de la
// configuración (premios, premiadores, administradores, meta de El
// premio gordo, géneros de lectura) vive en este único archivo. Se
// incluye SOLO en admin-panel.html — el portal de administrador,
// separado del sitio de participantes (mismo patrón que premiador.html:
// login propio, sin auth.js/menu.js). Depende de construirEditorPreguntas
// (ver editor-preguntas.js).
//
// CÓMO SE IDENTIFICA AL ADMINISTRADOR:
// esAdmin() (ver admin-comun.js) revisa si el correo de Google del
// usuario actual está en la colección "administradores" de Firestore.
// Nadie más ve estos controles, y las reglas de Firestore
// (firestore.rules) también exigen esa misma membresía para poder
// escribir en las colecciones de lecturas — así que aunque alguien
// manipulara el código desde el navegador, Firestore rechazaría el
// cambio si su correo no está en esa colección.
// ==========================================================


// elegirPreguntasAlAzar() ya no vive aquí — se movió a admin-comun.js,
// que SÍ se carga en lectura.html/lectura-mejorar.html (este archivo,
// admin.js, no).


// ==========================================================
// BOTÓN "GENERAR PREGUNTAS CON IA" (compartido por el formulario de
// lectura de premios y el de Mejorar la lectura — Etapa 20)
// ==========================================================
// generarPreguntasConIA() vive en admin-ia.js, EXCLUSIVO de
// admin-lecturas.html y admin-mejora.html (nunca se carga en páginas de
// participantes). Si el botón no existe en el overlay, o
// generarPreguntasConIA no está definida (página que no cargó
// admin-ia.js), esta función simplemente no hace nada — así
// abrirFormularioLectura/abrirFormularioMejora la pueden llamar siempre
// sin preguntarse en qué página están.
//
// "editorPreguntas" es el objeto { refrescar } que devuelve
// construirEditorPreguntas() — se usa para redibujar el banco después
// de insertar las preguntas que devolvió la IA, sin volver a llamar a
// construirEditorPreguntas() (eso duplicaría los listeners de
// input/change/click sobre el mismo contenedor).
function activarBotonGenerarPreguntasIA(overlay, { campoTexto, editorPreguntas, preguntas, contexto }) {

    const btn = overlay.querySelector("#btnGenerarPreguntasIA");
    if (!btn || typeof generarPreguntasConIA !== "function") return;

    const estado = overlay.querySelector("#estadoGenerarPreguntasIA");

    function actualizarVisibilidad() {
        btn.style.display = campoTexto.value.trim() ? "block" : "none";
    }

    actualizarVisibilidad();
    campoTexto.addEventListener("input", actualizarVisibilidad);

    btn.addEventListener("click", async () => {

        const texto = campoTexto.value
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (texto.length === 0) {
            alert("Escribe el texto de la lectura antes de generar preguntas.");
            return;
        }

        // Nunca se descarta trabajo ya escrito sin confirmar primero.
        if (preguntas.length > 0) {
            const reemplazar = confirm(
                `Ya hay ${preguntas.length} pregunta(s) en el banco. ¿Reemplazarlas por las que genere la IA?\n\n` +
                `Cancelar = conservarlas y agregar las nuevas al final.`
            );
            if (reemplazar) preguntas.length = 0;
        }

        btn.disabled = true;
        btn.textContent = "🤖 Generando preguntas... (puede tardar unos segundos)";
        estado.style.display = "none";

        try {

            const generadas = await generarPreguntasConIA({ texto, ...contexto() });

            if (!generadas || generadas.length === 0) {
                throw new Error("La IA no devolvió ninguna pregunta.");
            }

            preguntas.push(...generadas);
            editorPreguntas.refrescar();

            estado.textContent = `✅ Se generaron ${generadas.length} pregunta(s) — revísalas, ajústalas o bórralas antes de guardar.`;
            estado.style.color = "#2e9e5b";
            estado.style.display = "block";

        } catch (error) {

            console.error("No se pudo generar preguntas con IA:", error);
            estado.textContent = "❌ No se pudo generar las preguntas con IA. Puedes seguir escribiéndolas a mano. " +
                (error && error.message ? `(${error.message})` : "");
            estado.style.color = "#c0392b";
            estado.style.display = "block";

        }

        btn.disabled = false;
        btn.textContent = "🤖 Generar preguntas con IA";

    });

}


// ==========================================================
// SUBIR UN DOCUMENTO PARA LLENAR EL FORMULARIO (Etapa 22)
// ==========================================================
// Mismo criterio de disponibilidad que activarBotonGenerarPreguntasIA:
// si extraerLecturaDeDocumentoConIA (admin-ia.js) no existe en esta
// página, no hace nada. Llena TÍTULO + TEXTO + BANCO DE PREGUNTAS de
// una — a diferencia del botón de solo-preguntas, aquí si ya hay algo
// escrito se confirma UNA vez antes de reemplazar todo (no solo las
// preguntas), porque el documento trae también título y texto.
function activarBotonSubirDocumento(overlay, { campoTitulo, campoTexto, editorPreguntas, preguntas, contexto }) {

    const campoArchivo = overlay.querySelector("#campoSubirDocumento");
    if (!campoArchivo || typeof extraerLecturaDeDocumentoConIA !== "function") return;

    const estado = overlay.querySelector("#estadoSubirDocumento");

    campoArchivo.addEventListener("change", async () => {

        const archivo = campoArchivo.files[0];
        if (!archivo) return;

        const yaHayContenido = campoTitulo.value.trim() || campoTexto.value.trim() || preguntas.length > 0;
        if (yaHayContenido && !confirm(
            "Esto va a reemplazar el título, el texto y las preguntas que ya tengas en este formulario, con lo que se extraiga del documento. ¿Continuar?"
        )) {
            campoArchivo.value = "";
            return;
        }

        campoArchivo.disabled = true;
        estado.textContent = "📄 Leyendo el documento y armando el formulario... (puede tardar un poco más que solo generar preguntas)";
        estado.style.color = "var(--texto-suave)";
        estado.style.display = "block";

        try {

            const resultado = await extraerLecturaDeDocumentoConIA({ archivo, ...contexto() });

            campoTitulo.value = resultado.titulo;
            campoTexto.value = resultado.texto.join("\n\n");
            // El botón de "Generar preguntas con IA" decide si mostrarse
            // según el contenido de campoTexto — como se llenó a mano
            // (sin pasar por el input real del usuario), hay que avisarle.
            campoTexto.dispatchEvent(new Event("input"));

            preguntas.length = 0;
            preguntas.push(...resultado.preguntas);
            editorPreguntas.refrescar();

            estado.textContent = `✅ Se armó el formulario a partir de "${archivo.name}" — revísalo con calma antes de guardar.`;
            estado.style.color = "#2e9e5b";

        } catch (error) {

            console.error("No se pudo leer el documento con IA:", error);
            estado.textContent = "❌ No se pudo leer ese documento. Puedes seguir llenando el formulario a mano. " +
                (error && error.message ? `(${error.message})` : "");
            estado.style.color = "#c0392b";

        }

        campoArchivo.disabled = false;
        campoArchivo.value = "";

    });

}


// ==========================================================
// FORMULARIO: CREAR / EDITAR LECTURA (sistema de premios QR)
// ==========================================================
// Usa construirEditorPreguntas (ver editor-preguntas.js).

function abrirFormularioLectura(lecturaExistente, alGuardar) {

    // "esNueva" depende de si YA TIENE ID, no de si el objeto vino vacío:
    // así, "Ser el protagonista de la historia" (ver protagonista.js /
    // admin-panel.js) puede pasar título/texto/preguntas de una propuesta
    // PRE-RELLENADOS sin ID (el ID lo asigna el admin al publicar, nunca
    // el usuario) y el formulario los trata igual que "nueva lectura".
    const esNueva = !lecturaExistente || !lecturaExistente.id;
    const preguntas = (lecturaExistente && lecturaExistente.bancoPreguntas)
        ? JSON.parse(JSON.stringify(lecturaExistente.bancoPreguntas))
        : [];

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo modalCajaAdmin">
            <h2>${esNueva ? "➕ Nueva lectura" : "✏️ Editar lectura"}</h2>
            <form id="formLecturaAdmin">

                <div style="padding:12px; border:1px dashed var(--borde); border-radius:10px; margin-bottom:15px;">
                    <label style="font-weight:600;">📄 O sube un documento (PDF, Word o texto) para llenar esto automáticamente</label>
                    <input type="file" id="campoSubirDocumento" accept=".pdf,.docx,.txt" style="display:block; margin-top:8px;">
                    <p id="estadoSubirDocumento" style="display:none; font-size:13px; margin:8px 0 0;"></p>
                </div>

                <label>ID de la lectura</label>
                <input type="text" id="campoId" required autocomplete="off"
                       value="${(lecturaExistente && lecturaExistente.id) || ""}" ${esNueva ? "" : "readonly"}
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Título</label>
                <input type="text" id="campoTitulo" required autocomplete="off"
                       value="${((lecturaExistente && lecturaExistente.titulo) || "").replace(/"/g, "&quot;")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Nivel</label>
                <select id="campoNivel" style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">
                    <option value="facil">Fácil</option>
                    <option value="intermedio">Intermedio</option>
                    <option value="dificil">Difícil</option>
                </select>

                <label>Tiempo de lectura en segundos</label>
                <input type="number" id="campoTiempoLectura" min="10" required
                       value="${(lecturaExistente && lecturaExistente.tiempoLectura) || 60}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Tiempo de cuestionario en segundos</label>
                <input type="number" id="campoTiempoCuestionario" min="10" required
                       value="${(lecturaExistente && lecturaExistente.tiempoCuestionario) || 30}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Texto</label>
                <textarea id="campoTexto" rows="10" required
                          style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde); font-family:inherit;"
                >${((lecturaExistente && lecturaExistente.texto) || []).join("\n\n")}</textarea>

                <label>Cuántas preguntas se muestran por sesión</label>
                <input type="number" id="campoPreguntasAMostrar" min="1"
                       value="${(lecturaExistente && lecturaExistente.preguntasAMostrar) || ""}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <h3 style="margin-top:10px;">Banco de preguntas</h3>
                <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                    Marca con el círculo cuál opción es la correcta de cada pregunta.
                </p>
                <button type="button" id="btnGenerarPreguntasIA" class="botonAdminContorno" style="display:none; width:100%; margin-bottom:8px;">
                    🤖 Generar preguntas con IA
                </button>
                <p id="estadoGenerarPreguntasIA" style="display:none; font-size:13px; margin:-4px 0 12px;"></p>
                <div id="editorPreguntas"></div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="submit" style="flex:1;">${esNueva ? "Crear lectura" : "Guardar cambios"}</button>
                    <button type="button" class="modalCerrar" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cancelar</button>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#campoNivel").value = (lecturaExistente && lecturaExistente.nivel) || "facil";

    const editorPreguntas = construirEditorPreguntas(overlay.querySelector("#editorPreguntas"), preguntas);

    activarBotonGenerarPreguntasIA(overlay, {
        campoTexto: overlay.querySelector("#campoTexto"),
        editorPreguntas,
        preguntas,
        contexto: () => ({ tipo: "premio", nivel: overlay.querySelector("#campoNivel").value })
    });

    activarBotonSubirDocumento(overlay, {
        campoTitulo: overlay.querySelector("#campoTitulo"),
        campoTexto: overlay.querySelector("#campoTexto"),
        editorPreguntas,
        preguntas,
        contexto: () => ({ tipo: "premio", nivel: overlay.querySelector("#campoNivel").value })
    });

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

        const datos = {
            titulo: overlay.querySelector("#campoTitulo").value.trim(),
            nivel: overlay.querySelector("#campoNivel").value,
            tiempoLectura: Number(overlay.querySelector("#campoTiempoLectura").value),
            tiempoCuestionario: Number(overlay.querySelector("#campoTiempoCuestionario").value),
            texto: texto,
            bancoPreguntas: preguntas,
            preguntasAMostrar: Math.min(preguntasAMostrarInput, preguntas.length),
            // Ya no lo escribe el admin a mano: una nueva se agrega al final
            // (conteo automático); una que ya existía conserva el suyo — se
            // vuelve a numerar sin huecos solo al eliminar (ver eliminarLectura).
            orden: esNueva ? CATALOGO_LECTURAS.length : lecturaExistente.orden
        };

        // Si esta lectura viene de una propuesta de "Ser el protagonista de
        // la historia" (ver admin-lecturas.js), conserva quién la escribió —
        // así "Mis publicaciones" en su perfil puede encontrarla después —
        // y su género, para poder sugerirla luego a otros usuarios con ese
        // mismo interés (ver inicio.js, "Sugerencias").
        if (lecturaExistente && lecturaExistente.autorUid) {
            datos.autorUid = lecturaExistente.autorUid;
            datos.autorNombre = lecturaExistente.autorNombre || "";
        }
        if (lecturaExistente && lecturaExistente.genero) {
            datos.genero = lecturaExistente.genero;
        }

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

// ==========================================================
// RENUMERAR "orden" SIN HUECOS (después de eliminar una lectura)
// ==========================================================
// "lista" debe venir ya ordenada como debe quedar numerada (por su
// "orden" actual, de menor a mayor). Solo escribe los documentos cuyo
// número realmente cambió — si no quedó ningún hueco, no hace nada.
async function reordenarConsecutivo(coleccion, lista) {

    const pendientes = lista
        .map((item, indice) => ({ item, indice }))
        .filter(({ item, indice }) => item.orden !== indice);

    if (pendientes.length === 0) return;

    const lote = db.batch();
    pendientes.forEach(({ item, indice }) => {
        lote.update(db.collection(coleccion).doc(item.id), { orden: indice });
    });
    await lote.commit();

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

        // El "orden" del resto queda sin huecos (0,1,2,...) — el "orden" de
        // premios es global (no por nivel), ver abrirFormularioLectura.
        const restantes = [...CATALOGO_LECTURAS].sort((a, b) => a.orden - b.orden);
        await reordenarConsecutivo("lecturas", restantes);
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

    // Ver la misma nota en abrirFormularioLectura: "esNueva" depende de si
    // YA TIENE ID, para poder prellenar título/texto/preguntas desde una
    // propuesta de "Ser el protagonista de la historia" sin ID todavía.
    const esNueva = !lecturaExistente || !lecturaExistente.id;
    const preguntas = (lecturaExistente && lecturaExistente.bancoPreguntas)
        ? JSON.parse(JSON.stringify(lecturaExistente.bancoPreguntas))
        : [];

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

                <div style="padding:12px; border:1px dashed var(--borde); border-radius:10px; margin-bottom:15px;">
                    <label style="font-weight:600;">📄 O sube un documento (PDF, Word o texto) para llenar esto automáticamente</label>
                    <input type="file" id="campoSubirDocumento" accept=".pdf,.docx,.txt" style="display:block; margin-top:8px;">
                    <p id="estadoSubirDocumento" style="display:none; font-size:13px; margin:8px 0 0;"></p>
                </div>

                <label>ID de la lectura</label>
                <input type="text" id="campoId" required autocomplete="off"
                       value="${(lecturaExistente && lecturaExistente.id) || ""}" ${esNueva ? "" : "readonly"}
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Título</label>
                <input type="text" id="campoTitulo" required autocomplete="off"
                       value="${((lecturaExistente && lecturaExistente.titulo) || "").replace(/"/g, "&quot;")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Edad</label>
                <select id="campoEdad" style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">
                    ${opcionesEdad.join("")}
                </select>

                <label>Texto</label>
                <textarea id="campoTexto" rows="10" required
                          style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde); font-family:inherit;"
                >${((lecturaExistente && lecturaExistente.texto) || []).join("\n\n")}</textarea>

                <label>Cuántas preguntas se muestran por sesión</label>
                <input type="number" id="campoPreguntasAMostrar" min="1"
                       value="${(lecturaExistente && lecturaExistente.preguntasAMostrar) || ""}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <h3 style="margin-top:10px;">Banco de preguntas</h3>
                <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                    Marca con el círculo cuál opción es la correcta de cada pregunta.
                </p>
                <button type="button" id="btnGenerarPreguntasIA" class="botonAdminContorno" style="display:none; width:100%; margin-bottom:8px;">
                    🤖 Generar preguntas con IA
                </button>
                <p id="estadoGenerarPreguntasIA" style="display:none; font-size:13px; margin:-4px 0 12px;"></p>
                <div id="editorPreguntas"></div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="submit" style="flex:1;">${esNueva ? "Crear lectura" : "Guardar cambios"}</button>
                    <button type="button" class="modalCerrar" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cancelar</button>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("#campoEdad").value = String((lecturaExistente && lecturaExistente.edad) || edadPorDefecto);

    const editorPreguntas = construirEditorPreguntas(overlay.querySelector("#editorPreguntas"), preguntas);

    activarBotonGenerarPreguntasIA(overlay, {
        campoTexto: overlay.querySelector("#campoTexto"),
        editorPreguntas,
        preguntas,
        contexto: () => ({ tipo: "mejora", edad: Number(overlay.querySelector("#campoEdad").value) })
    });

    activarBotonSubirDocumento(overlay, {
        campoTitulo: overlay.querySelector("#campoTitulo"),
        campoTexto: overlay.querySelector("#campoTexto"),
        editorPreguntas,
        preguntas,
        contexto: () => ({ tipo: "mejora", edad: Number(overlay.querySelector("#campoEdad").value) })
    });

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

        const datos = {
            edad: edad,
            titulo: overlay.querySelector("#campoTitulo").value.trim(),
            texto: texto,
            bancoPreguntas: preguntas,
            preguntasAMostrar: Math.min(preguntasAMostrarInput, preguntas.length),
            // Ver la misma nota en abrirFormularioLectura: ya no es manual.
            // Si además cambió de edad al editarla, también se va al final
            // de la lista de la edad NUEVA (su "orden" viejo era relativo a
            // la edad anterior, ya no tiene sentido ahí).
            orden: (esNueva || lecturaExistente.edad !== edad) ? listaDeEsaEdad.length : lecturaExistente.orden
        };

        // Ver la misma nota en abrirFormularioLectura: conserva la autoría
        // y el género si esta lectura viene de una propuesta de usuario.
        if (lecturaExistente && lecturaExistente.autorUid) {
            datos.autorUid = lecturaExistente.autorUid;
            datos.autorNombre = lecturaExistente.autorNombre || "";
        }
        if (lecturaExistente && lecturaExistente.genero) {
            datos.genero = lecturaExistente.genero;
        }

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

    // Se busca ANTES de borrar (necesita que todavía esté en
    // CATALOGO_MEJORA) para saber de qué edad era — el "orden" de
    // Mejorar la lectura es POR EDAD, no global, y además es el mismo
    // número que usa el desbloqueo secuencial (ver ubicarLecturaMejora
    // en mejora-lecturas.js y "indice" en motor-mejorar.js), así que
    // hay que renumerar exactamente esa edad para no dejar huecos que
    // bloqueen a alguien a mitad de camino.
    const ubicacionBorrada = ubicarLecturaMejora(id);

    try {
        await db.collection("mejoraLecturas").doc(id).delete();
        await cargarCatalogoMejora(true);

        if (ubicacionBorrada) {
            const restantes = [...(CATALOGO_MEJORA[ubicacionBorrada.edad] || [])].sort((a, b) => a.orden - b.orden);
            await reordenarConsecutivo("mejoraLecturas", restantes);
            await cargarCatalogoMejora(true);
        }

        if (alEliminar) alEliminar();
    } catch (error) {
        console.error("No se pudo eliminar la lectura de práctica:", error);
        alert("No se pudo eliminar la lectura.");
    }

}


// abrirFormularioRangoEdades() (el modal chico de min/max/segundosPresionar)
// ya no vive aquí — se reemplazó por la pantalla completa
// admin-mejora-edades.html (ver botón "⚙️ Configurar edades" en
// inicializarAdminMejora), que además cubre la meta de ppm por edad.


// ==========================================================
// FORMULARIO: CONFIGURACIÓN DEL AVANCE AUTOMÁTICO (lecturas de premios)
// ==========================================================
// Ver cargarConfigLecturaPremios en lecturas.js y ESPERA_INICIAL en
// motor.js — la velocidad del avance se recalcula sola por lectura
// (según su propio tiempoLectura) para que siempre termine de mostrar
// todo el texto antes de que se acabe el tiempo, así que aquí solo se
// edita el ÚNICO valor que es igual para todas: cuánto se espera antes
// de que el texto empiece a moverse.

async function abrirFormularioConfigLecturaPremios(alGuardar) {

    await cargarConfigLecturaPremios();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>⚙️ Configuración de Lecturas</h2>
            <p>Define cuánto tiempo espera el texto antes de empezar a avanzar solo.</p>

            <label style="display:block; text-align:left; margin-top:10px;">Segundos de espera antes de avanzar</label>
            <input type="number" id="campoEsperaInicial" min="0" max="30" step="0.5"
                   value="${CONFIG_LECTURA_PREMIOS.esperaInicialSegundos}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">
            <p style="font-size:13px; color:var(--texto-suave); margin:-8px 0 15px; text-align:left;">
                Aplica a TODAS las lecturas de premios por igual. El avance en sí siempre se
                recalcula para terminar de mostrar el texto completo antes de que se acabe el
                tiempo de cada lectura — no hace falta tocar nada más por eso.
            </p>

            <button id="btnGuardarConfigLecturaPremios">Guardar</button>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:10px;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.querySelector("#btnGuardarConfigLecturaPremios").addEventListener("click", async () => {

        const esperaInicialSegundos = Number(overlay.querySelector("#campoEsperaInicial").value);

        if (Number.isNaN(esperaInicialSegundos) || esperaInicialSegundos < 0) {
            alert("Los segundos de espera deben ser un número mayor o igual a 0.");
            return;
        }

        try {
            await db.collection("configuracion").doc("lecturaPremios").set({ esperaInicialSegundos });
            await cargarConfigLecturaPremios(true);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar la configuración:", error);
            alert("No se pudo guardar la configuración.");
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
// FORMULARIO: GÉNEROS DE LECTURA (encuesta del registro)
// ==========================================================
// Misma mecánica que abrirFormularioPremiadores: un solo arreglo dentro
// de configuracion/generosLectura, editado con arrayUnion/arrayRemove.
// cargarGenerosLectura()/GENEROS_LECTURA viven en generos.js (también lo
// usan el registro y "Editar perfil" para pintar la encuesta).

async function abrirFormularioGenerosLectura(alGuardar) {

    await cargarGenerosLectura();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>📖 Géneros de lectura</h2>
            <p>Opciones que ve el usuario en la encuesta de géneros del registro y de "Editar perfil".</p>
            <div id="listaGenerosLectura" style="text-align:left; margin:15px 0;"></div>
            <div style="display:flex; gap:8px;">
                <input type="text" id="campoNuevoGenero" placeholder="Ej. Poesía"
                       style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                <button id="btnAgregarGenero" style="width:auto; margin:0; padding:10px 16px;">+ Agregar</button>
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

        const lista = overlay.querySelector("#listaGenerosLectura");

        lista.innerHTML = GENEROS_LECTURA.map(genero => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--borde);">
                <span style="font-size:14px;">${genero}</span>
                <button type="button" class="botonAdminChico botonPeligro" data-quitar="${genero.replace(/"/g, "&quot;")}">🗑️</button>
            </div>
        `).join("") || "<p style='color:var(--texto-suave); font-size:14px;'>Todavía no hay géneros.</p>";

        lista.querySelectorAll("[data-quitar]").forEach(btn => {
            btn.addEventListener("click", async () => {
                try {
                    await db.collection("configuracion").doc("generosLectura").set({
                        lista: firebase.firestore.FieldValue.arrayRemove(btn.dataset.quitar)
                    }, { merge: true });
                    await cargarGenerosLectura(true);
                    render();
                } catch (error) {
                    console.error("No se pudo quitar el género:", error);
                    alert("No se pudo quitar el género.");
                }
            });
        });

    }

    render();

    overlay.querySelector("#btnAgregarGenero").addEventListener("click", async () => {

        const campo = overlay.querySelector("#campoNuevoGenero");
        const genero = campo.value.trim();

        if (!genero) {
            alert("Escribe un género.");
            return;
        }

        if (GENEROS_LECTURA.includes(genero)) {
            alert("Ese género ya está en la lista.");
            return;
        }

        try {
            await db.collection("configuracion").doc("generosLectura").set({
                lista: firebase.firestore.FieldValue.arrayUnion(genero)
            }, { merge: true });
            await cargarGenerosLectura(true);
            campo.value = "";
            render();
        } catch (error) {
            console.error("No se pudo agregar el género:", error);
            alert("No se pudo agregar el género.");
        }

    });

}


// ==========================================================
// FORMULARIO: ADMINISTRADORES
// ==========================================================
// Correos de Google autorizados para entrar a este panel (ver
// admin-comun.js). El administrador PRINCIPAL (esPrincipal: true) no
// tiene botón de eliminar aquí — y aunque alguien intentara borrarlo
// manipulando el código, firestore.rules lo rechaza igual.

async function abrirFormularioAdministradores(alGuardar) {

    await cargarAdministradores();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>🛡️ Administradores</h2>
            <p>Correos de Google autorizados para entrar a este panel.</p>
            <div id="listaAdministradores" style="text-align:left; margin:15px 0;"></div>
            <div style="display:flex; gap:8px;">
                <input type="email" id="campoNuevoAdmin" placeholder="correo@gmail.com"
                       style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                <button id="btnAgregarAdmin" style="width:auto; margin:0; padding:10px 16px;">+ Agregar</button>
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

        const lista = overlay.querySelector("#listaAdministradores");

        lista.innerHTML = ADMINISTRADORES.map(admin => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--borde);">
                <span style="font-size:14px;">
                    ${admin.email}
                    ${admin.esPrincipal ? `<strong style="color:var(--azul); font-size:12px;"> (principal)</strong>` : ""}
                </span>
                ${admin.esPrincipal
                    ? ""
                    : `<button type="button" class="botonAdminChico botonPeligro" data-quitar="${admin.email}">🗑️</button>`}
            </div>
        `).join("") || "<p style='color:var(--texto-suave); font-size:14px;'>Todavía no hay administradores.</p>";

        lista.querySelectorAll("[data-quitar]").forEach(btn => {
            btn.addEventListener("click", async () => {

                if (!confirm(`¿Quitarle acceso de administrador a ${btn.dataset.quitar}?`)) return;

                try {
                    await db.collection("administradores").doc(btn.dataset.quitar).delete();
                    await cargarAdministradores(true);
                    render();
                } catch (error) {
                    console.error("No se pudo quitar el administrador:", error);
                    alert("No se pudo quitar el administrador.");
                }

            });
        });

    }

    render();

    overlay.querySelector("#btnAgregarAdmin").addEventListener("click", async () => {

        const campo = overlay.querySelector("#campoNuevoAdmin");
        const email = campo.value.trim().toLowerCase();

        if (!email || !email.includes("@")) {
            alert("Escribe un correo válido.");
            return;
        }

        if (ADMINISTRADORES.some(admin => admin.email === email)) {
            alert("Ese correo ya es administrador.");
            return;
        }

        try {
            await db.collection("administradores").doc(email).set({
                esPrincipal: false,
                agregadoEn: firebase.firestore.FieldValue.serverTimestamp()
            });
            await cargarAdministradores(true);
            campo.value = "";
            render();
        } catch (error) {
            console.error("No se pudo agregar el administrador:", error);
            alert("No se pudo agregar el administrador.");
        }

    });

}


// ==========================================================
// FORMULARIO: META DE "EL PREMIO GORDO"
// ==========================================================
// Cuántas lecturas difíciles seguidas (sin fallar ninguna) hacen falta
// para clasificar (ver premio-gordo-comun.js). Solo el administrador
// puede cambiarla — ningún usuario regular tiene acceso a este botón,
// porque vive dentro del panel de administrador (esAdmin() ya lo protege).

async function abrirFormularioMetaPremioGordo(alGuardar) {

    await cargarMetaPremioGordo();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>🏆 Meta de El premio gordo</h2>
            <p>Cuántas lecturas difíciles seguidas (sin fallar ninguna) hacen falta para clasificar.</p>

            <label style="display:block; text-align:left; margin-top:10px;">Meta</label>
            <input type="number" id="campoMetaPremioGordo" min="1" step="1" value="${META_PREMIO_GORDO}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <button id="btnGuardarMetaPremioGordo">Guardar</button>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:10px;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.querySelector("#btnGuardarMetaPremioGordo").addEventListener("click", async () => {

        const meta = Number(overlay.querySelector("#campoMetaPremioGordo").value);

        if (!meta || meta < 1) {
            alert("La meta debe ser un número mayor a 0.");
            return;
        }

        try {
            await db.collection("configuracion").doc("premioGordo").set({ meta });
            await cargarMetaPremioGordo(true);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar la meta de El premio gordo:", error);
            alert("No se pudo guardar la meta.");
        }

    });

}


// ==========================================================
// FORMULARIO: EL HILO DEL DÍA
// ==========================================================
// Cada día tiene un texto corto dividido en 5 fragmentos, guardados
// SIEMPRE en el orden correcto (el juego los desordena al mostrarlos —
// ver hilo-del-dia.js). El editor de párrafos es el mismo patrón que
// construirEditorPreguntas: un arreglo mutado en sitio con botón
// "+ Agregar".

function construirEditorFragmentosHilo(contenedor, fragmentos) {

    function render() {

        contenedor.innerHTML = fragmentos.map((frag, i) => `
            <div style="border:1px solid var(--borde); border-radius:10px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <strong>Fragmento ${i + 1}</strong>
                    <button type="button" class="botonAdminChico botonPeligro" data-accion="quitar-fragmento" data-i="${i}">🗑️ Quitar</button>
                </div>
                <textarea data-accion="texto-fragmento" data-i="${i}" rows="3"
                          placeholder="Escribe este párrafo, en el orden correcto de la historia"
                          style="width:100%; padding:8px; border-radius:8px; border:1px solid var(--borde); font-family:inherit;"
                >${frag || ""}</textarea>
            </div>
        `).join("") + `<button type="button" data-accion="agregar-fragmento" style="width:100%;">+ Agregar párrafo</button>`;

    }

    contenedor.addEventListener("input", (e) => {
        if (e.target.dataset.accion === "texto-fragmento") {
            fragmentos[Number(e.target.dataset.i)] = e.target.value;
        }
    });

    contenedor.addEventListener("click", (e) => {

        const accion = e.target.dataset.accion;
        if (!accion) return;

        if (accion === "agregar-fragmento") {
            fragmentos.push("");
        } else if (accion === "quitar-fragmento") {
            fragmentos.splice(Number(e.target.dataset.i), 1);
        } else {
            return;
        }

        render();

    });

    render();

}

async function abrirFormularioHiloDia(hiloExistente, alGuardar) {

    const esNuevo = !hiloExistente;
    const fragmentos = esNuevo ? [] : [...(hiloExistente.fragmentos || [])];

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo modalCajaAdmin">
            <h2>${esNuevo ? "➕ Nuevo Hilo" : "✏️ Editar Hilo"}</h2>
            <form id="formHiloDia">

                <label>Fecha (día en que aparece)</label>
                <input type="date" id="campoFechaHilo" required
                       value="${esNuevo ? "" : hiloExistente.id}" ${esNuevo ? "" : "readonly"}
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <label>Título</label>
                <input type="text" id="campoTituloHilo" required autocomplete="off"
                       value="${esNuevo ? "" : (hiloExistente.titulo || "").replace(/"/g, "&quot;")}"
                       style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

                <h3 style="margin-top:10px;">Párrafos (en el orden correcto)</h3>
                <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                    Deben ser exactamente 5. El juego se los muestra desordenados a los jugadores.
                </p>
                <div id="editorFragmentosHilo"></div>

                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button type="submit" style="flex:1;">${esNuevo ? "Crear Hilo" : "Guardar cambios"}</button>
                    <button type="button" class="modalCerrar" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cancelar</button>
                </div>

            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    construirEditorFragmentosHilo(overlay.querySelector("#editorFragmentosHilo"), fragmentos);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector("#formHiloDia").addEventListener("submit", async (e) => {

        e.preventDefault();

        const fecha = overlay.querySelector("#campoFechaHilo").value;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            alert("Escribe una fecha válida.");
            return;
        }

        const fragmentosLimpios = fragmentos.map(f => f.trim()).filter(f => f.length > 0);

        if (fragmentosLimpios.length !== 5) {
            alert("El Hilo necesita exactamente 5 fragmentos, ni más ni menos.");
            return;
        }

        if (esNuevo) {
            try {
                const existente = await db.collection("elHiloDelDia").doc(fecha).get();
                if (existente.exists) {
                    alert("Ya existe un Hilo para esa fecha. Edítalo en vez de crear uno nuevo.");
                    return;
                }
            } catch (error) {
                console.error("No se pudo revisar si ya existía un Hilo para esa fecha:", error);
            }
        }

        const datos = {
            titulo: overlay.querySelector("#campoTituloHilo").value.trim(),
            fragmentos: fragmentosLimpios,
            creadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection("elHiloDelDia").doc(fecha).set(datos);
            overlay.remove();
            if (alGuardar) alGuardar();
        } catch (error) {
            console.error("No se pudo guardar el Hilo:", error);
            alert("No se pudo guardar el Hilo.");
        }

    });

}

async function eliminarHiloDia(fecha, alEliminar) {

    if (!confirm(`¿Seguro que quieres eliminar el Hilo del ${fecha}? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        await db.collection("elHiloDelDia").doc(fecha).delete();
        if (alEliminar) alEliminar();
    } catch (error) {
        console.error("No se pudo eliminar el Hilo:", error);
        alert("No se pudo eliminar el Hilo.");
    }

}

async function renderizarListaAdminHilos(contenedor) {

    contenedor.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    let hilos = [];

    try {
        const snapshot = await db.collection("elHiloDelDia")
            .orderBy(firebase.firestore.FieldPath.documentId(), "desc")
            .get();
        hilos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudieron cargar los Hilos:", error);
        contenedor.innerHTML = "<p style='text-align:center;'>No se pudieron cargar los Hilos.</p>";
        return;
    }

    if (hilos.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay ningún Hilo publicado.</p>";
        return;
    }

    contenedor.innerHTML = hilos.map(hilo => `
        <div class="tarjetaLectura" style="cursor:default;">
            <div class="tarjetaInfo">
                <p class="tarjetaTitulo">${hilo.id} — ${hilo.titulo}</p>
                <p class="tarjetaNivel">${(hilo.fragmentos || []).length} fragmentos</p>
            </div>
            <div style="display:flex; gap:8px;">
                <button type="button" class="botonAdminChico" data-editar-hilo="${hilo.id}">✏️</button>
                <button type="button" class="botonAdminChico botonPeligro" data-eliminar-hilo="${hilo.id}">🗑️</button>
            </div>
        </div>
    `).join("");

    contenedor.querySelectorAll("[data-editar-hilo]").forEach(btn => {
        btn.addEventListener("click", () => {
            const hilo = hilos.find(h => h.id === btn.dataset.editarHilo);
            abrirFormularioHiloDia(hilo, () => renderizarListaAdminHilos(contenedor));
        });
    });

    contenedor.querySelectorAll("[data-eliminar-hilo]").forEach(btn => {
        btn.addEventListener("click", () => {
            eliminarHiloDia(btn.dataset.eliminarHilo, () => renderizarListaAdminHilos(contenedor));
        });
    });

}


// ==========================================================
// PANEL: EL HILO DEL DÍA (admin-panel.html)
// ==========================================================

function inicializarAdminHiloDia() {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedorHilo");
    const panelExistente = document.getElementById("panelAdminHilo");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminHilo";
    panel.style.marginTop = "35px";
    panel.innerHTML = `
        <hr style="margin:30px 0; border:none; border-top:1px solid var(--borde);">
        <h2 style="text-align:center;">🧵 El Hilo del día</h2>

        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">🧵 El Hilo del día</h3>
            <div class="seccionAdminBotones">
                <button id="btnNuevoHiloDia">+ Agregar Hilo</button>
            </div>
            <div id="listaAdminHilos"></div>
        </div>
    `;
    contenedor.appendChild(panel);

    const listaHilos = document.getElementById("listaAdminHilos");
    renderizarListaAdminHilos(listaHilos);
    document.getElementById("btnNuevoHiloDia").addEventListener("click", () => {
        abrirFormularioHiloDia(null, () => renderizarListaAdminHilos(listaHilos));
    });

}


// ==========================================================
// FORMULARIO: BANCO DE PALABRAS (Ahorcado)
// ==========================================================
// Cada palabra vive en su propio documento, usando la palabra misma
// (normalizada en minúsculas) como ID — así no se pueden duplicar por
// accidente. "pista" es opcional.

async function abrirFormularioPalabra(palabraExistente, alGuardar) {

    const esNueva = !palabraExistente;

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>${esNueva ? "➕ Nueva palabra" : "✏️ Editar palabra"}</h2>

            <label style="display:block; text-align:left; margin-top:10px;">Palabra</label>
            <input type="text" id="campoPalabra" required autocomplete="off"
                   value="${esNueva ? "" : (palabraExistente.palabra || "").replace(/"/g, "&quot;")}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <label style="display:block; text-align:left;">Pista / significado (opcional)</label>
            <input type="text" id="campoPista" autocomplete="off"
                   value="${esNueva ? "" : (palabraExistente.pista || "").replace(/"/g, "&quot;")}"
                   style="width:100%; padding:10px; margin:6px 0 15px; border-radius:8px; border:1px solid var(--borde);">

            <button id="btnGuardarPalabra">${esNueva ? "Agregar" : "Guardar cambios"}</button>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:10px;">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.querySelector("#btnGuardarPalabra").addEventListener("click", async () => {

        const palabra = overlay.querySelector("#campoPalabra").value.trim();
        const pista = overlay.querySelector("#campoPista").value.trim();

        if (!palabra) {
            alert("Escribe una palabra.");
            return;
        }

        const id = palabra.toLowerCase();

        try {

            if (esNueva) {
                const existente = await db.collection("bancoPalabras").doc(id).get();
                if (existente.exists) {
                    alert("Esa palabra ya existe en el banco.");
                    return;
                }
            } else if (id !== palabraExistente.id) {
                // Cambió el texto de la palabra: como el ID depende de la
                // palabra normalizada, se borra el documento viejo para no
                // dejar un duplicado suelto con el texto anterior.
                await db.collection("bancoPalabras").doc(palabraExistente.id).delete();
            }

            await db.collection("bancoPalabras").doc(id).set({
                palabra: palabra,
                pista: pista || null
            });

            overlay.remove();
            if (alGuardar) alGuardar();

        } catch (error) {
            console.error("No se pudo guardar la palabra:", error);
            alert("No se pudo guardar la palabra.");
        }

    });

}

async function eliminarPalabra(id, alEliminar) {

    if (!confirm(`¿Seguro que quieres eliminar "${id}" del banco de palabras?`)) {
        return;
    }

    try {
        await db.collection("bancoPalabras").doc(id).delete();
        if (alEliminar) alEliminar();
    } catch (error) {
        console.error("No se pudo eliminar la palabra:", error);
        alert("No se pudo eliminar la palabra.");
    }

}

async function renderizarListaAdminPalabras(contenedor) {

    contenedor.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    let palabras = [];

    try {
        const snapshot = await db.collection("bancoPalabras").orderBy("palabra").get();
        palabras = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudo cargar el banco de palabras:", error);
        contenedor.innerHTML = "<p style='text-align:center;'>No se pudo cargar el banco de palabras.</p>";
        return;
    }

    if (palabras.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay palabras en el banco.</p>";
        return;
    }

    contenedor.innerHTML = palabras.map(p => `
        <div class="tarjetaLectura" style="cursor:default;">
            <div class="tarjetaInfo">
                <p class="tarjetaTitulo">${p.palabra}</p>
                <p class="tarjetaNivel">${p.pista || "Sin pista"}</p>
            </div>
            <div style="display:flex; gap:8px;">
                <button type="button" class="botonAdminChico" data-editar-palabra="${p.id}">✏️</button>
                <button type="button" class="botonAdminChico botonPeligro" data-eliminar-palabra="${p.id}">🗑️</button>
            </div>
        </div>
    `).join("");

    contenedor.querySelectorAll("[data-editar-palabra]").forEach(btn => {
        btn.addEventListener("click", () => {
            const palabra = palabras.find(p => p.id === btn.dataset.editarPalabra);
            abrirFormularioPalabra(palabra, () => renderizarListaAdminPalabras(contenedor));
        });
    });

    contenedor.querySelectorAll("[data-eliminar-palabra]").forEach(btn => {
        btn.addEventListener("click", () => {
            eliminarPalabra(btn.dataset.eliminarPalabra, () => renderizarListaAdminPalabras(contenedor));
        });
    });

}


// ==========================================================
// PANEL: AHORCADO (admin-panel.html)
// ==========================================================

function inicializarAdminAhorcado() {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedorAhorcado");
    const panelExistente = document.getElementById("panelAdminAhorcado");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminAhorcado";
    panel.style.marginTop = "35px";
    panel.innerHTML = `
        <hr style="margin:30px 0; border:none; border-top:1px solid var(--borde);">
        <h2 style="text-align:center;">🔤 Ahorcado</h2>

        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">🔤 Ahorcado — banco de palabras</h3>
            <div class="seccionAdminBotones">
                <button id="btnNuevaPalabra">+ Agregar palabra</button>
            </div>
            <div id="listaAdminPalabras"></div>
        </div>
    `;
    contenedor.appendChild(panel);

    const listaPalabras = document.getElementById("listaAdminPalabras");
    renderizarListaAdminPalabras(listaPalabras);
    document.getElementById("btnNuevaPalabra").addEventListener("click", () => {
        abrirFormularioPalabra(null, () => renderizarListaAdminPalabras(listaPalabras));
    });

}


// ==========================================================
// PANEL: LECTURAS Y CONFIGURACIÓN GENERAL (admin-panel.html)
// ==========================================================

// ==========================================================
// SECCIÓN: LECTURAS DE PREMIOS (admin-lecturas.html)
// ==========================================================

function inicializarAdminLecturasPremios() {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedor");
    const panelExistente = document.getElementById("panelAdminIndex");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminIndex";
    panel.innerHTML = `
        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">📚 Lecturas de premios</h3>
            <div class="seccionAdminBotones">
                <button id="btnNuevaLectura">+ Agregar lectura nueva</button>
                <button id="btnConfigLecturaPremios" style="background:white; color:var(--azul); border:2px solid var(--azul);">⚙️ Configuración</button>
                <button id="btnRepararPuntos" class="botonAdminContorno">Borrar puntos de lecturas eliminadas</button>
            </div>
            <div id="listaAdminLecturas"></div>
        </div>
    `;
    contenedor.appendChild(panel);

    document.getElementById("btnNuevaLectura").addEventListener("click", () => {
        abrirFormularioLectura(null, () => inicializarAdminLecturasPremios());
    });

    document.getElementById("btnConfigLecturaPremios").addEventListener("click", () => {
        abrirFormularioConfigLecturaPremios();
    });

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


// ==========================================================
// SECCIÓN: ENCUESTA DE GÉNEROS DE LECTURA (admin-lecturas.html)
// ==========================================================

function inicializarAdminGenerosLectura() {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedor");
    const panelExistente = document.getElementById("panelAdminGeneros");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminGeneros";
    panel.style.marginTop = "20px";
    panel.innerHTML = `
        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">📖 Encuesta de géneros de lectura</h3>
            <div class="seccionAdminBotones">
                <button id="btnEditarGenerosLectura" class="botonAdminContorno">Editar géneros</button>
            </div>
        </div>
    `;
    contenedor.appendChild(panel);

    document.getElementById("btnEditarGenerosLectura").addEventListener("click", () => {
        abrirFormularioGenerosLectura(() => inicializarAdminGenerosLectura());
    });

}


// ==========================================================
// SECCIÓN: PREMIOS (admin-premios.html)
// ==========================================================
// Todo lo relacionado a premios de cualquier nivel: descripciones,
// quién puede canjearlos (premiadores) y la meta de El premio gordo.

function inicializarAdminPremiosConfig() {

    if (!esAdmin()) return;

    const contenedor = document.getElementById("contenedor");
    const panelExistente = document.getElementById("panelAdminPremiosConfig");
    if (panelExistente) panelExistente.remove();

    const panel = document.createElement("div");
    panel.id = "panelAdminPremiosConfig";
    panel.innerHTML = `
        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">🎁 Premios</h3>
            <div class="seccionAdminBotones">
                <button id="btnEditarPremios" class="botonAdminContorno">Editar premios</button>
                <button id="btnEditarPremiadores" class="botonAdminContorno">Editar premiadores</button>
            </div>
        </div>

        <div class="seccionAdmin">
            <h3 class="seccionAdminTitulo">🏆 El premio gordo</h3>
            <div class="seccionAdminBotones">
                <button id="btnEditarMetaPremioGordo" class="botonAdminContorno">Editar meta del premio gordo</button>
            </div>
        </div>
    `;
    contenedor.appendChild(panel);

    document.getElementById("btnEditarPremios").addEventListener("click", () => {
        abrirFormularioPremios(() => inicializarAdminPremiosConfig());
    });

    document.getElementById("btnEditarPremiadores").addEventListener("click", () => {
        abrirFormularioPremiadores(() => inicializarAdminPremiosConfig());
    });

    document.getElementById("btnEditarMetaPremioGordo").addEventListener("click", () => {
        abrirFormularioMetaPremioGordo(() => inicializarAdminPremiosConfig());
    });

}


// ==========================================================
// VISTA PREVIA DE SOLO LECTURA (requisito: el admin puede ver/probar
// una lectura sin que cuente como participación real) — usada por el
// botón 👁️ tanto de "Lecturas" (premios) como de "Mejorar la lectura"
// (ver renderizarListaAdminLecturas y renderizarListaAdminMejora).
// ==========================================================
// Todo pasa EN MEMORIA: nunca llama a db.collection("progreso"), nunca
// toca usuarios/{uid}, racha ni ranking. Por eso vive aparte y no reusa
// motor.js/motor-mejorar.js (que sí hacen todo eso para participantes
// reales), y no depende de que ninguno de esos archivos esté cargado.

function abrirVistaPreviaLectura(lectura) {

    if (!lectura) return;

    const preguntas = lectura.bancoPreguntas || [];
    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo modalCajaAdmin">
            <h2>👁️ Vista previa — ${lectura.titulo}</h2>
            <p style="font-size:13px; color:var(--texto-suave);">
                Solo para revisar cómo se ve. No suma puntos, racha ni queda guardado en ningún lado.
            </p>
            <div style="text-align:left; margin:15px 0;">
                ${(lectura.texto || []).map(p => `<p style="margin-bottom:12px;">${p}</p>`).join("")}
            </div>
            <div id="previaPreguntas" style="text-align:left;"></div>
            <div id="previaResultado" style="display:none; text-align:center; font-weight:700; margin:15px 0;"></div>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button type="button" id="btnCalificarPrevia" style="flex:1;">Calificar (solo de prueba)</button>
                <button type="button" class="modalCerrar" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    const contPreguntas = overlay.querySelector("#previaPreguntas");
    contPreguntas.innerHTML = preguntas.map((pregunta, pi) => `
        <div style="margin-bottom:15px;">
            <p style="font-weight:600; margin-bottom:6px;">${pi + 1}. ${pregunta.pregunta}</p>
            ${pregunta.opciones.map(opcion => `
                <label style="display:block; margin-bottom:4px;">
                    <input type="radio" name="previaPregunta${pi}" value="${opcion.valor}">
                    ${opcion.texto}
                </label>
            `).join("")}
        </div>
    `).join("") || "<p style='color:var(--texto-suave);'>Esta lectura no tiene preguntas todavía.</p>";

    overlay.querySelector("#btnCalificarPrevia").addEventListener("click", () => {

        let correctas = 0;

        preguntas.forEach((pregunta, pi) => {
            const marcada = overlay.querySelector(`input[name="previaPregunta${pi}"]:checked`);
            if (marcada && marcada.value === pregunta.correcta) correctas++;
        });

        const resultado = overlay.querySelector("#previaResultado");
        resultado.style.display = "block";
        resultado.textContent = preguntas.length
            ? `${correctas} de ${preguntas.length} correctas (solo de prueba, nada se guardó)`
            : "Sin preguntas que calificar.";

    });

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
                <button type="button" class="botonAdminChico" data-preview="${lectura.id}" title="Vista previa (sin puntos ni racha)">👁️</button>
                <button type="button" class="botonAdminChico" data-codigos="${lectura.id}" title="Generar código">🔑</button>
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
            abrirFormularioLectura(lectura, () => inicializarAdminLecturasPremios());
        });
    });

    cont.querySelectorAll("[data-eliminar]").forEach(btn => {
        btn.addEventListener("click", () => {
            eliminarLectura(btn.dataset.eliminar, () => inicializarAdminLecturasPremios());
        });
    });

    cont.querySelectorAll("[data-codigos]").forEach(btn => {
        btn.addEventListener("click", () => {
            const lectura = CATALOGO_LECTURAS.find(l => l.id === btn.dataset.codigos);
            abrirModalCodigosLectura(lectura);
        });
    });

    cont.querySelectorAll("[data-preview]").forEach(btn => {
        btn.addEventListener("click", () => {
            const lectura = CATALOGO_LECTURAS.find(l => l.id === btn.dataset.preview);
            abrirVistaPreviaLectura(lectura);
        });
    });

}


// ==========================================================
// CÓDIGOS DE CANJE DE UNA LECTURA (uno por golosina)
// ==========================================================
// Cada código de 8 caracteres alfanuméricos desbloquea el acceso a la
// lectura UNA sola vez en total (colección "codigosLectura", ver
// firestore.rules). Se abre desde el botón 🔑 de la lista de lecturas
// (junto a abrir/editar/borrar) y permite generar tantos códigos como
// golosinas se necesiten, mostrando el estado de cada uno.

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
 * Modal con el botón "🔑 Generar código" y la lista de todos los códigos
 * ya generados para esta lectura (con su estado, quién lo usó si aplica,
 * y un botón para copiar cada código al portapapeles).
 */
function abrirModalCodigosLectura(lectura) {

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>🔑 Códigos de canje</h2>
            <p style="font-weight:600; margin-bottom:5px;">${lectura.titulo}</p>
            <p style="font-size:13px; color:var(--texto-suave); margin-bottom:15px;">
                Cada código de 8 caracteres desbloquea esta lectura una sola vez. Genera uno por cada golosina.
            </p>
            <button type="button" id="btnGenerarCodigoLectura">🔑 Generar código</button>
            <div id="listaCodigosLectura" style="text-align:left; margin-top:15px;"></div>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:15px;">Cerrar</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    const listaEl = overlay.querySelector("#listaCodigosLectura");

    async function render() {

        listaEl.innerHTML = "<p style='text-align:center;'>Cargando códigos...</p>";

        let codigos = [];
        try {
            const snapshot = await db.collection("codigosLectura")
                .where("lecturaId", "==", lectura.id)
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
                <span style="display:flex; align-items:center; gap:6px; font-family:monospace; font-weight:700; letter-spacing:1px;">
                    ${c.codigo}
                    <button type="button" class="botonAdminChico" data-copiar="${c.codigo}"
                            title="Copiar código" style="padding:4px 8px; font-size:13px;">📋</button>
                </span>
                <span style="font-size:13px; text-align:right; color:var(--texto-suave); white-space:nowrap;">
                    ${c.usado
                        ? `✅ Usado por ${nombresPorUid[c.usadoPor] || "alguien"}`
                        : `🟢 Disponible`}
                </span>
            </div>
        `).join("");

        listaEl.querySelectorAll("[data-copiar]").forEach(btnCopiar => {
            btnCopiar.addEventListener("click", () => copiarCodigoAlPortapapeles(btnCopiar));
        });

    }

    overlay.querySelector("#btnGenerarCodigoLectura").addEventListener("click", async () => {

        const btn = overlay.querySelector("#btnGenerarCodigoLectura");
        btn.disabled = true;
        btn.textContent = "Generando...";

        try {
            await generarCodigoLecturaNuevo(lectura.id);
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

/**
 * Copia el código de canje (data-copiar del botón) al portapapeles y le
 * da un momento de confirmación visual (✅) antes de volver al ícono.
 */
function copiarCodigoAlPortapapeles(btnCopiar) {

    const codigo = btnCopiar.dataset.copiar;

    navigator.clipboard.writeText(codigo).then(() => {
        btnCopiar.textContent = "✅";
        setTimeout(() => { btnCopiar.textContent = "📋"; }, 1200);
    }).catch(error => {
        console.error("No se pudo copiar el código:", error);
        alert(`No se pudo copiar automáticamente. Aquí está el código: ${codigo}`);
    });

}


// ==========================================================
// PANEL: MEJORAR LA LECTURA (admin-panel.html)
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
        <h2 style="text-align:center;">📈 Mejorar la lectura</h2>
        <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:15px 0;">
            <button id="btnNuevaMejora" style="max-width:260px;">+ Agregar lectura — ${etiquetaEdad(edadActual)}</button>
            <a href="admin-mejora-edades.html" class="botonAdminContorno"
               style="max-width:260px; display:inline-flex; align-items:center; justify-content:center; padding:12px 22px; border-radius:12px; font-weight:600; text-decoration:none;">
                ⚙️ Configurar edades
            </a>
        </div>
        <div id="listaAdminMejora"></div>
    `;
    contenedor.appendChild(panel);

    document.getElementById("btnNuevaMejora").addEventListener("click", () => {
        abrirFormularioMejora(null, edadActual, () => inicializarAdminMejora(edadActual));
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
                <button type="button" class="botonAdminChico" data-preview="${lectura.id}" title="Vista previa (sin puntos ni racha)">👁️</button>
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

    cont.querySelectorAll("[data-preview]").forEach(btn => {
        btn.addEventListener("click", () => {
            const lectura = lista.find(l => l.id === btn.dataset.preview);
            abrirVistaPreviaLectura(lectura);
        });
    });

}
