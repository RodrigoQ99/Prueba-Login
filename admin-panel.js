// ==========================================================
// PÁGINA "PANEL DE ADMINISTRADOR"
// ==========================================================
// Portal independiente para la cuenta administradora — mismo patrón
// que premiador.js: página separada, login propio, sin auth.js ni
// menu.js. La autorización usa esAdmin() (ver admin-comun.js), que ya
// revisa la colección "administradores" de Firestore — la misma que
// protege escribir en lecturas/mejoraLecturas/configuracion/etc.
//
// A propósito NO se carga aquí ningún archivo del motor de lectura
// real (motor.js, motor-mejorar.js, puntos.js, racha.js,
// desbloqueo.js) ni auth.js — así ninguna ruta de escritura de
// participación (progreso, puntosTotales, racha, ranking, premios) es
// siquiera alcanzable desde esta página. La "vista previa" de más
// abajo es código nuevo y aislado que nunca las toca.
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
document.getElementById("btnCerrarSesionAdmin").addEventListener("click", () => auth.signOut());


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
    inicializarPanel();

});


// ==========================================================
// ARRANQUE DE TODAS LAS SECCIONES (funciones ya existentes de admin.js,
// sin modificar — solo se llaman desde aquí en vez de desde las
// páginas de participantes)
// ==========================================================

async function inicializarPanel() {

    await Promise.all([cargarCatalogoLecturas(), cargarCatalogoMejora(), cargarRangoEdades(), cargarGenerosLectura()]);

    inicializarAdminIndex();
    inicializarSelectorEdadMejora();
    inicializarAdminHiloDia();
    inicializarAdminAhorcado();
    cargarListaPropuestas();

}

function inicializarSelectorEdadMejora() {

    const select = document.getElementById("selectEdadAdminMejora");

    const opciones = [];
    for (let e = RANGO_EDADES.min; e <= RANGO_EDADES.max; e++) {
        opciones.push(`<option value="${e}">${etiquetaEdad(e)}</option>`);
    }
    opciones.push(`<option value="${grupoMasDelTope()}">${etiquetaEdad(grupoMasDelTope())}</option>`);
    select.innerHTML = opciones.join("");

    select.addEventListener("change", () => {
        inicializarAdminMejora(Number(select.value));
    });

    inicializarAdminMejora(RANGO_EDADES.min);

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


// ==========================================================
// PROPUESTAS DE USUARIOS ("Ser el protagonista de la historia")
// ==========================================================

async function cargarListaPropuestas() {

    const cont = document.getElementById("listaPropuestas");
    cont.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    let propuestas = [];

    try {
        const snapshot = await db.collection("propuestasLecturas").get();
        propuestas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudieron cargar las propuestas:", error);
        cont.innerHTML = "<p style='text-align:center;'>No se pudieron cargar las propuestas.</p>";
        return;
    }

    if (propuestas.length === 0) {
        cont.innerHTML = "<p style='text-align:center;'>No hay propuestas pendientes de revisión.</p>";
        return;
    }

    cont.innerHTML = propuestas.map(p => `
        <div class="tarjetaLectura" data-propuesta="${p.id}" style="cursor:pointer;">
            <div class="tarjetaInfo">
                <p class="tarjetaTitulo">${p.titulo}</p>
                <p class="tarjetaNivel">
                    ${p.autorNombre || p.autorEmail || "Anónimo"} — ${p.cantidadPalabras} palabras
                    (sugerido: ${p.nivelSugerido || "—"})
                </p>
            </div>
            <span class="tarjetaEstado">Revisar →</span>
        </div>
    `).join("");

    cont.querySelectorAll("[data-propuesta]").forEach(tarjeta => {
        tarjeta.addEventListener("click", () => {
            const propuesta = propuestas.find(p => p.id === tarjeta.dataset.propuesta);
            abrirRevisionPropuesta(propuesta);
        });
    });

}

function abrirRevisionPropuesta(propuesta) {

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo modalCajaAdmin">
            <h2>✍️ ${propuesta.titulo}</h2>
            <p style="font-size:13px; color:var(--texto-suave);">
                Enviado por ${propuesta.autorNombre || "—"} (${propuesta.autorEmail || "sin correo"})
                — ${propuesta.cantidadPalabras} palabras, nivel sugerido: ${propuesta.nivelSugerido || "—"}
                (${propuesta.preguntasSugeridas || "—"} preguntas sugeridas).
            </p>
            <div style="text-align:left; margin:15px 0;">
                ${(propuesta.texto || []).map(p => `<p style="margin-bottom:12px;">${p}</p>`).join("")}
            </div>
            <div style="text-align:left;">
                ${(propuesta.bancoPreguntas || []).map((pregunta, pi) => `
                    <div style="margin-bottom:12px;">
                        <p style="font-weight:600; margin-bottom:4px;">${pi + 1}. ${pregunta.pregunta}</p>
                        ${pregunta.opciones.map(opcion => `
                            <p style="margin:2px 0 2px 15px; ${opcion.valor === pregunta.correcta ? "font-weight:700; color:#2e9e5b;" : ""}">
                                ${opcion.valor === pregunta.correcta ? "✓ " : "— "}${opcion.texto}
                            </p>
                        `).join("")}
                    </div>
                `).join("")}
            </div>
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
                <button type="button" id="btnPublicarPremios">📚 Publicar como lectura de premios</button>
                <button type="button" id="btnPublicarMejora" style="background:white; color:var(--azul); border:2px solid var(--azul);">📈 Publicar como lectura de Mejorar la lectura</button>
                <button type="button" id="btnRechazarPropuesta" class="botonAdminContorno" style="border-color:#c0392b; color:#c0392b;">🗑️ Rechazar</button>
                <button type="button" class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

    async function borrarPropuestaPublicada() {
        try {
            await db.collection("propuestasLecturas").doc(propuesta.id).delete();
        } catch (error) {
            console.error("No se pudo quitar la propuesta de la cola:", error);
        }
        overlay.remove();
        cargarListaPropuestas();
    }

    const prellenado = {
        titulo: propuesta.titulo,
        texto: propuesta.texto,
        bancoPreguntas: propuesta.bancoPreguntas,
        autorUid: propuesta.autorUid,
        autorNombre: propuesta.autorNombre
    };

    overlay.querySelector("#btnPublicarPremios").addEventListener("click", () => {
        abrirFormularioLectura(
            { ...prellenado, nivel: propuesta.nivelSugerido, preguntasAMostrar: propuesta.preguntasSugeridas },
            borrarPropuestaPublicada
        );
    });

    overlay.querySelector("#btnPublicarMejora").addEventListener("click", () => {
        abrirFormularioMejora(
            { ...prellenado, preguntasAMostrar: propuesta.preguntasSugeridas },
            RANGO_EDADES.min,
            borrarPropuestaPublicada
        );
    });

    overlay.querySelector("#btnRechazarPropuesta").addEventListener("click", async () => {

        if (!confirm(`¿Rechazar la propuesta "${propuesta.titulo}"? Se quita de la cola y no se puede deshacer.`)) {
            return;
        }

        try {
            await db.collection("propuestasLecturas").doc(propuesta.id).delete();
            overlay.remove();
            cargarListaPropuestas();
        } catch (error) {
            console.error("No se pudo rechazar la propuesta:", error);
            alert("No se pudo rechazar la propuesta.");
        }

    });

}
