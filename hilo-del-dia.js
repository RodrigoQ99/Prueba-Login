// ==========================================================
// "EL HILO DEL DÍA" — juego diario estilo Wordle
// ==========================================================
// Cada día hay un texto corto (elHiloDelDia/{fecha}, ver admin.js)
// dividido en 5 fragmentos guardados en su orden CORRECTO. Aquí se
// desordenan al mostrarlos y el jugador los toca en el orden que cree
// correcto — 6 intentos, con retroalimentación por posición:
//   🟩 posición exacta · 🟧 a un lugar de distancia · ⬛ más lejos
//
// El intento del día se guarda en intentosHiloDia/{uid}_{fecha}, así que
// una recarga a medio juego no pierde el progreso, y ya no se puede
// jugar dos veces el mismo día (se muestra el tablero terminado).
// ==========================================================

const EMOJI_COLOR_HILO = { verde: "🟩", amarillo: "🟧", gris: "⬛" };

let fechaHoyHilo = "";
let hiloActual = null;
let numeroHilo = 0;
let intentosGuardadosHilo = [];
let hiloCompletado = false;
let hiloGanado = false;
let fragmentosMezclados = [];
let ordenActualHilo = [];

function _fechaHoyLocalHilo() {
    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function barajarHilo(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}


// ==========================
// ARRANQUE
// ==========================

async function iniciarHilo(user) {

    const cont = document.getElementById("juegoHilo");
    fechaHoyHilo = _fechaHoyLocalHilo();

    await cargarAdministradores();
    if (typeof inicializarAdminHiloDia === "function") inicializarAdminHiloDia();

    let hiloDoc;
    try {
        hiloDoc = await db.collection("elHiloDelDia").doc(fechaHoyHilo).get();
    } catch (error) {
        console.error("No se pudo cargar el Hilo de hoy:", error);
        cont.innerHTML = "<p style='text-align:center;'>Ocurrió un error al cargar el Hilo de hoy.</p>";
        return;
    }

    if (!hiloDoc.exists) {
        cont.innerHTML = "<p style='text-align:center;'>Todavía no hay Hilo para hoy — ¡vuelve más tarde! 🧵</p>";
        return;
    }

    hiloActual = { id: hiloDoc.id, ...hiloDoc.data() };

    try {
        const snapshotNumero = await db.collection("elHiloDelDia")
            .where(firebase.firestore.FieldPath.documentId(), "<=", fechaHoyHilo)
            .get();
        numeroHilo = snapshotNumero.size;
    } catch (error) {
        console.error("No se pudo calcular el número del Hilo:", error);
        numeroHilo = 0;
    }

    try {
        const intentoDoc = await db.collection("intentosHiloDia").doc(`${user.uid}_${fechaHoyHilo}`).get();
        if (intentoDoc.exists) {
            const datos = intentoDoc.data();
            intentosGuardadosHilo = datos.intentos || [];
            hiloCompletado = !!datos.completado;
            hiloGanado = !!datos.gano;
        }
    } catch (error) {
        console.error("No se pudo cargar tu intento de hoy:", error);
    }

    fragmentosMezclados = barajarHilo(
        hiloActual.fragmentos.map((texto, indice) => ({ indice, texto }))
    );
    ordenActualHilo = [];

    renderJuegoActualHilo();

}


// ==========================
// TABLERO EN CURSO
// ==========================

function renderJuegoActualHilo() {
    if (hiloCompletado) {
        renderHiloTerminado();
    } else {
        renderTableroHilo();
    }
}

function filasHistorialHilo() {
    return intentosGuardadosHilo.map(intento => `
        <div style="font-size:26px; letter-spacing:6px; text-align:center;">
            ${intento.resultado.map(c => EMOJI_COLOR_HILO[c]).join("")}
        </div>
    `).join("");
}

function renderTableroHilo() {

    const cont = document.getElementById("juegoHilo");

    const enPool = fragmentosMezclados.filter(f => !ordenActualHilo.includes(f));

    const filaOrden = Array.from({ length: 5 }).map((_, i) => {
        const f = ordenActualHilo[i];
        return `
            <div class="casillaOrdenHilo" data-accion="quitar-orden" data-i="${i}">
                ${f ? `<span>${f.texto}</span>` : `<span style="color:var(--texto-suave);">Fragmento ${i + 1}</span>`}
            </div>
        `;
    }).join("");

    const fichasPool = enPool.map(f => `
        <div class="fragmentoHilo" data-accion="poner-orden" data-indice="${f.indice}">
            ${f.texto}
        </div>
    `).join("");

    cont.innerHTML = `
        <h2 style="text-align:center; margin-bottom:5px;">El Hilo #${numeroHilo}</h2>
        <p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">
            Intento ${intentosGuardadosHilo.length + 1} de 6 — toca los fragmentos en el orden que creas correcto.
        </p>

        ${intentosGuardadosHilo.length > 0 ? `<div style="margin-bottom:15px;">${filasHistorialHilo()}</div>` : ""}

        <p style="font-weight:600; margin-bottom:6px;">Tu orden:</p>
        <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:20px;">${filaOrden}</div>

        <p style="font-weight:600; margin-bottom:6px;">Fragmentos:</p>
        <div id="poolFragmentosHilo" style="display:flex; flex-direction:column; gap:8px; margin-bottom:15px;">
            ${fichasPool || "<p style='color:var(--texto-suave);'>Toca una casilla de arriba para regresar un fragmento aquí.</p>"}
        </div>

        <button id="btnEnviarIntentoHilo" ${ordenActualHilo.length === 5 ? "" : "disabled"}>
            Enviar intento
        </button>
    `;

    cont.querySelectorAll("[data-accion='poner-orden']").forEach(el => {
        el.addEventListener("click", () => {
            if (ordenActualHilo.length >= 5) return;
            const indice = Number(el.dataset.indice);
            const frag = fragmentosMezclados.find(f => f.indice === indice);
            ordenActualHilo.push(frag);
            renderTableroHilo();
        });
    });

    cont.querySelectorAll("[data-accion='quitar-orden']").forEach(el => {
        el.addEventListener("click", () => {
            const i = Number(el.dataset.i);
            if (ordenActualHilo[i]) {
                ordenActualHilo.splice(i, 1);
                renderTableroHilo();
            }
        });
    });

    const btnEnviar = document.getElementById("btnEnviarIntentoHilo");
    if (btnEnviar) {
        btnEnviar.addEventListener("click", enviarIntentoHilo);
    }

}


// ==========================
// ENVIAR UN INTENTO
// ==========================

async function enviarIntentoHilo() {

    if (ordenActualHilo.length !== 5) return;

    const resultado = ordenActualHilo.map((frag, i) => {
        const diferencia = Math.abs(frag.indice - i);
        if (diferencia === 0) return "verde";
        if (diferencia === 1) return "amarillo";
        return "gris";
    });

    intentosGuardadosHilo.push({
        orden: ordenActualHilo.map(f => f.indice),
        resultado: resultado
    });

    hiloGanado = resultado.every(c => c === "verde");
    hiloCompletado = hiloGanado || intentosGuardadosHilo.length >= 6;

    try {
        const user = auth.currentUser;
        await db.collection("intentosHiloDia").doc(`${user.uid}_${fechaHoyHilo}`).set({
            uid: user.uid,
            fecha: fechaHoyHilo,
            intentos: intentosGuardadosHilo,
            completado: hiloCompletado,
            gano: hiloGanado
        });
    } catch (error) {
        console.error("No se pudo guardar tu intento de El Hilo:", error);
    }

    ordenActualHilo = [];
    renderJuegoActualHilo();

}


// ==========================
// TABLERO TERMINADO + COMPARTIR
// ==========================

function renderHiloTerminado() {

    const cont = document.getElementById("juegoHilo");

    const ordenCorrecto = hiloActual.fragmentos
        .map((texto, i) => `<p style="margin-bottom:8px;">${i + 1}. ${texto}</p>`)
        .join("");

    cont.innerHTML = `
        <h2 style="text-align:center; margin-bottom:5px;">El Hilo #${numeroHilo}</h2>
        <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:15px;">
            ${hiloGanado
                ? `🎉 ¡Lo lograste en ${intentosGuardadosHilo.length}/6!`
                : "😔 No esta vez — así era el orden correcto:"}
        </p>

        <div style="margin-bottom:20px;">${filasHistorialHilo()}</div>

        ${!hiloGanado
            ? `<div style="background:var(--fondo); border-radius:12px; padding:15px; margin-bottom:20px;">${ordenCorrecto}</div>`
            : ""}

        <button id="btnCompartirHilo">📋 Compartir resultado</button>

        <p style="text-align:center; color:var(--texto-suave); margin-top:15px;">
            Vuelve mañana para un Hilo nuevo.
        </p>
    `;

    document.getElementById("btnCompartirHilo").addEventListener("click", compartirResultadoHilo);

}

function compartirResultadoHilo() {

    const resultadoTexto = hiloGanado ? `${intentosGuardadosHilo.length}` : "X";
    const filas = intentosGuardadosHilo
        .map(intento => intento.resultado.map(c => EMOJI_COLOR_HILO[c]).join(""))
        .join("\n");

    const texto = `El Hilo #${numeroHilo} - ${resultadoTexto}/6\n\n${filas}`;

    navigator.clipboard.writeText(texto).then(() => {
        const btn = document.getElementById("btnCompartirHilo");
        if (!btn) return;
        btn.textContent = "✅ ¡Copiado!";
        setTimeout(() => { btn.textContent = "📋 Compartir resultado"; }, 1500);
    }).catch(error => {
        console.error("No se pudo copiar el resultado:", error);
        alert(texto);
    });

}


// ==========================
// LOGIN
// ==========================

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("juegoHilo").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para jugar El Hilo del día.</p>";
        return;
    }

    iniciarHilo(user);

});
