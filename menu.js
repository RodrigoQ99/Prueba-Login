// ==========================================================
// MENÚ SUPERIOR (perfil, progreso, ranking)
// ==========================================================
// Requiere que la página ya haya cargado: firebase-init.js, lecturas.js,
// y tener en el HTML los elementos con los IDs usados abajo.
// ==========================================================

const menuUsuario = document.getElementById("menuUsuario");
const btnMenuToggle = document.getElementById("btnMenuToggle");
const panelMenu = document.getElementById("panelMenu");
const menuNombre = document.getElementById("menuNombre");
const menuCompletadas = document.getElementById("menuCompletadas");
const menuPendientes = document.getElementById("menuPendientes");
const btnCerrarSesionMenu = document.getElementById("btnCerrarSesionMenu");

if (btnMenuToggle) {
    btnMenuToggle.addEventListener("click", () => {
        const abierto = panelMenu.style.display === "block";
        panelMenu.style.display = abierto ? "none" : "block";
    });

    // Cerrar el menú si se hace clic afuera de él
    document.addEventListener("click", (e) => {
        if (!menuUsuario.contains(e.target)) {
            panelMenu.style.display = "none";
        }
    });
}

if (btnCerrarSesionMenu) {
    btnCerrarSesionMenu.addEventListener("click", () => {
        auth.signOut();
    });
}

async function cargarDatosMenu(user) {
    menuUsuario.style.display = "block";

    try {
        // Trae todos los intentos del usuario y cuenta, en el navegador,
        // cuántas lecturas DISTINTAS completó con éxito (evita necesitar
        // un índice compuesto adicional en Firestore).
        const snapshot = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .get();

        const idsCompletados = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.puntosGanados > 0) {
                idsCompletados.add(data.lecturaId);
            }
        });

        await cargarCatalogoLecturas();

        // Solo cuenta lecturas que TODAVÍA existen en el catálogo — si una
        // se borró (o cambió de ID), su progreso viejo no debe seguir
        // inflando "completadas" ni "pendientes de X" para siempre.
        const idsCatalogoActual = new Set(CATALOGO_LECTURAS.map(l => l.id));
        const totalLecturas = CATALOGO_LECTURAS.length;
        const completadas = [...idsCompletados].filter(id => idsCatalogoActual.has(id)).length;
        const pendientes = Math.max(totalLecturas - completadas, 0);

        menuCompletadas.textContent = completadas;
        menuPendientes.textContent = `${pendientes} de ${totalLecturas}`;

    } catch (error) {
        console.error("Error al cargar el progreso del menú:", error);
    }
}

// Firebase auth ya inicializado en firebase-init.js
auth.onAuthStateChanged((user) => {
    if (user) {
        cargarDatosMenu(user);
    } else if (menuUsuario) {
        menuUsuario.style.display = "none";
    }
});


// ==========================================================
// MODAL "¿QUÉ ES ESTO?"
// ==========================================================

const btnQueEsEsto = document.getElementById("btnQueEsEsto");

if (btnQueEsEsto) {
    btnQueEsEsto.addEventListener("click", () => {
        mostrarModalInfo();
    });
}

// Correo que puede editar el contenido de este modal. Duplicado aquí
// (en vez de reusar esAdmin() de admin.js) porque menu.js se carga en
// páginas como premios.html y ranking.html que no incluyen admin.js.
const EMAIL_ADMIN_INFO = "joserodrigo.jrqd@gmail.com";

function puedeEditarInfo() {
    return !!(auth.currentUser && auth.currentUser.email === EMAIL_ADMIN_INFO);
}

const DEFAULT_INFO_HTML = `
    <p style="font-weight:600; margin-bottom:6px;">Lectura QR</p>
    <p>
        <strong>Lectura QR</strong> es una iniciativa para fomentar la lectura en Guatemala.
        Cada golosina participante trae un código QR escondido que te lleva a una lectura
        corta, con preguntas al final para comprobar que la leíste.
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
        en el <strong>Ranking</strong> desde este mismo menú.
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
            ${puedeEditarInfo() ? `<button type="button" class="botonEngranaje" title="Editar este contenido">⚙️</button>` : ""}
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
// EDICIÓN DEL CONTENIDO DE "¿QUÉ ES ESTO?" (solo EMAIL_ADMIN_INFO)
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
