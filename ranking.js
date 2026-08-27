// ==========================================================
// RANKING — PERSONAL (todos) + COLEGIOS (solo estudiantes)
// ==========================================================
// Ambos documentos se recalculan automáticamente en puntos.js
// cada vez que alguien gana puntos. Aquí solo escuchamos los
// cambios con onSnapshot para que se actualicen en vivo.
//
// Ambos rankings muestran solo el TOP 10, con un botón para
// ver tu propia posición completa en una ventana emergente.
// ==========================================================


function normalizarComparacion(texto) {
    return (texto || "").toLowerCase().trim();
}


// ----------------------------------------------------------
// VENTANA EMERGENTE CON LA POSICIÓN
// ----------------------------------------------------------

function mostrarModalPosicion(posicion, total, etiqueta) {

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


// ----------------------------------------------------------
// RANKING PERSONAL (particulares y estudiantes, todos juntos)
// ----------------------------------------------------------

function mostrarRankingPersonal(lista, uidActual) {

    const contenedor = document.getElementById("listaRankingPersonal");

    // actualizarRankingPersonal() (ver puntos.js) ya no guarda a nadie con
    // 0 puntos, pero se filtra también acá por si el documento en
    // Firestore todavía no se ha vuelto a recalcular desde el último
    // cambio (ej. justo después de borrar todas las lecturas).
    lista = (lista || []).filter(item => item.puntos > 0);

    if (lista.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay puntos registrados.</p>";
        return;
    }

    const medallas = ["🥇", "🥈", "🥉"];
    const top10 = lista.slice(0, 10);

    let html = top10.map((item, i) => {

        const esYo = item.uid === uidActual;

        return `
            <div class="filaRanking ${esYo ? "filaRankingPropia" : ""}">
                <span class="lugarRanking">${medallas[i] || (i + 1) + "."}</span>
                <span class="infoRanking">
                    <strong>${item.nombre}${esYo ? " (tú)" : ""}</strong>
                </span>
                <span class="puntosRanking">${item.puntos} pts</span>
            </div>
        `;

    }).join("");

    html += `
        <button id="btnVerMiPosicionPersonal" class="verPosicionBtn">
            📍 Ver mi posición
        </button>
    `;

    contenedor.innerHTML = html;

    document.getElementById("btnVerMiPosicionPersonal").addEventListener("click", () => {

        const indice = lista.findIndex(item => item.uid === uidActual);

        if (indice === -1) {
            mostrarModalPosicion("Todavía sin puntos", lista.length, "Tu posición");
        } else {
            mostrarModalPosicion(indice + 1, lista.length, "Tu posición en el ranking personal");
        }

    });

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

function mostrarRankingColegios(lista, colegioActual, gradoActual) {

    const contenedor = document.getElementById("listaRanking");

    // Mismo criterio que mostrarRankingPersonal(): filtra por si acaso el
    // documento todavía no se recalculó desde el último cambio.
    lista = (lista || []).filter(item => item.puntos > 0);

    if (lista.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay estudiantes con puntos registrados.</p>";
        return;
    }

    const medallas = ["🥇", "🥈", "🥉"];
    const top10 = lista.slice(0, 10);

    let html = top10.map((item, i) => `
        <div class="filaRanking">
            <span class="lugarRanking">${medallas[i] || (i + 1) + "."}</span>
            <span class="infoRanking">
                <strong>${item.colegio}</strong><br>
                <span class="gradoRanking">${item.grado}</span>
            </span>
            <span class="puntosRanking">${item.puntos} pts</span>
        </div>
    `).join("");

    html += `
        <button id="btnVerMiPosicionColegio" class="verPosicionBtn">
            📍 Ver la posición de mi colegio
        </button>
    `;

    contenedor.innerHTML = html;

    document.getElementById("btnVerMiPosicionColegio").addEventListener("click", () => {

        const indice = lista.findIndex(item =>
            normalizarComparacion(item.colegio) === normalizarComparacion(colegioActual) &&
            normalizarComparacion(item.grado) === normalizarComparacion(gradoActual)
        );

        if (indice === -1) {
            mostrarModalPosicion("Todavía sin puntos", lista.length, "Posición de tu colegio");
        } else {
            mostrarModalPosicion(indice + 1, lista.length, "Posición de tu colegio y grado");
        }

    });

}

let dejarDeEscucharColegios = null;

function iniciarEscuchaRankingColegios(colegioActual, gradoActual) {

    dejarDeEscucharColegios = db.collection("rankingActual").doc("actual")
        .onSnapshot(doc => {

            if (!doc.exists) {
                mostrarRankingColegios([], colegioActual, gradoActual);
                return;
            }

            mostrarRankingColegios(doc.data().lista, colegioActual, gradoActual);

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

    // El ranking de colegios (y todo lo relacionado) solo se muestra
    // si el usuario es de tipo "estudiante". Un particular no ve nada
    // de esta sección.
    try {

        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        const datos = usuarioDoc.exists ? usuarioDoc.data() : null;
        const tipo = datos ? datos.tipo : null;

        const seccionColegios = document.getElementById("seccionRankingColegios");
        const seccionSoloEstudiantes = document.getElementById("seccionSoloEstudiantes");

        if (tipo === "estudiante") {
            seccionColegios.style.display = "block";
            seccionSoloEstudiantes.style.display = "none";
            iniciarEscuchaRankingColegios(datos.colegio, datos.grado);
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
