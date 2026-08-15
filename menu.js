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
    menuNombre.textContent = user.displayName || user.email || "Mi cuenta";

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

        const totalLecturas = CATALOGO_LECTURAS.length;
        const completadas = idsCompletados.size;
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

function mostrarModalInfo() {

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo">
            <h2>📚 ¿Qué es esto?</h2>
            <p>
                <strong>Lectura QR</strong> es una iniciativa para fomentar la lectura en Guatemala.
                Cada golosina participante trae un código QR escondido que te lleva a una lectura
                corta, con preguntas al final para comprobar que la leíste.
            </p>
            <p style="font-weight:600; margin-bottom:6px;">Niveles y premios:</p>
            <ul>
                <li>🟢 <strong>Fácil</strong> (~1 min) — premio simple</li>
                <li>🟡 <strong>Intermedio</strong> (2-5 min) — premio de mayor nivel</li>
                <li>🔴 <strong>Difícil</strong> (6-10 min) — mejores premios</li>
            </ul>
            <p>
                Puedes participar como <strong>particular</strong> (compites por tu propio puntaje)
                o como <strong>estudiante</strong> (compites también por tu colegio y grado, contra
                otros colegios, por el premio mayor).
            </p>
            <p>
                Tus puntos se guardan automáticamente con tu cuenta de Google, y puedes ver cómo vas
                en el <strong>Ranking</strong> desde este mismo menú.
            </p>
            <button class="modalCerrar">Entendido</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

}
