// ==========================================================
// LECTURA LIBRE (desde "Sugerencias" en Lecturas)
// ==========================================================
// A diferencia de lectura.html (motor.js), aquí NO hay cronómetro, NO
// se exige haber desbloqueado con código, y NO se otorgan puntos,
// premios ni racha — es una lectura de descubrimiento libre, a su
// propio ritmo. Solo cuenta como "vista" (mismo contador que usa
// motor.js, ver "Mis publicaciones" en perfil.js).
//
// El cuestionario (si la lectura tiene preguntas) es un autochequeo:
// se califica EN MEMORIA, igual que la vista previa del administrador
// (ver admin.js, abrirVistaPreviaLectura) — nunca se guarda
// en "progreso" ni afecta ranking.
// ==========================================================

const parametrosLibre = new URLSearchParams(window.location.search);
const idLecturaLibre = parametrosLibre.get("id");

async function iniciarLecturaLibre() {

    const cont = document.getElementById("cuerpoLecturaLibre");
    const tituloEl = document.getElementById("tituloLecturaLibre");

    if (!idLecturaLibre) {
        tituloEl.textContent = "Lectura no encontrada";
        cont.innerHTML = "<p style='text-align:center;'>Falta el ID de la lectura.</p>";
        return;
    }

    let lectura;

    try {
        const doc = await db.collection("lecturas").doc(idLecturaLibre).get();
        if (!doc.exists) {
            tituloEl.textContent = "Lectura no encontrada";
            cont.innerHTML = "<p style='text-align:center;'>Esta lectura ya no está disponible.</p>";
            return;
        }
        lectura = { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error("No se pudo cargar la lectura:", error);
        tituloEl.textContent = "Error";
        cont.innerHTML = "<p style='text-align:center;'>Ocurrió un error al cargar la lectura.</p>";
        return;
    }

    document.title = lectura.titulo;
    tituloEl.textContent = lectura.titulo;

    // Cuenta esta apertura como "vista" — mismo contador que usa
    // motor.js, sin afectar puntos/racha/ranking.
    db.collection("lecturas").doc(lectura.id)
        .update({ vistas: firebase.firestore.FieldValue.increment(1) })
        .catch(error => console.error("No se pudo registrar la vista de esta lectura:", error));

    const preguntas = lectura.bancoPreguntas || [];

    cont.innerHTML = `
        ${lectura.autorNombre ? `<p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">✍️ Por ${lectura.autorNombre}</p>` : ""}
        <div style="text-align:left; margin-bottom:25px;">
            ${(lectura.texto || []).map(p => `<p style="margin-bottom:14px;">${p}</p>`).join("")}
        </div>
        ${preguntas.length > 0 ? `
            <h3>Ponte a prueba (opcional)</h3>
            <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                Solo para comprobar cuánto entendiste — no suma puntos.
            </p>
            <div id="preguntasLecturaLibre" style="text-align:left;"></div>
            <button type="button" id="btnCalificarLecturaLibre" style="margin-top:15px;">Ver resultado</button>
            <p id="resultadoLecturaLibre" style="display:none; text-align:center; font-weight:700; margin-top:15px;"></p>
        ` : ""}
    `;

    if (preguntas.length === 0) return;

    const contPreguntas = document.getElementById("preguntasLecturaLibre");
    contPreguntas.innerHTML = preguntas.map((pregunta, pi) => {

        const tipo = pregunta.tipo || "opcionMultiple";
        let cuerpo = "";

        if (tipo === "vf") {
            cuerpo = `
                <label style="display:block; margin-bottom:4px;"><input type="radio" name="preguntaLibre${pi}" value="true"> Verdadero</label>
                <label style="display:block; margin-bottom:4px;"><input type="radio" name="preguntaLibre${pi}" value="false"> Falso</label>
            `;
        } else if (tipo === "completar" || tipo === "textoLibre") {
            cuerpo = `
                <input type="text" id="respuestaLibreTexto-${pi}" autocomplete="off" placeholder="Escribe tu respuesta"
                       style="width:100%; max-width:320px; padding:8px; border-radius:8px; border:1px solid var(--borde); box-sizing:border-box;">
            `;
        } else if (tipo === "ordenar") {
            pregunta._ordenActual = pregunta._ordenActual || barajarArrayLecturaLibre(pregunta.partes);
            cuerpo = `<div id="ordenarLibre-${pi}">${renderizarOrdenarLecturaLibre(pregunta, pi)}</div>`;
        } else {

            if (!pregunta._opcionesMostradas) {
                const armadas = armarOpcionesOpcionMultiple(pregunta);
                pregunta._opcionesMostradas = armadas.opciones;
                pregunta._correctaMostrada = armadas.correcta;
            }

            cuerpo = pregunta._opcionesMostradas.map(opcion => `
                <label style="display:block; margin-bottom:4px;">
                    <input type="radio" name="preguntaLibre${pi}" value="${opcion.valor}">
                    ${opcion.texto}
                </label>
            `).join("");

        }

        return `
            <div style="margin-bottom:15px;">
                <p style="font-weight:600; margin-bottom:6px;">${pi + 1}. ${pregunta.pregunta}</p>
                ${cuerpo}
            </div>
        `;

    }).join("");

    contPreguntas.addEventListener("click", (e) => {

        const btn = e.target.closest("[data-accion='mover-parte-arriba'], [data-accion='mover-parte-abajo']");
        if (!btn) return;

        const pi = Number(btn.dataset.indice);
        const oi = Number(btn.dataset.oi);
        const pregunta = preguntas[pi];
        const destino = btn.dataset.accion === "mover-parte-arriba" ? oi - 1 : oi + 1;

        if (destino < 0 || destino >= pregunta._ordenActual.length) return;

        [pregunta._ordenActual[oi], pregunta._ordenActual[destino]] =
            [pregunta._ordenActual[destino], pregunta._ordenActual[oi]];

        document.getElementById(`ordenarLibre-${pi}`).innerHTML = renderizarOrdenarLecturaLibre(pregunta, pi);

    });

    document.getElementById("btnCalificarLecturaLibre").addEventListener("click", () => {

        let correctas = 0;

        preguntas.forEach((pregunta, pi) => {

            const tipo = pregunta.tipo || "opcionMultiple";
            let acerto = false;

            if (tipo === "vf") {
                const marcada = document.querySelector(`input[name="preguntaLibre${pi}"]:checked`);
                acerto = !!marcada && (marcada.value === "true") === pregunta.correcta;
            } else if (tipo === "completar" || tipo === "textoLibre") {
                const campo = document.getElementById(`respuestaLibreTexto-${pi}`);
                const dada = normalizarTextoLecturaLibre(campo ? campo.value : "");
                acerto = dada.length > 0 && pregunta.respuestasValidas.some(
                    valida => normalizarTextoLecturaLibre(valida) === dada
                );
            } else if (tipo === "ordenar") {
                const actual = pregunta._ordenActual || pregunta.partes;
                acerto = actual.length === pregunta.partes.length
                    && actual.every((parte, i) => parte === pregunta.partes[i]);
            } else {
                const marcada = document.querySelector(`input[name="preguntaLibre${pi}"]:checked`);
                const correcta = pregunta._correctaMostrada || pregunta.correcta;
                acerto = !!marcada && marcada.value === correcta;
            }

            if (acerto) correctas++;

            mostrarRespuestaCorrectaLibre(pi, pregunta, tipo, acerto);

        });

        const resultado = document.getElementById("resultadoLecturaLibre");
        resultado.style.display = "block";
        resultado.textContent = `${correctas} de ${preguntas.length} correctas`;

    });

}

// Utilidades de tipos de pregunta (Etapa 34) — mismo criterio que
// motor.js/motor-mejorar.js, duplicadas porque esta pantalla nunca
// coincide con esas otras en la misma página.

function barajarArrayLecturaLibre(arreglo) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function normalizarTextoLecturaLibre(s) {
    return String(s == null ? "" : s)
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/\s+/g, " ");
}

function textoRespuestaCorrectaLibre(pregunta, tipo) {

    if (tipo === "vf") return pregunta.correcta ? "Verdadero" : "Falso";

    if (tipo === "completar" || tipo === "textoLibre") {
        return (pregunta.respuestasValidas || []).join(" / ");
    }

    if (tipo === "ordenar") {
        return (pregunta.partes || []).join(" → ");
    }

    if (pregunta.respuestaCorrecta) return pregunta.respuestaCorrecta;

    const opciones = pregunta._opcionesMostradas || pregunta.opciones || [];
    const opcion = opciones.find(o => o.valor === (pregunta._correctaMostrada || pregunta.correcta));
    return opcion ? opcion.texto : "";

}

function mostrarRespuestaCorrectaLibre(pi, pregunta, tipo, acerto) {

    const contPregunta = document.getElementById("preguntasLecturaLibre").children[pi];
    if (!contPregunta) return;

    contPregunta.insertAdjacentHTML("beforeend", `
        <p style="margin-top:8px; font-size:13px; ${acerto ? "color:#2e9e5b;" : "color:#c0392b;"}">
            ${acerto ? "✅" : "❌"} Respuesta correcta: <strong>${textoRespuestaCorrectaLibre(pregunta, tipo)}</strong>
        </p>
    `);

}

function renderizarOrdenarLecturaLibre(pregunta, pi) {
    return pregunta._ordenActual.map((parte, oi) => `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <span style="flex:1; padding:8px; border:1px solid var(--borde); border-radius:8px; background:white;">${parte}</span>
            <button type="button" data-accion="mover-parte-arriba" data-indice="${pi}" data-oi="${oi}"
                    ${oi === 0 ? "disabled" : ""} style="width:auto; padding:6px 10px;">▲</button>
            <button type="button" data-accion="mover-parte-abajo" data-indice="${pi}" data-oi="${oi}"
                    ${oi === pregunta._ordenActual.length - 1 ? "disabled" : ""} style="width:auto; padding:6px 10px;">▼</button>
        </div>
    `).join("");
}

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("cuerpoLecturaLibre").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para leer esto.</p>";
        return;
    }

    iniciarLecturaLibre();

});
