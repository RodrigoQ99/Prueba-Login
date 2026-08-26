// ==========================================================
// "EL PREMIO GORDO" (sección dentro de premios.html)
// ==========================================================
// Top 10 + botón para ver la posición propia (mismo patrón que
// ranking.js). El doc
// rankingPremioGordo/actual ya viene calculado (ver
// actualizarRankingPremioGordo en premio-gordo-comun.js, disparado
// desde guardarProgreso en puntos.js) — aquí solo se escucha y se pinta.
// ==========================================================

function formatearDuracion(segundosTotales) {
    const minutos = Math.floor((segundosTotales || 0) / 60);
    const segundos = (segundosTotales || 0) % 60;
    return `${minutos} min ${segundos} seg`;
}

function mostrarModalPosicionPremioGordo(posicion, total, etiqueta) {

    const textoPosicion = typeof posicion === "number"
        ? `${posicion}° lugar`
        : posicion;

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.innerHTML = `
        <div class="modalCaja">
            <p class="modalEtiqueta">${etiqueta}</p>
            <p class="modalPosicion">${textoPosicion}</p>
            <p class="modalTotal">de ${total} participante${total === 1 ? "" : "s"}</p>
            <button class="modalCerrar">Cerrar</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

}

function mostrarPremioGordo(lista, uidActual) {

    const contenedor = document.getElementById("listaPremioGordo");

    if (!lista || lista.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center;'>Todavía nadie lleva lecturas difíciles seguidas. ¡Sé el primero! 🚀</p>";
        return;
    }

    const medallas = ["🥇", "🥈", "🥉"];
    const top10 = lista.slice(0, 10);

    let html = top10.map((item, i) => {

        const esYo = item.uid === uidActual;
        const subtitulo = item.completo
            ? `✅ ${item.contador}/${item.meta} · ${formatearDuracion(item.tiempoTotalSegundos)}`
            : `${item.contador}/${item.meta} · ${formatearDuracion(item.tiempoTotalSegundos)}`;

        return `
            <div class="filaRanking ${esYo ? "filaRankingPropia" : ""}">
                <span class="lugarRanking">${medallas[i] || (i + 1) + "."}</span>
                <span class="infoRanking">
                    <strong>${item.nombre}${esYo ? " (tú)" : ""}</strong><br>
                    <span class="gradoRanking">${subtitulo}</span>
                </span>
            </div>
        `;

    }).join("");

    html += `
        <button id="btnVerMiPosicionPremioGordo" class="verPosicionBtn">
            📍 Ver mi posición
        </button>
    `;

    contenedor.innerHTML = html;

    document.getElementById("btnVerMiPosicionPremioGordo").addEventListener("click", () => {

        const indice = lista.findIndex(item => item.uid === uidActual);

        if (indice === -1) {
            mostrarModalPosicionPremioGordo(
                "Todavía sin lecturas difíciles en racha",
                lista.length,
                "Tu posición en El premio gordo"
            );
        } else {
            mostrarModalPosicionPremioGordo(indice + 1, lista.length, "Tu posición en El premio gordo");
        }

    });

}

let dejarDeEscucharPremioGordo = null;

function iniciarEscuchaPremioGordo(uidActual) {

    dejarDeEscucharPremioGordo = db.collection("rankingPremioGordo").doc("actual")
        .onSnapshot(doc => {

            if (!doc.exists) {
                mostrarPremioGordo([], uidActual);
                return;
            }

            mostrarPremioGordo(doc.data().lista, uidActual);

        }, error => {
            console.error("Error al escuchar El premio gordo:", error);
            document.getElementById("listaPremioGordo").innerHTML =
                "<p style='text-align:center;'>Ocurrió un error al cargar El premio gordo.</p>";
        });

}

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("listaPremioGordo").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para ver El premio gordo.</p>";
        return;
    }

    iniciarEscuchaPremioGordo(user.uid);

});

window.addEventListener("beforeunload", () => {
    if (dejarDeEscucharPremioGordo) dejarDeEscucharPremioGordo();
});
