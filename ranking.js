// ==========================================================
// RANKING POR COLEGIO / GRADO — EN TIEMPO REAL
// ==========================================================
// El documento "rankingActual" se recalcula automáticamente en
// puntos.js cada vez que alguien completa un cuestionario y gana
// puntos. Esta pantalla simplemente "escucha" ese documento con
// onSnapshot, así que se actualiza sola, sin recargar la página,
// apenas alguien más suma puntos.
// ==========================================================

function mostrarRanking(lista, fecha) {
    document.getElementById("fechaActualizacion").textContent =
        fecha ? `(última actualización: ${fecha})` : "";

    const contenedor = document.getElementById("listaRanking");

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay estudiantes con puntos registrados.</p>";
        return;
    }

    const medallas = ["🥇", "🥈", "🥉"];

    contenedor.innerHTML = lista.map((item, i) => `
        <div class="filaRanking">
            <span class="lugarRanking">${medallas[i] || (i + 1) + "."}</span>
            <span class="infoRanking">
                <strong>${item.colegio}</strong> — ${item.grado}
            </span>
            <span class="puntosRanking">${item.puntos} pts</span>
        </div>
    `).join("");
}

let dejarDeEscuchar = null;

function iniciarEscuchaRanking() {
    // onSnapshot mantiene una conexión abierta: cada vez que el documento
    // cambia en Firestore (porque alguien más completó un cuestionario),
    // este callback se vuelve a ejecutar solo, sin que el usuario recargue.
    dejarDeEscuchar = db.collection("rankingActual").doc("actual")
        .onSnapshot(doc => {
            if (!doc.exists) {
                mostrarRanking([], null);
                return;
            }

            const data = doc.data();
            const fecha = data.actualizadoEn
                ? data.actualizadoEn.toDate().toLocaleString("es-GT")
                : null;

            mostrarRanking(data.lista, fecha);
        }, error => {
            console.error("Error al escuchar el ranking:", error);
            document.getElementById("listaRanking").innerHTML =
                "<p style='text-align:center;'>Ocurrió un error al cargar el ranking.</p>";
        });
}

// Firebase auth ya inicializado en firebase-init.js
auth.onAuthStateChanged((user) => {
    if (!user) {
        document.getElementById("listaRanking").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para ver el ranking.</p>";
        return;
    }

    iniciarEscuchaRanking();
});

// Buena práctica: dejar de escuchar si el usuario sale de la página
window.addEventListener("beforeunload", () => {
    if (dejarDeEscuchar) dejarDeEscuchar();
});
