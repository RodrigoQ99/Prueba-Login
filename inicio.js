// ==========================================================
// PANTALLA DE INICIO — "Mis lecturas"
// ==========================================================

const NOMBRE_NIVEL = {
    facil: "Fácil",
    intermedio: "Intermedio",
    dificil: "Difícil"
};

async function cargarListaLecturas() {

    const contenedorLista = document.getElementById("listaLecturasInicio");
    const user = auth.currentUser;

    if (!user) return;

    if (CATALOGO_LECTURAS.length === 0) {
        contenedorLista.innerHTML =
            "<p style='text-align:center;'>Todavía no hay lecturas disponibles.</p>";
        return;
    }

    // Averiguar cuáles lecturas ya completó (con éxito) este usuario
    let idsCompletados = new Set();

    try {
        const snapshot = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.puntosGanados > 0) {
                idsCompletados.add(data.lecturaId);
            }
        });

    } catch (error) {
        console.error("Error al cargar el progreso:", error);
    }

    contenedorLista.innerHTML = CATALOGO_LECTURAS.map(lectura => {

        const completada = idsCompletados.has(lectura.id);
        const nivelTexto = NOMBRE_NIVEL[lectura.nivel] || lectura.nivel;

        return `
            <a href="lectura.html?id=${encodeURIComponent(lectura.id)}"
               class="tarjetaLectura ${completada ? "tarjetaCompletada" : ""}">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${lectura.titulo}</p>
                    <p class="tarjetaNivel">Nivel ${nivelTexto}</p>
                </div>
                <span class="tarjetaEstado">
                    ${completada ? "✅ Completada" : "Comenzar →"}
                </span>
            </a>
        `;

    }).join("");

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarListaLecturas();
}
