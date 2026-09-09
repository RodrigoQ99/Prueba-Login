// ==========================================================
// EXAMEN ESCOLAR CON ANTI-TRAMPAS
// ==========================================================
// Pantalla fullscreen de evaluación para las tareas escolares.
// Incluye:
// - Temporizador descendente configurable por el docente.
// - Preguntas seleccionadas al azar del banco de la tarea.
// - Cada alumno recibe una combinación diferente.
// - Detección de cambio de pestaña/foco: anula el examen.
// - Detección de tiempo sospechoso: marca como sospechosa.
// - Penalización automática en el sistema de gamificación.
// ==========================================================

const pantallaLogin = document.getElementById("pantallaLoginExamen");
const contenedorExamen = document.getElementById("contenedorExamen");

let _tarea = null;
let _preguntasExamen = [];
let _respuestasUsuario = {};
let _tiempoRestante = 0;
let _intervaloTemporizador = null;
let _tiempoInicioExamen = null;
let _examenAnulado = false;
let _examenEnviado = false;

const SEGUNDOS_MIN_POR_PREGUNTA = 5; // umbral anti-trampas
const PENALIZACION_PUNTOS = 25; // puntos a restar por trampa

document.getElementById("btnLoginGoogle").addEventListener("click", () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => console.error(e));
});

auth.onAuthStateChanged(async (user) => {
    pantallaLogin.style.display = "none";
    contenedorExamen.style.display = "none";

    if (!user) { pantallaLogin.style.display = "flex"; return; }

    // Obtener el ID de la tarea desde la URL
    const params = new URLSearchParams(window.location.search);
    const tareaId = params.get("tarea");

    if (!tareaId) {
        contenedorExamen.style.display = "block";
        contenedorExamen.innerHTML = '<div class="panelRol"><h1>❌ Error</h1><p>No se especificó ninguna tarea.</p><a href="progreso-academico.html">Volver</a></div>';
        return;
    }

    try {

        // Verificar que no haya ya un intento
        const intentoPrevio = await db.collection("progresoEscolar").doc(`${user.uid}_${tareaId}`).get();
        if (intentoPrevio.exists) {
            contenedorExamen.style.display = "block";
            contenedorExamen.innerHTML = '<div class="panelRol"><h1>✅ Ya completada</h1><p>Ya realizaste esta evaluación.</p><a href="progreso-academico.html" class="botonAdminContorno" style="display:inline-block; margin-top:20px; padding:12px 22px; border-radius:12px; text-decoration:none;">Volver</a></div>';
            return;
        }

        // Cargar tarea
        const tareaDoc = await db.collection("tareasEscolares").doc(tareaId).get();
        if (!tareaDoc.exists) {
            contenedorExamen.style.display = "block";
            contenedorExamen.innerHTML = '<div class="panelRol"><h1>❌ Error</h1><p>La tarea no existe.</p><a href="progreso-academico.html">Volver</a></div>';
            return;
        }

        _tarea = { id: tareaId, ...tareaDoc.data() };

        // Seleccionar preguntas al azar del banco
        const banco = _tarea.bancoPreguntas || [];
        const cantidad = _tarea.cantidadPreguntas || 5;
        _preguntasExamen = elegirPreguntasAlAzar(banco, cantidad);

        if (_preguntasExamen.length === 0) {
            contenedorExamen.style.display = "block";
            contenedorExamen.innerHTML = '<div class="panelRol"><h1>⚠️ Sin preguntas</h1><p>Esta tarea no tiene preguntas disponibles. Contacta a tu maestro.</p><a href="progreso-academico.html">Volver</a></div>';
            return;
        }

        // Iniciar examen
        iniciarExamen();

    } catch (error) {
        console.error("Error al cargar examen:", error);
        contenedorExamen.style.display = "block";
        contenedorExamen.innerHTML = '<div class="panelRol"><h1>❌ Error</h1><p>No se pudo cargar la evaluación.</p></div>';
    }
});


