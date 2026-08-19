// ==========================================================
// PANTALLA "MIS PREMIOS"
// ==========================================================
// Cada premio ganado tiene su propio código de 6 dígitos, generado al
// aprobar la lectura por primera vez (ver crearPremioCanjeable en
// puntos.js). El botón "Canjear" solo revela ese código para
// mostrárselo al encargado — el canje real lo marca el Premiador desde
// premiador.html, no esta pantalla.
//
// "Donar" es la alternativa a canjear: en vez de quedarse con el premio,
// el usuario lo dona (queda registrado en el mismo documento, campo
// "donado") y se suma al conteo global que se ve en el botón ✚ (ver
// abrirModalDonaciones). Canjear y donar son EXCLUYENTES — un premio
// solo puede terminar en uno de los dos estados, nunca ambos (reforzado
// también en firestore.rules).
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
    const btnVerDonaciones = document.getElementById("btnVerDonaciones");
    if (btnVerDonaciones) btnVerDonaciones.style.display = "flex";

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

    // Los pendientes primero (de canjear o donar), los ya resueltos al final
    premios.sort((a, b) => {
        const resueltoA = a.canjeado || a.donado;
        const resueltoB = b.canjeado || b.donado;
        return (resueltoA === resueltoB) ? 0 : (resueltoA ? 1 : -1);
    });

    contenedor.innerHTML = premios.map(premio => {

        const lecturaInfo = obtenerLecturaPorId(premio.lecturaId);
        const tituloLectura = lecturaInfo ? lecturaInfo.titulo : premio.lecturaId;

        let estadoHtml;

        if (premio.canjeado) {
            estadoHtml = `<span class="tarjetaEstado">✅ Canjeado</span>`;
        } else if (premio.donado) {
            estadoHtml = `<span class="tarjetaEstado">✚ Donado</span>`;
        } else {
            estadoHtml = `
                <div style="display:flex; gap:8px;">
                    <button type="button" class="botonAdminChico botonExito" data-canjear="${premio.id}">Canjear</button>
                    <button type="button" class="botonAdminChico" data-donar="${premio.id}">Donar</button>
                </div>
            `;
        }

        return `
            <div class="tarjetaLectura ${(premio.canjeado || premio.donado) ? "tarjetaCompletada" : ""}" style="cursor:default; flex-wrap:wrap;">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${premio.descripcionPremio}</p>
                    <p class="tarjetaNivel">Ganado en: ${tituloLectura}</p>
                    <p id="codigo-${premio.id}" style="display:none; font-weight:700; font-size:22px; letter-spacing:3px; margin-top:8px; color:var(--azul);">
                        ${premio.codigo}
                    </p>
                </div>
                ${estadoHtml}
            </div>
        `;

    }).join("");

    contenedor.querySelectorAll("[data-canjear]").forEach(btn => {
        btn.addEventListener("click", () => {

            const codigoEl = document.getElementById(`codigo-${btn.dataset.canjear}`);
            codigoEl.style.display = "block";
            btn.textContent = "Muéstrale este código al encargado";
            btn.disabled = true;

            // Excluyente con donar: una vez que decidió canjearlo, ya no
            // puede donarlo (aunque el canje físico en el Premiador
            // todavía esté pendiente).
            const btnDonar = contenedor.querySelector(`[data-donar="${btn.dataset.canjear}"]`);
            if (btnDonar) btnDonar.disabled = true;

        });
    });

    contenedor.querySelectorAll("[data-donar]").forEach(btn => {
        btn.addEventListener("click", async () => {

            if (!confirm("¿Seguro que quieres donar este premio? Ya no vas a poder canjearlo tú.")) {
                return;
            }

            btn.disabled = true;

            const btnCanjear = contenedor.querySelector(`[data-canjear="${btn.dataset.donar}"]`);
            if (btnCanjear) btnCanjear.disabled = true;

            try {
                await db.collection("premios").doc(btn.dataset.donar).update({
                    donado: true,
                    fechaDonado: firebase.firestore.FieldValue.serverTimestamp()
                });
                await cargarMisPremios();
            } catch (error) {
                console.error("No se pudo donar el premio:", error);
                alert("No se pudo donar el premio. Intenta de nuevo.");
                btn.disabled = false;
                if (btnCanjear) btnCanjear.disabled = false;
            }

        });
    });

}


// ==========================================================
// VER DONACIONES (conteo global, todos los usuarios)
// ==========================================================
// Se abre desde el botón ✚ en la esquina superior izquierda. Muestra
// cuántos premios se han donado en total y, desglosado, cuántos de
// cada tipo (según como esté registrado "descripcionPremio" en cada
// premio donado — si el admin edita los premios después, eso no cambia
// lo que ya se donó con el nombre anterior).

async function abrirModalDonaciones() {

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>✚ Donaciones</h2>
            <p style="color:var(--texto-suave); margin-bottom:15px;">
                Premios donados por todos los participantes, en total.
            </p>
            <div id="resumenDonaciones"><p style="text-align:center;">Cargando...</p></div>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave); margin-top:15px;">Cerrar</button>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    const contenedorResumen = overlay.querySelector("#resumenDonaciones");

    try {

        const snapshot = await db.collection("premios")
            .where("donado", "==", true)
            .get();

        const conteos = {};
        let total = 0;

        snapshot.forEach(doc => {
            const descripcion = doc.data().descripcionPremio || "Premio";
            conteos[descripcion] = (conteos[descripcion] || 0) + 1;
            total++;
        });

        if (total === 0) {
            contenedorResumen.innerHTML = "<p style='text-align:center;'>Todavía no se ha donado ningún premio.</p>";
            return;
        }

        const entradas = Object.entries(conteos).sort((a, b) => b[1] - a[1]);

        contenedorResumen.innerHTML = `
            <div class="menuStat" style="border-bottom:2px solid var(--azul); font-weight:800;">
                <span>Total donado</span>
                <strong>${total}</strong>
            </div>
            ${entradas.map(([nombre, cantidad]) => `
                <div class="menuStat">
                    <span>${nombre}</span>
                    <strong>${cantidad} donados</strong>
                </div>
            `).join("")}
        `;

    } catch (error) {
        console.error("No se pudo cargar el resumen de donaciones:", error);
        contenedorResumen.innerHTML = "<p style='text-align:center;'>No se pudo cargar el resumen.</p>";
    }

}

const btnVerDonaciones = document.getElementById("btnVerDonaciones");
if (btnVerDonaciones) {
    btnVerDonaciones.addEventListener("click", abrirModalDonaciones);
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
