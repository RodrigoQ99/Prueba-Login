// ==========================================================
// PANTALLA "MIS PREMIOS"
// ==========================================================
// Cada premio ganado tiene su propio código de 6 dígitos, generado al
// aprobar la lectura por primera vez (ver crearPremioCanjeable en
// puntos.js). El botón "Canjear" solo revela ese código para
// mostrárselo al encargado — el canje real lo marca el Premiador desde
// premiador.html, no esta pantalla.
// ==========================================================

async function cargarMisPremios() {

    const user = auth.currentUser;
    if (!user) return;

    await cargarCatalogoLecturas();

    // Rellena cualquier premio que le falte (lecturas que aprobó ANTES de
    // que existiera este sistema de premios, y por eso nunca generaron
    // su código de canje).
    await reconciliarPremiosFaltantes(user);

    const contenedor = document.getElementById("listaPremios");

    let premios = [];

    try {

        const snapshot = await db.collection("premios")
            .where("usuarioId", "==", user.uid)
            .get();

        premios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("No se pudieron cargar tus premios:", error);
    }

    if (premios.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center;'>Todavía no has ganado premios. ¡Aprueba una lectura para ganar el primero! 🎉</p>";
        return;
    }

    // Los pendientes de canjear primero, los ya canjeados al final
    premios.sort((a, b) => (a.canjeado === b.canjeado) ? 0 : (a.canjeado ? 1 : -1));

    contenedor.innerHTML = premios.map(premio => {

        const lecturaInfo = obtenerLecturaPorId(premio.lecturaId);
        const tituloLectura = lecturaInfo ? lecturaInfo.titulo : premio.lecturaId;

        return `
            <div class="tarjetaLectura ${premio.canjeado ? "tarjetaCompletada" : ""}" style="cursor:default; flex-wrap:wrap;">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${premio.descripcionPremio}</p>
                    <p class="tarjetaNivel">Ganado en: ${tituloLectura}</p>
                    <p id="codigo-${premio.id}" style="display:none; font-weight:700; font-size:22px; letter-spacing:3px; margin-top:8px; color:var(--azul);">
                        ${premio.codigo}
                    </p>
                </div>
                ${premio.canjeado
                    ? `<span class="tarjetaEstado">✅ Canjeado</span>`
                    : `<button type="button" class="botonAdminChico" data-canjear="${premio.id}">Canjear</button>`
                }
            </div>
        `;

    }).join("");

    contenedor.querySelectorAll("[data-canjear]").forEach(btn => {
        btn.addEventListener("click", () => {
            const codigoEl = document.getElementById(`codigo-${btn.dataset.canjear}`);
            codigoEl.style.display = "block";
            btn.textContent = "Muéstrale este código al encargado";
            btn.disabled = true;
        });
    });

}

// ==========================================================
// RELLENAR PREMIOS FALTANTES
// ==========================================================
// Compara sus lecturas APROBADAS (progreso con puntosGanados > 0)
// contra los premios que ya tiene, y crea los que falten — para
// cuentas que aprobaron lecturas antes de que existiera este sistema.

async function reconciliarPremiosFaltantes(user) {

    let nivelPorLecturaAprobada = {};

    try {

        const snapshot = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .get();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.puntosGanados > 0) {
                nivelPorLecturaAprobada[data.lecturaId] = data.nivel;
            }
        });

    } catch (error) {
        console.error("No se pudo revisar tu progreso:", error);
        return;
    }

    const idsAprobados = Object.keys(nivelPorLecturaAprobada);
    if (idsAprobados.length === 0) return;

    let idsConPremio = new Set();

    try {

        const snapshot = await db.collection("premios")
            .where("usuarioId", "==", user.uid)
            .get();

        idsConPremio = new Set(snapshot.docs.map(doc => doc.data().lecturaId));

    } catch (error) {
        console.error("No se pudieron revisar tus premios existentes:", error);
        return;
    }

    const faltantes = idsAprobados.filter(id => !idsConPremio.has(id));

    for (const lecturaId of faltantes) {
        try {
            await crearPremioCanjeable(user, lecturaId, nivelPorLecturaAprobada[lecturaId]);
        } catch (error) {
            console.error(`No se pudo crear el premio faltante de "${lecturaId}":`, error);
        }
    }

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarMisPremios();
}