function iniciarExamen() {

    _tiempoInicioExamen = Date.now();
    _tiempoRestante = (_tarea.tiempoExamenMinutos || 15) * 60;
    _examenAnulado = false;
    _examenEnviado = false;

    // Renderizar UI fullscreen
    contenedorExamen.style.display = "block";
    contenedorExamen.innerHTML = `
        <div class="examenFullscreen">
            <div class="cabeceraExamen">
                <span>📝 ${_tarea.titulo || "Evaluación"}</span>
                <span class="temporizadorExamen" id="temporizadorExamen"></span>
            </div>
            <div class="cuerpoExamen" id="cuerpoExamen"></div>
        </div>
    `;

    renderizarPreguntas();
    iniciarTemporizador();
    activarAntiTrampas();

}


function renderizarPreguntas() {

    const cuerpo = document.getElementById("cuerpoExamen");
    let html = '';

    _preguntasExamen.forEach((pregunta, i) => {

        const tipo = pregunta.tipo || "opcionMultiple";

        html += `<div class="preguntaExamen" data-indice="${i}">`;
        html += `<p class="numeroPregunta">Pregunta ${i + 1} de ${_preguntasExamen.length}</p>`;
        html += `<p class="textoPregunta">${pregunta.pregunta || pregunta.texto || ''}</p>`;

        if (tipo === "opcionMultiple" || tipo === "multiple") {

            const { opciones } = armarOpcionesOpcionMultiple(pregunta);
            html += '<div class="opcionesExamen">';
            opciones.forEach(opcion => {
                html += `
                    <label class="opcionExamen" data-pregunta="${i}" data-valor="${opcion.valor}">
                        <input type="radio" name="pregunta_${i}" value="${opcion.valor}">
                        ${opcion.texto}
                    </label>
                `;
            });
            html += '</div>';

        } else if (tipo === "verdaderoFalso") {

            html += '<div class="opcionesExamen">';
            html += `
                <label class="opcionExamen" data-pregunta="${i}" data-valor="verdadero">
                    <input type="radio" name="pregunta_${i}" value="verdadero"> Verdadero
                </label>
                <label class="opcionExamen" data-pregunta="${i}" data-valor="falso">
                    <input type="radio" name="pregunta_${i}" value="falso"> Falso
                </label>
            `;
            html += '</div>';

        } else if (tipo === "completar") {

            html += `<input type="text" class="inputCompletar" data-pregunta="${i}"
                     placeholder="Escribe tu respuesta…"
                     style="width:100%; padding:12px; border:2px solid var(--borde); border-radius:10px; font-size:14px;">`;

        }

        html += '</div>';
    });

    html += `
        <button type="button" id="btnEnviarExamen" class="botonAdminChico"
                style="width:100%; padding:16px; font-size:16px; margin-top:20px;">
            ✅ Enviar respuestas
        </button>
    `;

    cuerpo.innerHTML = html;

    // Eventos de selección visual
    cuerpo.querySelectorAll(".opcionExamen").forEach(label => {
        label.addEventListener("click", () => {
            const grupo = label.dataset.pregunta;
            cuerpo.querySelectorAll(`[data-pregunta="${grupo}"].opcionExamen`)
                .forEach(l => l.classList.remove("seleccionada"));
            label.classList.add("seleccionada");
            label.querySelector("input").checked = true;
        });
    });

    // Enviar
    document.getElementById("btnEnviarExamen").addEventListener("click", enviarExamen);

}


function iniciarTemporizador() {

    const el = document.getElementById("temporizadorExamen");
    actualizarDisplayTemporizador(el);

    _intervaloTemporizador = setInterval(() => {

        _tiempoRestante--;
        actualizarDisplayTemporizador(el);

        // Advertencia cuando queda menos de 1 minuto
        if (_tiempoRestante <= 60) {
            el.classList.add("advertencia");
        }

        // Tiempo agotado
        if (_tiempoRestante <= 0) {
            clearInterval(_intervaloTemporizador);
            if (!_examenEnviado && !_examenAnulado) {
                enviarExamen();
            }
        }

    }, 1000);

}


