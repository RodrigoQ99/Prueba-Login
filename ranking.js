// ==========================================================
// RANKING — PERSONAL (todos) + COLEGIOS (solo estudiantes)
// ==========================================================
// Ambos documentos se recalculan automáticamente en puntos.js
// cada vez que alguien gana puntos. Aquí solo escuchamos los
// cambios con onSnapshot para que se actualicen en vivo.
// ==========================================================


// ----------------------------------------------------------
// RANKING PERSONAL (particulares y estudiantes, todos juntos)
// ----------------------------------------------------------

function mostrarRankingPersonal(lista, uidActual) {

    const contenedor = document.getElementById("listaRankingPersonal");

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay puntos registrados.</p>";
        return;
    }

    const medallas = ["🥇", "🥈", "🥉"];

    contenedor.innerHTML = lista.map((item, i) => {

        const esYo = item.uid === uidActual;
        const etiquetaTipo = item.tipo === "estudiante" ? "Estudiante" : "Particular";

        return `
            <div class="filaRanking ${esYo ? "filaRankingPropia" : ""}">
                <span class="lugarRanking">${medallas[i] || (i + 1) + "."}</span>
                <span class="infoRanking">
                    <strong>${item.nombre}${esYo ? " (tú)" : ""}</strong> — ${etiquetaTipo}
                </span>
                <span class="puntosRanking">${item.puntos} pts</span>
            </div>
        `;

    }).join("");

}

let dejarDeEscucharPersonal = null;

function iniciarEscuchaRankingPersonal(uidActual) {

    dejarDeEscucharPersonal = db.collection("rankingPersonal").doc("actual")
        .onSnapshot(doc => {

            if (!doc.exists) {
                mostrarRankingPersonal([], uidActual);
                return;
            }

            mostrarRankingPersonal(doc.data().lista, uidActual);

        }, error => {
            console.error("Error al escuchar el ranking personal:", error);
            document.getElementById("listaRankingPersonal").innerHTML =
                "<p style='text-align:center;'>Ocurrió un error al cargar el ranking.</p>";
        });

}


// ----------------------------------------------------------
// RANKING DE COLEGIOS (solo visible para usuarios "estudiante")
// ----------------------------------------------------------

function mostrarRankingColegios(lista) {

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

let dejarDeEscucharColegios = null;

function iniciarEscuchaRankingColegios() {

    dejarDeEscucharColegios = db.collection("rankingActual").doc("actual")
        .onSnapshot(doc => {

            if (!doc.exists) {
                mostrarRankingColegios([]);
                return;
            }

            mostrarRankingColegios(doc.data().lista);

        }, error => {
            console.error("Error al escuchar el ranking de colegios:", error);
            document.getElementById("listaRanking").innerHTML =
                "<p style='text-align:center;'>Ocurrió un error al cargar el ranking.</p>";
        });

}


// ----------------------------------------------------------
// ARRANQUE: decide qué secciones mostrar según el tipo de usuario
// ----------------------------------------------------------

auth.onAuthStateChanged(async (user) => {

    if (!user) {
        document.getElementById("listaRankingPersonal").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para ver el ranking.</p>";
        return;
    }

    // El ranking personal es para TODOS
    iniciarEscuchaRankingPersonal(user.uid);

    // El ranking de colegios solo se muestra si es estudiante
    try {

        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        const tipo = usuarioDoc.exists ? usuarioDoc.data().tipo : null;

        const seccionColegios = document.getElementById("seccionRankingColegios");
        const seccionSoloEstudiantes = document.getElementById("seccionSoloEstudiantes");

        if (tipo === "estudiante") {
            seccionColegios.style.display = "block";
            seccionSoloEstudiantes.style.display = "none";
            iniciarEscuchaRankingColegios();
        } else {
            seccionColegios.style.display = "none";
            seccionSoloEstudiantes.style.display = "block";
        }

    } catch (error) {
        console.error("Error al revisar el tipo de usuario:", error);
    }

});

// Buena práctica: dejar de escuchar si el usuario sale de la página
window.addEventListener("beforeunload", () => {
    if (dejarDeEscucharPersonal) dejarDeEscucharPersonal();
    if (dejarDeEscucharColegios) dejarDeEscucharColegios();
});
