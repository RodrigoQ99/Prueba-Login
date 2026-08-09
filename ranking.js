// ==========================================================
// RANKING DIARIO POR COLEGIO / GRADO
// ==========================================================
// No se recalcula en cada visita: se guarda un documento por día
// (rankingDiario/AAAA-MM-DD) y solo se recalcula la PRIMERA vez que
// alguien entra a esta página ese día. El resto de visitas del mismo
// día simplemente leen ese documento ya guardado.
// ==========================================================

function fechaHoy() {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function calcularRankingDelDia() {
    // Trae a todos los usuarios tipo "estudiante"
    const snapshot = await db.collection("usuarios")
        .where("tipo", "==", "estudiante")
        .get();

    // Agrupa puntos por colegio + grado
    const grupos = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        const colegio = (data.colegio || "Sin colegio").trim();
        const grado = (data.grado || "Sin grado").trim();
        const clave = `${colegio}|||${grado}`;

        if (!grupos[clave]) {
            grupos[clave] = { colegio, grado, puntos: 0 };
        }

        grupos[clave].puntos += data.puntosTotales || 0;
    });

    const listaOrdenada = Object.values(grupos)
        .sort((a, b) => b.puntos - a.puntos);

    return listaOrdenada;
}

async function obtenerRanking() {
    const fecha = fechaHoy();
    const refHoy = db.collection("rankingDiario").doc(fecha);
    const doc = await refHoy.get();

    if (doc.exists) {
        return { fecha, lista: doc.data().lista };
    }

    // No existe todavía el ranking de hoy: se calcula y se guarda
    const lista = await calcularRankingDelDia();
    await refHoy.set({
        lista,
        calculadoEn: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { fecha, lista };
}

function mostrarRanking(fecha, lista) {
    document.getElementById("fechaActualizacion").textContent =
        `(última actualización: ${fecha})`;

    const contenedor = document.getElementById("listaRanking");

    if (!lista || lista.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center;'>Todavía no hay estudiantes registrados.</p>";
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

// Firebase auth ya inicializado en firebase-init.js
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        document.getElementById("listaRanking").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para ver el ranking.</p>";
        return;
    }

    try {
        const { fecha, lista } = await obtenerRanking();
        mostrarRanking(fecha, lista);
    } catch (error) {
        console.error("Error al cargar el ranking:", error);
        document.getElementById("listaRanking").innerHTML =
            "<p style='text-align:center;'>Ocurrió un error al cargar el ranking.</p>";
    }
});