function actualizarDisplayTemporizador(el) {
    const min = Math.floor(Math.max(0, _tiempoRestante) / 60);
    const seg = Math.max(0, _tiempoRestante) % 60;
    el.textContent = `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}


// ==========================================================
// SISTEMA ANTI-TRAMPAS
// ==========================================================

function activarAntiTrampas() {

    // Detección de cambio de pestaña/foco
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && !_examenAnulado && !_examenEnviado) {
            anularExamen("cambio_pestana");
        }
    });

    window.addEventListener("blur", () => {
        if (!_examenAnulado && !_examenEnviado) {
            anularExamen("cambio_pestana");
        }
    });

}


async function anularExamen(motivo) {

    _examenAnulado = true;
    clearInterval(_intervaloTemporizador);

    const user = auth.currentUser;
    if (!user || !_tarea) return;

    try {

        // Guardar el intento como anulado
        await db.collection("progresoEscolar").doc(`${user.uid}_${_tarea.id}`).set({
            uid: user.uid,
            tareaId: _tarea.id,
            colegioId: _tarea.colegioId,
            seccionId: _tarea.seccionId,
            preguntasRecibidas: _preguntasExamen.map(p => p.pregunta || p.texto || ''),
            respuestas: [],
            correctas: 0,
            totalPreguntas: _preguntasExamen.length,
            ppmRegistrado: null,
            comprensionPorcentaje: 0,
            tiempoSegundos: Math.round((Date.now() - _tiempoInicioExamen) / 1000),
            estado: "anulada",
            motivoEstado: motivo,
            penalizacionAplicada: PENALIZACION_PUNTOS,
            fechaInicio: new Date(_tiempoInicioExamen),
            fechaEntrega: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Penalización: restar puntos del sistema de gamificación
        await db.collection("usuarios").doc(user.uid).update({
            puntosTotales: firebase.firestore.FieldValue.increment(-PENALIZACION_PUNTOS)
        }).catch(() => {});

    } catch (error) {
        console.error("Error al anular examen:", error);
    }

    // Mostrar pantalla de anulación
    contenedorExamen.innerHTML = `
        <div class="panelRol" style="text-align:center; padding-top:80px;">
            <h1 style="color:#c0392b;">❌ Evaluación anulada</h1>
            <p style="margin:20px 0; color:var(--texto-suave);">
                ${motivo === "cambio_pestana"
                    ? "Saliste de la pestaña durante la evaluación. El examen ha sido anulado automáticamente."
                    : "El examen fue anulado."}
            </p>
            <p style="color:#c0392b; font-weight:600;">Se han restado ${PENALIZACION_PUNTOS} puntos de tu puntaje.</p>
            <a href="progreso-academico.html" class="botonAdminContorno"
               style="display:inline-block; margin-top:30px; padding:12px 22px; border-radius:12px; text-decoration:none;">
                Volver al progreso
            </a>
        </div>
    `;

}


async function enviarExamen() {

    if (_examenAnulado || _examenEnviado) return;
    _examenEnviado = true;
    clearInterval(_intervaloTemporizador);

    const user = auth.currentUser;
    if (!user || !_tarea) return;

    const tiempoTotal = Math.round((Date.now() - _tiempoInicioExamen) / 1000);

    // Recopilar respuestas
    const respuestas = [];
    let correctas = 0;

    _preguntasExamen.forEach((pregunta, i) => {

        const tipo = pregunta.tipo || "opcionMultiple";
        let respuestaUsuario = null;
        let esCorrecta = false;

        if (tipo === "opcionMultiple" || tipo === "multiple") {

            const radio = document.querySelector(`input[name="pregunta_${i}"]:checked`);
            respuestaUsuario = radio ? radio.value : null;

            const { correcta } = armarOpcionesOpcionMultiple(pregunta);
            // La correcta ya se calculó al renderizar, pero necesitamos
            // compararla. Usamos respuestaCorrecta del banco.
            const opcionCorrecta = pregunta.respuestaCorrecta || pregunta.correcta;
            const opcionElegida = radio ? radio.parentElement.textContent.trim() : null;
            esCorrecta = opcionElegida && opcionCorrecta &&
                opcionElegida.toLowerCase().includes(opcionCorrecta.toLowerCase().substring(0, 20));

        } else if (tipo === "verdaderoFalso") {

            const radio = document.querySelector(`input[name="pregunta_${i}"]:checked`);
            respuestaUsuario = radio ? radio.value : null;
            const correctaVF = (pregunta.respuestaCorrecta || pregunta.correcta || "").toLowerCase();
            esCorrecta = respuestaUsuario === correctaVF;

        } else if (tipo === "completar") {

            const input = document.querySelector(`.inputCompletar[data-pregunta="${i}"]`);
            respuestaUsuario = input ? input.value.trim() : null;
            const correctaC = (pregunta.respuestaCorrecta || pregunta.correcta || "").toLowerCase().trim();
            esCorrecta = respuestaUsuario && respuestaUsuario.toLowerCase() === correctaC;

        }

        if (esCorrecta) correctas++;

        respuestas.push({
            preguntaTexto: pregunta.pregunta || pregunta.texto || '',
            respuestaUsuario: respuestaUsuario,
            esCorrecta: esCorrecta
        });

    });

    const comprensionPct = _preguntasExamen.length > 0
        ? Math.round((correctas / _preguntasExamen.length) * 100)
        : 0;

    // Detección de tiempo sospechoso
    const tiempoMinEsperado = _preguntasExamen.length * SEGUNDOS_MIN_POR_PREGUNTA;
    let estado = "completada";
    let motivoEstado = null;
    let penalizacion = 0;

    if (tiempoTotal < tiempoMinEsperado) {
        estado = "sospechosa";
        motivoEstado = "tiempo_sospechoso";
        penalizacion = PENALIZACION_PUNTOS;
    }

    try {

        await db.collection("progresoEscolar").doc(`${user.uid}_${_tarea.id}`).set({
            uid: user.uid,
            tareaId: _tarea.id,
            colegioId: _tarea.colegioId,
            seccionId: _tarea.seccionId,
            preguntasRecibidas: _preguntasExamen.map(p => p.pregunta || p.texto || ''),
            respuestas: respuestas,
            correctas: correctas,
            totalPreguntas: _preguntasExamen.length,
            ppmRegistrado: null,
            comprensionPorcentaje: comprensionPct,
            tiempoSegundos: tiempoTotal,
            estado: estado,
            motivoEstado: motivoEstado,
            penalizacionAplicada: penalizacion,
            fechaInicio: new Date(_tiempoInicioExamen),
            fechaEntrega: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Si es sospechosa, aplicar penalización
        if (penalizacion > 0) {
            await db.collection("usuarios").doc(user.uid).update({
                puntosTotales: firebase.firestore.FieldValue.increment(-penalizacion)
            }).catch(() => {});
        }

    } catch (error) {
        console.error("Error al guardar resultado:", error);
    }

    // Mostrar resultado
    contenedorExamen.innerHTML = `
        <div class="panelRol" style="text-align:center; padding-top:60px;">
            <h1>${estado === "sospechosa" ? "⚠️ En revisión" : "✅ Evaluación completada"}</h1>
            <div class="tarjetaSeccion" style="margin:24px auto; max-width:400px;">
                <p style="font-size:48px; margin-bottom:10px;">${comprensionPct >= 70 ? '🌟' : comprensionPct >= 40 ? '👍' : '💪'}</p>
                <p style="font-size:24px; font-weight:800; color:var(--azul);">${correctas} / ${_preguntasExamen.length}</p>
                <p style="color:var(--texto-suave); margin-top:6px;">Comprensión: ${comprensionPct}%</p>
                <p style="color:var(--texto-suave); font-size:13px;">Tiempo: ${Math.floor(tiempoTotal / 60)}m ${tiempoTotal % 60}s</p>
                ${estado === "sospechosa" ? `
                    <p style="color:#e67e22; margin-top:10px; font-weight:600;">
                        ⚠️ Respondiste en un tiempo sospechosamente rápido.
                        Tu prueba será revisada por tu maestro.
                    </p>
                    <p style="color:#c0392b; font-size:13px;">Se restaron ${penalizacion} puntos.</p>
                ` : ''}
            </div>
            <a href="progreso-academico.html" class="botonAdminContorno"
               style="display:inline-block; margin-top:20px; padding:12px 22px; border-radius:12px; text-decoration:none;">
                Volver al progreso
            </a>
        </div>
    `;

}
