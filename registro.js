// ==========================================================
// FORMULARIO DE REGISTRO (Etapa 37)
// ==========================================================
// Antes este formulario vivía como HTML COPIADO en las 8 páginas donde
// alguien puede aterrizar sin cuenta (index, lectura, mejora, premios,
// perfil, qr, qr-personalizado, lectura-mejorar). Al volverse un
// asistente de varios pasos, mantener 8 copias iguales era insostenible:
// ahora esas páginas solo traen <div id="pantallaRegistro"> vacío y este
// archivo lo llena. Una sola versión del formulario para todas.
//
// PASOS
//   1. Temas de interés — con un contador en vivo de cuánta gente eligió
//      cada tema (temasContadores) y la opción "Otro", que pasa por
//      moderación con IA antes de entrar a la lista global de todos
//      (ver moderarTemaIA.js en Cloud Functions).
//   2. Nivel de lectura — lo declara, o elige "Desconozco mi nivel" y al
//      terminar el registro se le manda al test de ubicación
//      (test-nivel.html) para medirlo de verdad.
//   3. Propósito — para qué usa la app (alimenta sus estadísticas).
//   4. Datos personales — incluida la OCUPACIÓN, que reemplaza a la
//      antigua pregunta de "particular / estudiante".
//
// VALIDACIÓN: no se avanza de paso con campos obligatorios vacíos — se
// marcan en rojo y se muestra un aviso diciendo cuáles faltan.
//
// COMPATIBILIDAD: se siguen guardando "tipo", "colegio" y "grado" cuando
// la ocupación es estudiante, porque de esos tres depende el ranking de
// colegios que ya existe (ver actualizarRankingActual en puntos.js).
// ==========================================================

const OCUPACIONES = [
    { valor: "empleado", etiqueta: "Empleado" },
    { valor: "profesional", etiqueta: "Profesional" },
    { valor: "estudiante", etiqueta: "Estudiante" },
    { valor: "amaDeCasa", etiqueta: "Ama de casa" },
    { valor: "jubilado", etiqueta: "Jubilado" },
    { valor: "sinOcupacion", etiqueta: "Sin ocupación" },
    { valor: "otro", etiqueta: "Otro" }
];

const PROPOSITOS = [
    { valor: "habito", etiqueta: "Sembrar el hábito de la lectura" },
    { valor: "descubrir", etiqueta: "Descubrir temas nuevos" },
    { valor: "conectar", etiqueta: "Conectar con más lectores" },
    { valor: "libroCompleto", etiqueta: "Leer un libro completo" },
    { valor: "curioseando", etiqueta: "Solo curioseando" },
    { valor: "otro", etiqueta: "Otro" }
];

// Lee de una sola vez cuántos usuarios eligieron cada tema. Si falla, se
// devuelve vacío: los contadores son un adorno útil, nunca un motivo
// para no poder registrarse.
async function cargarContadoresTemas() {

    const conteos = {};

    try {
        const snapshot = await db.collection("temasContadores").get();
        snapshot.forEach(doc => { conteos[doc.id] = (doc.data() || {}).conteo || 0; });
    } catch (error) {
        console.error("No se pudieron cargar los contadores de temas:", error);
    }

    return conteos;

}

/**
 * Le suma 1 al contador de cada tema elegido. Se llama al guardar el
 * registro (y al cambiar los temas desde Perfil). Nunca bloquea: si
 * falla, el registro ya quedó guardado igual.
 */
async function sumarContadoresTemas(temas) {

    await Promise.all((temas || []).map(async tema => {
        try {
            await db.collection("temasContadores").doc(tema).set(
                { conteo: firebase.firestore.FieldValue.increment(1) },
                { merge: true }
            );
        } catch (error) {
            console.error("No se pudo actualizar el contador del tema", tema, error);
        }
    }));

}

/**
 * ¿A esta cuenta (registrada ANTES de la Etapa 37) le faltan los datos
 * nuevos? Se usa para mandarla una sola vez a "completar tu perfil" —
 * ver construirCompletarPerfil abajo y auth.js.
 */
function faltanDatosNuevosDePerfil(datos) {

    if (!datos) return false;

    return !datos.ocupacion
        || !datos.proposito
        || (!datos.nivelLectura && !datos.pendienteTestNivel)
        || !(Array.isArray(datos.generosLectura) && datos.generosLectura.length > 0);

}

/**
 * Pantalla corta para las cuentas que ya existían: enseña ÚNICAMENTE
 * los campos que les faltan de la Etapa 37 (temas, nivel, propósito,
 * ocupación) y los guarda con update(), sin tocar lo que ya tenían.
 *
 * A diferencia del registro, no es un asistente por pasos: a la mayoría
 * le va a faltar poco, y partir tres preguntas en tres pantallas sería
 * más molesto que útil.
 */
