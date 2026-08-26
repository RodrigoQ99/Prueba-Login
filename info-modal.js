// ==========================================================
// MODAL "¿QUÉ ES ESTO?"
// ==========================================================
// Se movió aquí desde menu.js (Etapa 18): el botón 💡 ya no vive dentro
// del menú de tres líneas en ninguna pantalla — ahora es un ícono
// aparte, cuadrado, SOLO en la esquina superior derecha de index.html
// (Inicio). Este archivo solo se carga ahí.
// ==========================================================

const DEFAULT_INFO_HTML = `
    <p style="font-weight:600; margin-bottom:6px;">Lectura QR</p>
    <p>
        <strong>Lectura QR</strong> es una iniciativa para fomentar la lectura en Guatemala.
        Cada golosina participante trae un código escondido de 8 caracteres: ingrésalo en
        "Lecturas" para desbloquear una lectura corta, con preguntas al final para
        comprobar que la leíste.
    </p>
    <p style="font-weight:600; margin-bottom:6px;">Niveles y premios:</p>
    <ul>
        <li><strong>Fácil</strong> — lectura corta, premio simple</li>
        <li><strong>Intermedio</strong> — lectura media, premio de mayor nivel</li>
        <li><strong>Difícil</strong> — lectura larga, mejores premios</li>
    </ul>
    <p>
        Puedes participar como <strong>particular</strong>, compitiendo por tu propio puntaje,
        o como <strong>estudiante</strong>, compitiendo también por tu colegio y grado contra
        otros colegios por el premio mayor.
    </p>
    <p>
        Tus puntos se guardan automáticamente con tu cuenta de Google, y puedes ver cómo vas
        en el <strong>Ranking</strong> desde Inicio.
    </p>

    <p style="font-weight:600; margin:20px 0 6px;">Mejorar la lectura</p>
    <p>
        <strong>Mejorar la lectura</strong> es un sistema aparte, sin premios ni ranking. Lees
        un texto a tu propio ritmo y, al minuto, te pedimos las últimas palabras que leíste
        para calcular cuántas palabras por minuto lees.
    </p>
    <p>
        Las lecturas están organizadas por edad y se desbloquean en orden: al completar una
        pasas a la siguiente. Puedes intentarlo las veces que quieras, sin límite.
    </p>
`;

async function mostrarModalInfo() {

    // Espera a que la lista de administradores esté lista (ver
    // admin-comun.js) antes de decidir si mostrar el botón de editar.
    await cargarAdministradores();

    let htmlActual = DEFAULT_INFO_HTML;

    try {
        const doc = await db.collection("configuracion").doc("infoModal").get();
        if (doc.exists && doc.data().html) {
            htmlActual = doc.data().html;
        }
    } catch (error) {
        console.error("No se pudo cargar el contenido de '¿Qué es esto?':", error);
    }

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo">
            ${esAdmin() ? `<button type="button" class="botonEngranaje" title="Editar este contenido">⚙️</button>` : ""}
            <h2>¿Qué es esto?</h2>
            <div id="contenidoModalInfo">${htmlActual}</div>
            <button class="modalCerrar">Entendido</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    const btnEngranaje = overlay.querySelector(".botonEngranaje");
    if (btnEngranaje) {
        btnEngranaje.addEventListener("click", () => activarEdicionInfo(overlay, htmlActual));
    }

}

// ==========================================================
// EDICIÓN DEL CONTENIDO DE "¿QUÉ ES ESTO?" (solo administradores)
// ==========================================================

function activarEdicionInfo(overlay, htmlActual) {

    const caja = overlay.querySelector(".modalCajaInfo");

    caja.innerHTML = `
        <h2>Editar "¿Qué es esto?"</h2>
        <textarea id="textoEditarInfo" rows="16"
                  style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde); font-family:inherit; font-size:13px;"
        >${htmlActual}</textarea>
        <p style="font-size:12px; color:var(--texto-suave); margin:8px 0 15px;">
            Puedes usar etiquetas HTML como &lt;p&gt;, &lt;strong&gt; y &lt;ul&gt;&lt;li&gt;.
        </p>
        <div style="display:flex; gap:10px;">
            <button type="button" id="btnGuardarInfo" style="flex:1;">Guardar</button>
            <button type="button" id="btnCancelarInfo" style="flex:1; background:white; border:1px solid var(--borde); color:var(--texto-suave);">Cancelar</button>
        </div>
    `;

    caja.querySelector("#btnCancelarInfo").addEventListener("click", () => overlay.remove());

    caja.querySelector("#btnGuardarInfo").addEventListener("click", async () => {

        const nuevoHTML = document.getElementById("textoEditarInfo").value;

        try {
            await db.collection("configuracion").doc("infoModal").set({ html: nuevoHTML });
        } catch (error) {
            console.error("No se pudo guardar el contenido:", error);
            alert("No se pudo guardar. Intenta de nuevo.");
            return;
        }

        overlay.remove();
        mostrarModalInfo();

    });

}
