// ==========================================================
// PÁGINA "LECTURAS PROPUESTAS" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html: login
// propio, gate contra esAdmin() (ver admin-comun.js). Revisa las
// propuestas de usuarios de "Ser el protagonista de la historia" (ver
// protagonista.js) — antes vivían dentro de admin-lecturas.html, ahora
// son su propia sección para que el admin pueda revisarlas sin entrar
// a "Lecturas" (el cuadro de admin-panel.html avisa cuántas quedan
// pendientes, ver cargarBadgePropuestasPendientes en admin-panel.js).
//
// A propósito NO se carga aquí ningún archivo del motor de lectura
// real (motor.js, motor-mejorar.js, puntos.js, racha.js, desbloqueo.js)
// ni auth.js — así ninguna ruta de escritura de participación es
// siquiera alcanzable desde esta página.
//
// "🤖 Revisar con IA" (ver moderarPropuestaConIA en admin-ia.js) es
// SOLO una opinión — nunca aprueba, rechaza ni oculta nada por su
// cuenta. Publicar y Rechazar siguen funcionando exactamente igual y
// no dependen del resultado de la IA en absoluto.
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

    // "Publicar como lectura de premios/de Mejorar la lectura" (más
    // abajo) abre abrirFormularioLectura()/abrirFormularioMejora() (ver
    // admin.js), que necesitan estos catálogos ya cargados (RANGO_EDADES
    // para el selector de edad del formulario de Mejora).
    await Promise.all([cargarCatalogoLecturas(), cargarCatalogoMejora(), cargarRangoEdades()]);
    cargarListaPropuestas();

});


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
                    ${p.autorNombre || p.autorEmail || "Anónimo"} — ${p.genero || "sin género"} — ${p.cantidadPalabras} palabras
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
                — género: ${propuesta.genero || "—"}
                — ${propuesta.cantidadPalabras} palabras, nivel sugerido: ${propuesta.nivelSugerido || "—"}
                (${propuesta.preguntasSugeridas || "—"} preguntas sugeridas).
            </p>

            <!-- Solo una opinión para el admin — NUNCA aprueba, rechaza ni
                 oculta nada por su cuenta (ver moderarPropuestaIA en
                 functions/lib/moderarPropuestaIA.js). Publicar/Rechazar
                 más abajo son totalmente independientes de esto. -->
            <div style="text-align:left; margin:15px 0;">
                <button type="button" id="btnRevisarConIA" class="botonAdminChico">🤖 Revisar con IA</button>
                <div id="resultadoRevisionIA" style="display:none; margin-top:10px; padding:10px 12px; border-radius:8px; font-size:13px;"></div>
            </div>

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

    // "🤖 Revisar con IA" — solo aparece si admin-ia.js está cargado en
    // esta página (siempre debería estarlo en admin-propuestas.html).
    const btnRevisarConIA = overlay.querySelector("#btnRevisarConIA");
    if (typeof moderarPropuestaConIA !== "function" && btnRevisarConIA) {
        btnRevisarConIA.style.display = "none";
    } else if (btnRevisarConIA) {
        btnRevisarConIA.addEventListener("click", async () => {

            const resultado = overlay.querySelector("#resultadoRevisionIA");

            btnRevisarConIA.disabled = true;
            btnRevisarConIA.textContent = "🤖 Revisando... (puede tardar unos segundos)";

            try {

                const veredicto = await moderarPropuestaConIA({
                    texto: propuesta.texto,
                    preguntas: propuesta.bancoPreguntas
                });

                const esApropiado = veredicto.veredicto === "apropiado";
                const colorFondo = esApropiado ? "#e8f6ee" : "#fdf3e3";
                const colorTexto = esApropiado ? "#1f7a45" : "#a5650a";
                const etiqueta = esApropiado ? "🟢 Apropiado" : "🟠 Revisar con cuidado";
                const temas = (veredicto.temas_detectados || []).length > 0
                    ? `<p style="margin-top:6px;"><strong>Temas detectados:</strong> ${veredicto.temas_detectados.join(", ")}</p>`
                    : "";

                resultado.style.background = colorFondo;
                resultado.style.color = colorTexto;
                resultado.innerHTML = `
                    <p><strong>${etiqueta}</strong> — opinión de la IA, no decide nada por su cuenta.</p>
                    <p style="margin-top:4px;">${veredicto.motivo}</p>
                    ${temas}
                `;
                resultado.style.display = "block";

            } catch (error) {

                console.error("No se pudo revisar la propuesta con IA:", error);
                resultado.style.background = "#fdf1f0";
                resultado.style.color = "#c0392b";
                resultado.textContent = "❌ No se pudo revisar con IA. Puedes seguir revisando la propuesta manualmente." +
                    (error && error.message ? ` (${error.message})` : "");
                resultado.style.display = "block";

            }

            btnRevisarConIA.disabled = false;
            btnRevisarConIA.textContent = "🤖 Revisar con IA";

        });
    }

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
        genero: propuesta.genero,
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