function construirCompletarPerfil(contenedor, datos, { alTerminar }) {

    const esc = (s) => String(s == null ? "" : s).replace(/"/g, "&quot;");

    const faltaTemas = !(Array.isArray(datos.generosLectura) && datos.generosLectura.length > 0);
    const faltaNivel = !datos.nivelLectura && !datos.pendienteTestNivel;
    const faltaProposito = !datos.proposito;
    const faltaOcupacion = !datos.ocupacion;

    const estado = { temas: [], nivelDeclarado: null, proposito: null, metaLibros: null, propositoOtro: "", ocupacion: null, institucionTipo: null, institucion: "", grado: "", carrera: "", ocupacionOtro: "" };
    let contadoresTemas = {};

    contenedor.innerHTML = `
        <div class="cajaAuth" style="max-width:520px;">
            <h1 style="margin-bottom:4px;">Completa tu perfil</h1>
            <p style="margin-bottom:18px;">Agregamos algunas preguntas nuevas. Es rápido y solo se hace una vez.</p>

            <div style="text-align:left;">

                ${faltaTemas ? `
                    <h3 style="margin:0 0 8px;">¿Qué temas te gusta leer?</h3>
                    <div id="listaTemasCompletar" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;">
                        <p style="color:var(--texto-suave); font-size:13px; margin:0;">Cargando temas…</p>
                    </div>
                ` : ""}

                ${faltaNivel ? `
                    <h3 style="margin:0 0 8px;">¿Qué tan rápido y bien lees hoy?</h3>
                    ${NIVELES_LECTURA.map(n => `
                        <label class="opcionTipo" style="display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid var(--borde); border-radius:10px; margin-bottom:8px;">
                            <input type="radio" name="nivelCompletar" value="${n.nivel}" style="margin-top:3px;">
                            <span>
                                <strong>Nivel ${n.nivel} — ${n.nombre}</strong>
                                <span style="display:block; font-size:13px; color:var(--texto-suave);">${n.descripcion}</span>
                            </span>
                        </label>
                    `).join("")}
                    <label class="opcionTipo" style="display:flex; gap:10px; align-items:flex-start; padding:10px; border:2px dashed var(--azul); border-radius:10px; margin-bottom:20px;">
                        <input type="radio" name="nivelCompletar" value="desconozco" style="margin-top:3px;">
                        <span>
                            <strong>Desconozco mi nivel</strong>
                            <span style="display:block; font-size:13px; color:var(--texto-suave);">Te llevamos a una lectura corta para medirlo.</span>
                        </span>
                    </label>
                ` : ""}

                ${faltaProposito ? `
                    <h3 style="margin:0 0 8px;">¿Para qué vas a usar la app?</h3>
                    ${PROPOSITOS.map(p => `
                        <label class="opcionTipo" style="display:flex; gap:10px; align-items:center; padding:10px; border:1px solid var(--borde); border-radius:10px; margin-bottom:8px;">
                            <input type="radio" name="propositoCompletar" value="${p.valor}"> ${p.etiqueta}
                        </label>
                    `).join("")}
                    <div id="cajaMetaCompletar" style="display:none; margin-bottom:10px;">
                        <label style="display:block; font-weight:600; margin-bottom:6px;">¿Cuántos libros quieres leer?</label>
                        <input type="number" id="campoMetaCompletar" min="1" max="500" placeholder="Ej. 3"
                               style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                    </div>
                    <div id="cajaPropositoOtroCompletar" style="display:none; margin-bottom:20px;">
                        <label style="display:block; font-weight:600; margin-bottom:6px;">Cuéntanos para qué</label>
                        <input type="text" id="campoPropositoOtroCompletar" maxlength="120" placeholder="Escribe tu propósito"
                               style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                    </div>
                ` : ""}

                ${faltaOcupacion ? `
                    <h3 style="margin:16px 0 8px;">¿Cuál es tu ocupación?</h3>
                    <select id="campoOcupacionCompletar" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde); margin-bottom:10px;">
                        <option value="">Elige una…</option>
                        ${OCUPACIONES.map(o => `<option value="${o.valor}">${o.etiqueta}</option>`).join("")}
                    </select>

                    <div id="cajaEstudianteCompletar" style="display:none; padding:12px; border:1px dashed var(--borde); border-radius:10px; margin-bottom:12px;">
                        <label style="display:block; font-weight:600; margin-bottom:6px;">¿Dónde estudias?</label>
                        <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto; margin-right:15px;">
                            <input type="radio" name="institucionTipoCompletar" value="colegio"> Colegio
                        </label>
                        <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto;">
                            <input type="radio" name="institucionTipoCompletar" value="universidad"> Universidad
                        </label>

                        <label style="display:block; font-weight:600; margin:12px 0 6px;">Nombre de la institución</label>
                        <input type="text" id="campoInstitucionCompletar" value="${esc(datos.colegio || "")}"
                               placeholder="Escríbelo completo"
                               style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">

                        <div id="cajaGradoCompletar" style="display:none; margin-top:12px;">
                            <label style="display:block; font-weight:600; margin-bottom:6px;">Grado</label>
                            <select id="campoGradoCompletar" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);"></select>
                        </div>

                        <div id="cajaCarreraCompletar" style="display:none; margin-top:12px;">
                            <label style="display:block; font-weight:600; margin-bottom:6px;">Carrera</label>
                            <input type="text" id="campoCarreraCompletar" placeholder="Ej. Ingeniería en Sistemas"
                                   style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                        </div>
                    </div>

                    <div id="cajaOcupacionOtroCompletar" style="display:none; margin-bottom:12px;">
                        <label style="display:block; font-weight:600; margin-bottom:6px;">¿Cuál?</label>
                        <input type="text" id="campoOcupacionOtroCompletar" maxlength="60" placeholder="Escribe tu ocupación"
                               style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                    </div>
                ` : ""}

            </div>

            <p id="avisoCompletar" class="errorTexto" style="display:none; margin-top:12px;"></p>
            <button type="button" id="btnGuardarCompletar" style="width:100%; margin-top:16px;">Guardar y continuar</button>
        </div>
    `;

    const aviso = contenedor.querySelector("#avisoCompletar");
    const btnGuardar = contenedor.querySelector("#btnGuardarCompletar");

    function marcarFaltante(elemento, falta) {
        if (!elemento) return;
        elemento.style.borderColor = falta ? "#c0392b" : "";
        elemento.style.background = falta ? "#fdf1f0" : "";
    }

    // ---- Temas ----
    function pintarChips() {

        const lista = contenedor.querySelector("#listaTemasCompletar");
        if (!lista) return;

        lista.innerHTML = (GENEROS_LECTURA || []).map(tema => `
            <button type="button" class="chipTema ${estado.temas.includes(tema) ? "chipTemaElegido" : ""}" data-tema="${esc(tema)}">
                ${tema}<span class="chipTemaConteo">${contadoresTemas[tema] || 0}</span>
            </button>
        `).join("");

        lista.querySelectorAll("[data-tema]").forEach(chip => {
            chip.addEventListener("click", () => {
                const tema = chip.dataset.tema;
                const i = estado.temas.indexOf(tema);
                if (i === -1) estado.temas.push(tema); else estado.temas.splice(i, 1);
                pintarChips();
            });
        });

    }

    if (faltaTemas) {
        Promise.all([cargarGenerosLectura(), cargarContadoresTemas()])
            .then(([, conteos]) => { contadoresTemas = conteos; pintarChips(); })
            .catch(error => console.error("No se pudieron cargar los temas:", error));
    }

    // ---- Propósito ----
    contenedor.querySelectorAll('input[name="propositoCompletar"]').forEach(radio => {
        radio.addEventListener("change", () => {
            estado.proposito = radio.value;
            contenedor.querySelector("#cajaMetaCompletar").style.display = radio.value === "libroCompleto" ? "block" : "none";
            contenedor.querySelector("#cajaPropositoOtroCompletar").style.display = radio.value === "otro" ? "block" : "none";
        });
    });

    // ---- Nivel ----
    contenedor.querySelectorAll('input[name="nivelCompletar"]').forEach(radio => {
        radio.addEventListener("change", () => {
            estado.nivelDeclarado = radio.value === "desconozco" ? "desconozco" : Number(radio.value);
        });
    });

    // ---- Ocupación ----
    const selectOcupacion = contenedor.querySelector("#campoOcupacionCompletar");

    if (selectOcupacion) {

        const selectGrado = contenedor.querySelector("#campoGradoCompletar");
        if (selectGrado && typeof renderizarSelectorGrado === "function") {
            renderizarSelectorGrado(selectGrado, datos.grado || "");
        }

        function actualizarCajas() {
            const valor = selectOcupacion.value;
            estado.ocupacion = valor || null;
            contenedor.querySelector("#cajaEstudianteCompletar").style.display = valor === "estudiante" ? "block" : "none";
            contenedor.querySelector("#cajaOcupacionOtroCompletar").style.display = valor === "otro" ? "block" : "none";

            const tipoInst = (contenedor.querySelector('input[name="institucionTipoCompletar"]:checked') || {}).value || null;
            estado.institucionTipo = tipoInst;
            contenedor.querySelector("#cajaGradoCompletar").style.display = tipoInst === "colegio" ? "block" : "none";
            contenedor.querySelector("#cajaCarreraCompletar").style.display = tipoInst === "universidad" ? "block" : "none";
        }

        selectOcupacion.addEventListener("change", actualizarCajas);
        contenedor.querySelectorAll('input[name="institucionTipoCompletar"]').forEach(r => r.addEventListener("change", actualizarCajas));

        // Una cuenta vieja marcada como estudiante ya trae colegio y grado:
        // se pre-selecciona para que no tenga que volver a escribirlos.
        if (datos.tipo === "estudiante") {
            selectOcupacion.value = "estudiante";
            const radioColegio = contenedor.querySelector('input[name="institucionTipoCompletar"][value="colegio"]');
            if (radioColegio) radioColegio.checked = true;
        }

        actualizarCajas();

    }

    // ---- Guardar ----
    btnGuardar.addEventListener("click", async () => {

        const faltantes = [];

        if (faltaTemas && estado.temas.length === 0) faltantes.push("al menos un tema");
        if (faltaNivel && estado.nivelDeclarado === null) faltantes.push("tu nivel de lectura");

        if (faltaProposito) {
            if (!estado.proposito) {
                faltantes.push("tu propósito");
            } else if (estado.proposito === "libroCompleto") {
                const campo = contenedor.querySelector("#campoMetaCompletar");
                const meta = Number(campo.value);
                marcarFaltante(campo, !(meta >= 1));
                if (meta >= 1) estado.metaLibros = meta; else faltantes.push("cuántos libros quieres leer");
            } else if (estado.proposito === "otro") {
                const campo = contenedor.querySelector("#campoPropositoOtroCompletar");
                marcarFaltante(campo, !campo.value.trim());
                if (campo.value.trim()) estado.propositoOtro = campo.value.trim(); else faltantes.push("para qué vas a usar la app");
            }
        }

        if (faltaOcupacion) {

            marcarFaltante(selectOcupacion, !selectOcupacion.value);
            if (!selectOcupacion.value) faltantes.push("tu ocupación");

            if (selectOcupacion.value === "estudiante") {

                const tipoInst = (contenedor.querySelector('input[name="institucionTipoCompletar"]:checked') || {}).value;
                if (!tipoInst) faltantes.push("si estudias en colegio o universidad");
                estado.institucionTipo = tipoInst || null;

                const campoInst = contenedor.querySelector("#campoInstitucionCompletar");
                marcarFaltante(campoInst, !campoInst.value.trim());
                if (campoInst.value.trim()) estado.institucion = campoInst.value.trim(); else faltantes.push("el nombre de tu institución");

                if (tipoInst === "colegio") {
                    const campoGrado = contenedor.querySelector("#campoGradoCompletar");
                    marcarFaltante(campoGrado, !campoGrado.value);
                    if (campoGrado.value) estado.grado = campoGrado.value; else faltantes.push("tu grado");
                }

                if (tipoInst === "universidad") {
                    const campoCarrera = contenedor.querySelector("#campoCarreraCompletar");
                    marcarFaltante(campoCarrera, !campoCarrera.value.trim());
                    if (campoCarrera.value.trim()) estado.carrera = campoCarrera.value.trim(); else faltantes.push("tu carrera");
                }

            }

            if (selectOcupacion.value === "otro") {
                const campoOtro = contenedor.querySelector("#campoOcupacionOtroCompletar");
                marcarFaltante(campoOtro, !campoOtro.value.trim());
                if (campoOtro.value.trim()) estado.ocupacionOtro = campoOtro.value.trim(); else faltantes.push("cuál es tu ocupación");
            }

        }

        if (faltantes.length > 0) {
            aviso.textContent = `Te falta ${faltantes.join(", ")}.`;
            aviso.style.display = "block";
            return;
        }

        aviso.style.display = "none";
        btnGuardar.disabled = true;
        btnGuardar.textContent = "Guardando…";

        const user = auth.currentUser;
        if (!user) return;

        const cambios = {};

        if (faltaTemas) cambios.generosLectura = estado.temas;

        if (faltaNivel) {
            const declaro = estado.nivelDeclarado !== "desconozco";
            cambios.nivelLectura = declaro ? { nivel: estado.nivelDeclarado, origen: "declarado" } : null;
            cambios.pendienteTestNivel = !declaro;
        }

        if (faltaProposito) {
            const proposito = { tipo: estado.proposito };
            if (estado.proposito === "libroCompleto") proposito.metaLibros = estado.metaLibros;
            if (estado.proposito === "otro") proposito.detalle = estado.propositoOtro;
            cambios.proposito = proposito;
        }

        if (faltaOcupacion) {

            const esEstudiante = estado.ocupacion === "estudiante";
            const ocupacion = { tipo: estado.ocupacion };

            if (esEstudiante) {
                ocupacion.institucionTipo = estado.institucionTipo;
                ocupacion.institucion = estado.institucion;
                if (estado.institucionTipo === "colegio") ocupacion.grado = estado.grado;
                if (estado.institucionTipo === "universidad") ocupacion.carrera = estado.carrera;
            }
            if (estado.ocupacion === "otro") ocupacion.detalle = estado.ocupacionOtro;

            cambios.ocupacion = ocupacion;

            // Mismos campos de compatibilidad que en el registro nuevo:
            // de ellos depende el ranking de colegios (ver puntos.js).
            cambios.tipo = esEstudiante ? "estudiante" : "particular";
            if (esEstudiante) {
                cambios.colegio = estado.institucion;
                cambios.grado = estado.institucionTipo === "colegio" ? estado.grado : estado.carrera;
            }

        }

        try {
            await db.collection("usuarios").doc(user.uid).update(cambios);
        } catch (error) {
            console.error("No se pudo guardar tu perfil:", error);
            aviso.textContent = "No se pudo guardar. Revisa tu conexión e intenta de nuevo.";
            aviso.style.display = "block";
            btnGuardar.disabled = false;
            btnGuardar.textContent = "Guardar y continuar";
            return;
        }

        if (faltaTemas) sumarContadoresTemas(estado.temas);

        if (alTerminar) alTerminar({ ...datos, ...cambios });

    });

}

