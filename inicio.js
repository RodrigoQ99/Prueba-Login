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
    const cajaSugerencia = document.getElementById("sugerenciaNuevaLectura");
    const user = auth.currentUser;

    if (!user) return;

    // Averiguar qué lecturas ha DESBLOQUEADO (escaneado) este usuario
    let desbloqueadas = [];

    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        desbloqueadas = (usuarioDoc.exists && usuarioDoc.data().lecturasDesbloqueadas) || [];
    } catch (error) {
        console.error("Error al cargar las lecturas desbloqueadas:", error);
    }

    if (desbloqueadas.length === 0) {
        contenedorLista.innerHTML =
            "<p style='text-align:center;'>Todavía no has escaneado ningún código QR. " +
            "¡Busca uno en tu golosina y comienza tu primera lectura! 🍬</p>";
        if (cajaSugerencia) cajaSugerencia.style.display = "none";
        return;
    }

    // Averiguar cuáles completó con éxito
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

    // Solo las lecturas que YA escaneó (no todo el catálogo)
    const lecturasDesbloqueadas = CATALOGO_LECTURAS.filter(
        lectura => desbloqueadas.includes(lectura.id)
    );

    contenedorLista.innerHTML = lecturasDesbloqueadas.map(lectura => {

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


    // Si ya completó TODAS las que tiene desbloqueadas, sugerirle una
    // lectura nueva al azar (de las que todavía no ha escaneado)
    if (!cajaSugerencia) return;

    const todasCompletas = lecturasDesbloqueadas.every(
        lectura => idsCompletados.has(lectura.id)
    );

    const pendientesPorDescubrir = CATALOGO_LECTURAS.filter(
        lectura => !desbloqueadas.includes(lectura.id)
    );

    if (todasCompletas && pendientesPorDescubrir.length > 0) {

        const sugerida = pendientesPorDescubrir[
            Math.floor(Math.random() * pendientesPorDescubrir.length)
        ];

        cajaSugerencia.style.display = "block";
        cajaSugerencia.innerHTML = `
            <p>🎉 ¡Completaste todas tus lecturas con la puntuación máxima!</p>
            <a href="lectura.html?id=${encodeURIComponent(sugerida.id)}" class="menuLink"
               style="display:inline-block; max-width:300px; margin:12px auto 0;">
                Descubrir una nueva lectura sorpresa →
            </a>
        `;

    } else if (todasCompletas) {

        cajaSugerencia.style.display = "block";
        cajaSugerencia.innerHTML = `
            <p>🏆 ¡Completaste TODAS las lecturas disponibles! Eres una leyenda de la lectura.</p>
        `;

    } else {

        cajaSugerencia.style.display = "none";

    }

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarListaLecturas();
}
