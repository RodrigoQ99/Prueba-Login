// ==========================================================
// PÁGINA "LECTURAS" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html: login
// propio, gate contra esAdmin(). Agrupa las lecturas de premios y la
// encuesta de géneros — Mejorar la lectura vive en admin-mejora.html,
// El Hilo del día / Ahorcado en admin-juegos.html, y las propuestas de
// "Ser el protagonista de la historia" en admin-propuestas.html
// (apartados propios).
//
// A propósito NO se carga aquí ningún archivo del motor de lectura
// real (motor.js, motor-mejorar.js, puntos.js, racha.js,
// desbloqueo.js) ni auth.js — así ninguna ruta de escritura de
// participación es siquiera alcanzable desde esta página. La "vista
// previa" de más abajo es código nuevo y aislado que nunca las toca.
// ==========================================================

const pantallaLoginAdmin = document.getElementById("pantallaLoginAdmin");
const pantallaSinPermiso = document.getElementById("pantallaSinPermiso");
const contenedorAdminPanel = document.getElementById("contenedorAdminPanel");

document.getElementById("btnLoginGoogleAdmin").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión. Intenta de nuevo.");
    });
});

document.getElementById("btnCerrarSesionAdminSinPermiso").addEventListener("click", () => auth.signOut());


// ==========================================================
// LOGIN Y VERIFICACIÓN DE PERMISO
// ==========================================================

auth.onAuthStateChanged(async (user) => {

    pantallaLoginAdmin.style.display = "none";
    pantallaSinPermiso.style.display = "none";
    contenedorAdminPanel.style.display = "none";

    if (!user) {
        pantallaLoginAdmin.style.display = "flex";
        return;
    }

    await cargarAdministradores();

    if (!esAdmin()) {
        pantallaSinPermiso.style.display = "flex";
        return;
    }

    contenedorAdminPanel.style.display = "block";
    inicializarPanelLecturas();

});


// ==========================================================
// ARRANQUE DE TODAS LAS SECCIONES (funciones ya existentes de
// admin.js, sin modificar — solo se llaman desde aquí)
// ==========================================================

async function inicializarPanelLecturas() {

    await Promise.all([cargarCatalogoLecturas(), cargarGenerosLectura()]);

    inicializarAdminLecturasPremios();
    inicializarAdminGenerosLectura();

}


// ==========================================================
// VISTA PREVIA DE SOLO LECTURA (requisito: el admin puede ver/probar
// una lectura sin que cuente como participación real)
// ==========================================================
// Todo pasa EN MEMORIA: nunca llama a db.collection("progreso"), nunca
// toca usuarios/{uid}, racha ni ranking. Por eso vive aquí y no reusa
// motor.js/motor-mejorar.js (que sí hacen todo eso para participantes
// reales).

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