function construirFormularioRegistro(contenedor, { alTerminar }) {

    const esc = (s) => String(s == null ? "" : s).replace(/"/g, "&quot;");

    // Estado del formulario (lo que se va llenando paso a paso).
    const estado = {
        temas: [],
        nivelDeclarado: null,      // 1..5, o "desconozco"
        proposito: null,
        metaLibros: null,
        propositoOtro: "",
        ocupacion: null,
        institucionTipo: null,
        institucion: "",
        grado: "",
        carrera: "",
        ocupacionOtro: ""
    };

    let contadoresTemas = {};
    let pasoActual = 1;
    const TOTAL_PASOS = 4;

    contenedor.innerHTML = `
        <div class="cajaAuth" style="max-width:520px;">
            <h1 style="margin-bottom:4px;">Un último paso</h1>
            <p id="subtituloRegistro" style="margin-bottom:6px;"></p>
            <div style="height:6px; background:var(--borde); border-radius:999px; margin:14px 0 20px; overflow:hidden;">
                <div id="barraProgresoRegistro" style="height:100%; width:25%; background:var(--azul); border-radius:999px; transition:width .25s ease;"></div>
            </div>

            <div id="cuerpoPasoRegistro" style="text-align:left;"></div>

            <p id="avisoRegistro" class="errorTexto" style="display:none; margin-top:12px;"></p>

            <div style="display:flex; gap:10px; margin-top:18px;">
                <button type="button" id="btnAtrasRegistro" style="flex:1; background:white; color:var(--azul); border:2px solid var(--azul); display:none;">Atrás</button>
                <button type="button" id="btnSiguienteRegistro" style="flex:2;">Siguiente</button>
            </div>
        </div>
    `;

    const cuerpo = contenedor.querySelector("#cuerpoPasoRegistro");
    const aviso = contenedor.querySelector("#avisoRegistro");
    const btnAtras = contenedor.querySelector("#btnAtrasRegistro");
    const btnSiguiente = contenedor.querySelector("#btnSiguienteRegistro");
    const barra = contenedor.querySelector("#barraProgresoRegistro");
    const subtitulo = contenedor.querySelector("#subtituloRegistro");

    function mostrarAviso(mensaje) {
        aviso.textContent = mensaje;
        aviso.style.display = mensaje ? "block" : "none";
    }

    // Marca en rojo los campos que faltan (y les quita la marca al
    // corregirlos), para que se vea de un vistazo cuáles son.
    function marcarFaltante(elemento, falta) {
        if (!elemento) return;
        elemento.style.borderColor = falta ? "#c0392b" : "";
        elemento.style.background = falta ? "#fdf1f0" : "";
    }

    // ---------------- PASO 1: TEMAS ----------------
    function pintarPaso1() {

        subtitulo.textContent = "¿Qué temas te gusta leer? Elige los que quieras.";

        cuerpo.innerHTML = `
            <div id="listaTemasRegistro" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px;">
                <p style="color:var(--texto-suave); font-size:13px; margin:0;">Cargando temas…</p>
            </div>

            <label style="display:block; font-weight:600; margin-bottom:6px;">¿No está el tuyo? Propón uno</label>
            <div style="display:flex; gap:8px;">
                <input type="text" id="campoTemaOtro" maxlength="40" placeholder="Ej. Mitología"
                       style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                <button type="button" id="btnProponerTema" style="width:auto; margin:0; padding:10px 16px;">Proponer</button>
            </div>
            <p id="estadoTemaOtro" style="font-size:13px; margin:8px 0 0;"></p>
        `;

        pintarChipsTemas();

        contenedor.querySelector("#btnProponerTema").addEventListener("click", proponerTemaNuevo);

    }

    function pintarChipsTemas() {

        const lista = contenedor.querySelector("#listaTemasRegistro");
        if (!lista) return;

        if (!GENEROS_LECTURA || GENEROS_LECTURA.length === 0) {
            lista.innerHTML = "<p style='color:var(--texto-suave); font-size:13px; margin:0;'>No se pudieron cargar los temas. Puedes elegirlos después desde tu perfil.</p>";
            return;
        }

        lista.innerHTML = GENEROS_LECTURA.map(tema => {
            const elegido = estado.temas.includes(tema);
            const cuantos = contadoresTemas[tema] || 0;
            return `
                <button type="button" class="chipTema ${elegido ? "chipTemaElegido" : ""}" data-tema="${esc(tema)}">
                    ${tema}
                    <span class="chipTemaConteo">${cuantos}</span>
                </button>
            `;
        }).join("");

        lista.querySelectorAll("[data-tema]").forEach(chip => {
            chip.addEventListener("click", () => {
                const tema = chip.dataset.tema;
                const i = estado.temas.indexOf(tema);
                if (i === -1) estado.temas.push(tema); else estado.temas.splice(i, 1);
                pintarChipsTemas();
                mostrarAviso("");
            });
        });

    }

    async function proponerTemaNuevo() {

        const campo = contenedor.querySelector("#campoTemaOtro");
        const estadoTema = contenedor.querySelector("#estadoTemaOtro");
        const boton = contenedor.querySelector("#btnProponerTema");
        const tema = campo.value.trim();

        if (tema.length < 3) {
            estadoTema.textContent = "Escribe un tema de al menos 3 letras.";
            estadoTema.style.color = "#c0392b";
            return;
        }

        if (typeof firebase.functions !== "function") {
            estadoTema.textContent = "No se puede revisar el tema en esta pantalla. Puedes agregarlo después desde tu perfil.";
            estadoTema.style.color = "#c0392b";
            return;
        }

        boton.disabled = true;
        estadoTema.textContent = "Revisando el tema…";
        estadoTema.style.color = "var(--texto-suave)";

        try {

            const llamar = firebase.functions().httpsCallable("moderarTemaIA");
            const { data } = await llamar({ tema });

            if (!data.apto) {
                estadoTema.textContent = `❌ ${data.motivo || "Ese tema no cumple con las normas de la comunidad."}`;
                estadoTema.style.color = "#c0392b";
            } else {
                // Aprobado: entra a la lista global (lo hizo la función) y
                // queda marcado de una vez para este usuario.
                if (!GENEROS_LECTURA.includes(data.tema)) GENEROS_LECTURA.push(data.tema);
                if (!estado.temas.includes(data.tema)) estado.temas.push(data.tema);
                campo.value = "";
                estadoTema.textContent = `✅ "${data.tema}" se agregó a la lista y quedó marcado como tuyo.`;
                estadoTema.style.color = "#2e9e5b";
                pintarChipsTemas();
            }

        } catch (error) {
            console.error("No se pudo revisar el tema:", error);
            estadoTema.textContent = "No se pudo revisar el tema ahora mismo. Intenta de nuevo en un momento.";
            estadoTema.style.color = "#c0392b";
        }

        boton.disabled = false;

    }

    // ---------------- PASO 2: NIVEL ----------------
    function pintarPaso2() {

        subtitulo.textContent = "¿Qué tan rápido y bien lees hoy?";

        cuerpo.innerHTML = `
            ${NIVELES_LECTURA.map(n => `
                <label class="opcionTipo" style="display:flex; gap:10px; align-items:flex-start; padding:10px; border:1px solid var(--borde); border-radius:10px; margin-bottom:8px;">
                    <input type="radio" name="nivelLectura" value="${n.nivel}" ${estado.nivelDeclarado === n.nivel ? "checked" : ""} style="margin-top:3px;">
                    <span>
                        <strong>Nivel ${n.nivel} — ${n.nombre}</strong>
                        <span style="display:block; font-size:13px; color:var(--texto-suave);">${n.descripcion}</span>
                    </span>
                </label>
            `).join("")}

            <label class="opcionTipo" style="display:flex; gap:10px; align-items:flex-start; padding:10px; border:2px dashed var(--azul); border-radius:10px; margin-top:12px;">
                <input type="radio" name="nivelLectura" value="desconozco" ${estado.nivelDeclarado === "desconozco" ? "checked" : ""} style="margin-top:3px;">
                <span>
                    <strong>Desconozco mi nivel</strong>
                    <span style="display:block; font-size:13px; color:var(--texto-suave);">
                        Al terminar el registro te llevamos a una lectura corta para medir tu velocidad y comprensión.
                    </span>
                </span>
            </label>
        `;

        cuerpo.querySelectorAll('input[name="nivelLectura"]').forEach(radio => {
            radio.addEventListener("change", () => {
                estado.nivelDeclarado = radio.value === "desconozco" ? "desconozco" : Number(radio.value);
                mostrarAviso("");
            });
        });

    }

    // ---------------- PASO 3: PROPÓSITO ----------------
    function pintarPaso3() {

        subtitulo.textContent = "¿Para qué vas a usar la app?";

        cuerpo.innerHTML = `
            ${PROPOSITOS.map(p => `
                <label class="opcionTipo" style="display:flex; gap:10px; align-items:center; padding:10px; border:1px solid var(--borde); border-radius:10px; margin-bottom:8px;">
                    <input type="radio" name="proposito" value="${p.valor}" ${estado.proposito === p.valor ? "checked" : ""}>
                    ${p.etiqueta}
                </label>
            `).join("")}

            <div id="cajaMetaLibros" style="display:${estado.proposito === "libroCompleto" ? "block" : "none"}; margin-top:10px;">
                <label style="display:block; font-weight:600; margin-bottom:6px;">¿Cuántos libros quieres leer?</label>
                <input type="number" id="campoMetaLibros" min="1" max="500" value="${estado.metaLibros || ""}"
                       placeholder="Ej. 3"
                       style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
            </div>

            <div id="cajaPropositoOtro" style="display:${estado.proposito === "otro" ? "block" : "none"}; margin-top:10px;">
                <label style="display:block; font-weight:600; margin-bottom:6px;">Cuéntanos para qué</label>
                <input type="text" id="campoPropositoOtro" maxlength="120" value="${esc(estado.propositoOtro)}"
                       placeholder="Escribe tu propósito"
                       style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
            </div>
        `;

        cuerpo.querySelectorAll('input[name="proposito"]').forEach(radio => {
            radio.addEventListener("change", () => {
                estado.proposito = radio.value;
                cuerpo.querySelector("#cajaMetaLibros").style.display = radio.value === "libroCompleto" ? "block" : "none";
                cuerpo.querySelector("#cajaPropositoOtro").style.display = radio.value === "otro" ? "block" : "none";
                mostrarAviso("");
            });
        });

    }

    // ---------------- PASO 4: DATOS PERSONALES ----------------
    function pintarPaso4() {

        subtitulo.textContent = "Por último, cuéntanos de ti.";

        cuerpo.innerHTML = `
            <label style="display:block; font-weight:600; margin-bottom:6px;">Ocupación</label>
            <select id="campoOcupacion" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde); margin-bottom:10px;">
                <option value="">Elige una…</option>
                ${OCUPACIONES.map(o => `<option value="${o.valor}" ${estado.ocupacion === o.valor ? "selected" : ""}>${o.etiqueta}</option>`).join("")}
            </select>

            <div id="cajaEstudiante" style="display:none; padding:12px; border:1px dashed var(--borde); border-radius:10px; margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:6px;">¿Dónde estudias?</label>
                <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto; margin-right:15px;">
                    <input type="radio" name="institucionTipo" value="colegio" ${estado.institucionTipo === "colegio" ? "checked" : ""}> Colegio
                </label>
                <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto;">
                    <input type="radio" name="institucionTipo" value="universidad" ${estado.institucionTipo === "universidad" ? "checked" : ""}> Universidad
                </label>

                <label style="display:block; font-weight:600; margin:12px 0 6px;">Nombre de la institución</label>
                <input type="text" id="campoInstitucion" value="${esc(estado.institucion)}"
                       placeholder="Escríbelo completo, igual que tus compañeros"
                       style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                <small style="display:block; color:#888; margin-top:4px;">
                    Escríbelo igual que tus compañeros para que sus puntos se sumen juntos en el ranking.
                </small>

                <div id="cajaGrado" style="display:none; margin-top:12px;">
                    <label style="display:block; font-weight:600; margin-bottom:6px;">Grado</label>
                    <select id="campoGradoRegistro" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);"></select>
                </div>

                <div id="cajaCarrera" style="display:none; margin-top:12px;">
                    <label style="display:block; font-weight:600; margin-bottom:6px;">Carrera</label>
                    <input type="text" id="campoCarrera" value="${esc(estado.carrera)}" placeholder="Ej. Ingeniería en Sistemas"
                           style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                </div>
            </div>

            <div id="cajaOcupacionOtro" style="display:none; margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:6px;">¿Cuál?</label>
                <input type="text" id="campoOcupacionOtro" maxlength="60" value="${esc(estado.ocupacionOtro)}"
                       placeholder="Escribe tu ocupación"
                       style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
            </div>

            <label style="display:block; font-weight:600; margin-bottom:6px;">Fecha de nacimiento</label>
            <input type="date" id="inputFechaNacimiento" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde); margin-bottom:12px;">

            <label style="display:block; font-weight:600; margin-bottom:6px;">País</label>
            <select id="inputPais" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde); margin-bottom:12px;"></select>

            <div id="grupoLenguaMaterna" style="display:none; margin-bottom:12px;">
                <label style="display:block; font-weight:600; margin-bottom:6px;">Lengua materna</label>
                <input type="text" id="inputLenguaMaterna" placeholder="Lengua materna"
                       style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
                <small style="display:block; color:#888; margin-top:4px;">Se llena sola con el idioma del país — cámbiala si hablas otro idioma o un dialecto.</small>
            </div>

            <label style="display:block; font-weight:600; margin-bottom:6px;">Género</label>
            <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto; margin-right:15px;">
                <input type="radio" name="generoRegistro" value="hombre"> Hombre
            </label>
            <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto;">
                <input type="radio" name="generoRegistro" value="mujer"> Mujer
            </label>
        `;

        const campoFecha = cuerpo.querySelector("#inputFechaNacimiento");
        campoFecha.max = new Date().toISOString().split("T")[0];

        const selectPais = cuerpo.querySelector("#inputPais");
        if (typeof renderizarSelectorPais === "function") {
            renderizarSelectorPais(selectPais, "");
            if (typeof activarAutocompletadoIdioma === "function") {
                activarAutocompletadoIdioma(
                    selectPais,
                    cuerpo.querySelector("#inputLenguaMaterna"),
                    cuerpo.querySelector("#grupoLenguaMaterna")
                );
            }
        }

        const selectGrado = cuerpo.querySelector("#campoGradoRegistro");
        if (selectGrado && typeof renderizarSelectorGrado === "function") {
            renderizarSelectorGrado(selectGrado, estado.grado || "");
        }

        function actualizarCajasOcupacion() {

            const valor = cuerpo.querySelector("#campoOcupacion").value;
            estado.ocupacion = valor || null;

            cuerpo.querySelector("#cajaEstudiante").style.display = valor === "estudiante" ? "block" : "none";
            cuerpo.querySelector("#cajaOcupacionOtro").style.display = valor === "otro" ? "block" : "none";

            const tipoInstitucion = (cuerpo.querySelector('input[name="institucionTipo"]:checked') || {}).value || null;
            estado.institucionTipo = tipoInstitucion;
            cuerpo.querySelector("#cajaGrado").style.display = tipoInstitucion === "colegio" ? "block" : "none";
            cuerpo.querySelector("#cajaCarrera").style.display = tipoInstitucion === "universidad" ? "block" : "none";

        }

        cuerpo.querySelector("#campoOcupacion").addEventListener("change", () => {
            actualizarCajasOcupacion();
            mostrarAviso("");
        });

        cuerpo.querySelectorAll('input[name="institucionTipo"]').forEach(radio => {
            radio.addEventListener("change", () => {
                actualizarCajasOcupacion();
                mostrarAviso("");
            });
        });

        actualizarCajasOcupacion();

    }

    // ---------------- VALIDACIÓN POR PASO ----------------
    function validarPaso() {

        const faltantes = [];

        if (pasoActual === 1) {
            if (estado.temas.length === 0) faltantes.push("al menos un tema de interés");
        }

        if (pasoActual === 2) {
            if (estado.nivelDeclarado === null) faltantes.push("tu nivel de lectura");
        }

        if (pasoActual === 3) {

            if (!estado.proposito) {
                faltantes.push("tu propósito");
            } else if (estado.proposito === "libroCompleto") {
                const campo = cuerpo.querySelector("#campoMetaLibros");
                const meta = Number(campo.value);
                const falta = !(meta >= 1);
                marcarFaltante(campo, falta);
                if (falta) faltantes.push("cuántos libros quieres leer");
                else estado.metaLibros = meta;
            } else if (estado.proposito === "otro") {
                const campo = cuerpo.querySelector("#campoPropositoOtro");
                const falta = !campo.value.trim();
                marcarFaltante(campo, falta);
                if (falta) faltantes.push("para qué vas a usar la app");
                else estado.propositoOtro = campo.value.trim();
            }

        }

        if (pasoActual === 4) {

            const campoOcupacion = cuerpo.querySelector("#campoOcupacion");
            const faltaOcupacion = !campoOcupacion.value;
            marcarFaltante(campoOcupacion, faltaOcupacion);
            if (faltaOcupacion) faltantes.push("tu ocupación");

            if (campoOcupacion.value === "estudiante") {

                const tipoInst = (cuerpo.querySelector('input[name="institucionTipo"]:checked') || {}).value;
                if (!tipoInst) faltantes.push("si estudias en colegio o universidad");
                estado.institucionTipo = tipoInst || null;

                const campoInst = cuerpo.querySelector("#campoInstitucion");
                const faltaInst = !campoInst.value.trim();
                marcarFaltante(campoInst, faltaInst);
                if (faltaInst) faltantes.push("el nombre de tu institución");
                else estado.institucion = campoInst.value.trim();

                if (tipoInst === "colegio") {
                    const campoGrado = cuerpo.querySelector("#campoGradoRegistro");
                    const faltaGrado = !campoGrado.value;
                    marcarFaltante(campoGrado, faltaGrado);
                    if (faltaGrado) faltantes.push("tu grado");
                    else estado.grado = campoGrado.value;
                }

                if (tipoInst === "universidad") {
                    const campoCarrera = cuerpo.querySelector("#campoCarrera");
                    const faltaCarrera = !campoCarrera.value.trim();
                    marcarFaltante(campoCarrera, faltaCarrera);
                    if (faltaCarrera) faltantes.push("tu carrera");
                    else estado.carrera = campoCarrera.value.trim();
                }

            }

            if (campoOcupacion.value === "otro") {
                const campoOtro = cuerpo.querySelector("#campoOcupacionOtro");
                const falta = !campoOtro.value.trim();
                marcarFaltante(campoOtro, falta);
                if (falta) faltantes.push("cuál es tu ocupación");
                else estado.ocupacionOtro = campoOtro.value.trim();
            }

            const campoFecha = cuerpo.querySelector("#inputFechaNacimiento");
            const faltaFecha = !campoFecha.value;
            marcarFaltante(campoFecha, faltaFecha);
            if (faltaFecha) faltantes.push("tu fecha de nacimiento");

            // El valor real vive en el <select id="inputPais">, pero ese
            // queda OCULTO: renderizarSelectorPais (ver paises.js) pinta
            // un combobox visible al lado. Se lee del select y se marca
            // el combobox, que es lo que el usuario ve.
            const campoPais = cuerpo.querySelector("#inputPais");
            const comboPais = cuerpo.querySelector(".comboPaisInput");
            const faltaPais = !campoPais.value;
            marcarFaltante(comboPais || campoPais, faltaPais);
            if (faltaPais) faltantes.push("tu país");

            const generoMarcado = cuerpo.querySelector('input[name="generoRegistro"]:checked');
            if (!generoMarcado) faltantes.push("tu género");

        }

        if (faltantes.length > 0) {
            mostrarAviso(`Te falta ${faltantes.join(", ")}.`);
            return false;
        }

        mostrarAviso("");
        return true;

    }

    // ---------------- NAVEGACIÓN ----------------
    function pintarPaso() {

        mostrarAviso("");
        barra.style.width = `${(pasoActual / TOTAL_PASOS) * 100}%`;
        btnAtras.style.display = pasoActual === 1 ? "none" : "block";
        btnSiguiente.textContent = pasoActual === TOTAL_PASOS ? "Terminar registro" : "Siguiente";

        if (pasoActual === 1) pintarPaso1();
        if (pasoActual === 2) pintarPaso2();
        if (pasoActual === 3) pintarPaso3();
        if (pasoActual === 4) pintarPaso4();

    }

    btnAtras.addEventListener("click", () => {
        if (pasoActual > 1) { pasoActual--; pintarPaso(); }
    });

    btnSiguiente.addEventListener("click", async () => {

        if (!validarPaso()) return;

        if (pasoActual < TOTAL_PASOS) {
            pasoActual++;
            pintarPaso();
            return;
        }

        await guardarRegistro();

    });

    // ---------------- GUARDADO ----------------
    async function guardarRegistro() {

        const user = auth.currentUser;
        if (!user) return;

        btnSiguiente.disabled = true;
        btnSiguiente.textContent = "Guardando…";

        const fechaNacimiento = cuerpo.querySelector("#inputFechaNacimiento").value;
        const generoMarcado = cuerpo.querySelector('input[name="generoRegistro"]:checked');
        const esEstudiante = estado.ocupacion === "estudiante";

        // Ocupación estructurada, pensada para poder agruparla después en
        // las estadísticas sin tener que interpretar texto libre.
        const ocupacion = { tipo: estado.ocupacion };
        if (esEstudiante) {
            ocupacion.institucionTipo = estado.institucionTipo;
            ocupacion.institucion = estado.institucion;
            if (estado.institucionTipo === "colegio") ocupacion.grado = estado.grado;
            if (estado.institucionTipo === "universidad") ocupacion.carrera = estado.carrera;
        }
        if (estado.ocupacion === "otro") ocupacion.detalle = estado.ocupacionOtro;

        const proposito = { tipo: estado.proposito };
        if (estado.proposito === "libroCompleto") proposito.metaLibros = estado.metaLibros;
        if (estado.proposito === "otro") proposito.detalle = estado.propositoOtro;

        const declaroNivel = estado.nivelDeclarado !== "desconozco";

        const datosUsuario = {
            nombre: user.displayName || "",
            email: user.email || "",
            puntosTotales: 0,
            fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),

            // Temas de interés (mismo campo de siempre: de él dependen
            // Sugerencias y el QR personalizado).
            generosLectura: estado.temas,

            ocupacion: ocupacion,
            proposito: proposito,

            // Nivel del LECTOR (1..5). Si no lo sabe, queda pendiente y al
            // entrar se le manda al test de ubicación (ver test-nivel.js).
            nivelLectura: declaroNivel
                ? { nivel: estado.nivelDeclarado, origen: "declarado" }
                : null,
            pendienteTestNivel: !declaroNivel,

            fechaNacimiento: fechaNacimiento || null,
            edadPerfil: fechaNacimiento ? calcularEdadDesdeFecha(fechaNacimiento) : null,
            genero: generoMarcado ? generoMarcado.value : null,
            pais: cuerpo.querySelector("#inputPais").value,
            lenguaMaterna: (typeof capitalizarLengua === "function")
                ? capitalizarLengua(cuerpo.querySelector("#inputLenguaMaterna").value)
                : (cuerpo.querySelector("#inputLenguaMaterna").value || "").trim(),

            // COMPATIBILIDAD con el ranking de colegios, que agrupa por
            // "tipo" + "colegio" + "grado" (ver puntos.js). Un universitario
            // también compite, con su carrera en el lugar del grado.
            tipo: esEstudiante ? "estudiante" : "particular"
        };

        if (esEstudiante) {
            datosUsuario.colegio = estado.institucion;
            datosUsuario.grado = estado.institucionTipo === "colegio" ? estado.grado : estado.carrera;
        }

        try {
            await db.collection("usuarios").doc(user.uid).set(datosUsuario);
        } catch (error) {
            console.error("No se pudo guardar tu registro:", error);
            mostrarAviso("No se pudo guardar tu registro. Revisa tu conexión e intenta de nuevo.");
            btnSiguiente.disabled = false;
            btnSiguiente.textContent = "Terminar registro";
            return;
        }

        // Contadores de temas: después de guardar, y sin bloquear —
        // que fallen no debe romper un registro que ya quedó hecho.
        sumarContadoresTemas(estado.temas);

        if (alTerminar) alTerminar(datosUsuario);

    }

    // Arranque: se pinta el paso 1 de una vez y los temas se cargan
    // encima cuando llegan, para no dejar la pantalla en blanco.
    pintarPaso();

    Promise.all([cargarGenerosLectura(), cargarContadoresTemas()])
        .then(([, conteos]) => {
            contadoresTemas = conteos;
            if (pasoActual === 1) pintarChipsTemas();
        })
        .catch(error => console.error("No se pudieron cargar los temas:", error));

}
