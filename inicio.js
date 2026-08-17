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

    // Trae el catálogo desde Firestore (solo hace la consulta la primera vez)
    await cargarCatalogoLecturas();

    // Averiguar qué lecturas ha DESBLOQUEADO (escaneado) este usuario,
    // cuáles ya intentó (su única oportunidad, usada o no) y si tiene
    // una oportunidad extra activa (bono de completista)
    let desbloqueadas = [];
    let lecturasIntentadas = [];
    let bonoActivo = null;

    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        const datosUsuario = usuarioDoc.exists ? usuarioDoc.data() : {};
        desbloqueadas = datosUsuario.lecturasDesbloqueadas || [];
        lecturasIntentadas = datosUsuario.lecturasIntentadas || [];
        bonoActivo = datosUsuario.bonoActivo || null;
    } catch (error) {
        console.error("Error al cargar las lecturas desbloqueadas:", error);
    }

    // Averiguar cuáles completó con éxito (y de paso, cuáles tiene
    // en su historial de progreso aunque sea de ANTES de que existiera
    // el sistema de "desbloqueadas" — así no se pierden lecturas viejas),
    // y su mejor resultado por lectura (para mostrarlo si ya no tiene oportunidad)
    let idsCompletados = new Set();
    let idsConProgreso = new Set();
    let mejorResultadoPorId = {};

    try {
        const snapshot = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            idsConProgreso.add(data.lecturaId);
            if (data.puntosGanados > 0) {
                idsCompletados.add(data.lecturaId);
            }

            const mejorActual = mejorResultadoPorId[data.lecturaId];
            if (!mejorActual || data.estrellas > mejorActual.estrellas) {
                mejorResultadoPorId[data.lecturaId] = { estrellas: data.estrellas, total: data.totalPreguntas };
            }
        });

    } catch (error) {
        console.error("Error al cargar el progreso:", error);
    }

    // Unir ambas fuentes: lo desbloqueado explícitamente + cualquier
    // lectura que ya tenga en su historial (por compatibilidad con
    // cuentas que ya tenían progreso antes de este cambio)
    const desbloqueadasCompletas = Array.from(
        new Set([...desbloqueadas, ...idsConProgreso])
    );

    // Si encontramos lecturas "de antes" que no estaban marcadas,
    // las guardamos ahora para no tener que repetir este cálculo
    if (desbloqueadasCompletas.length !== desbloqueadas.length) {
        db.collection("usuarios").doc(user.uid)
            .update({ lecturasDesbloqueadas: desbloqueadasCompletas })
            .catch(error => console.error("No se pudo actualizar lecturasDesbloqueadas:", error));
    }

    if (typeof inicializarAdminIndex === "function") inicializarAdminIndex();

    if (desbloqueadasCompletas.length === 0) {
        contenedorLista.innerHTML =
            "<p style='text-align:center;'>Todavía no has escaneado ningún código QR. " +
            "¡Busca uno en tu golosina y comienza tu primera lectura! 🍬</p>";
        if (cajaSugerencia) cajaSugerencia.style.display = "none";
        return;
    }

    // Solo las lecturas que YA escaneó (no todo el catálogo)
    const lecturasDesbloqueadas = CATALOGO_LECTURAS.filter(
        lectura => desbloqueadasCompletas.includes(lectura.id)
    );

    contenedorLista.innerHTML = lecturasDesbloqueadas.map(lectura => {

        const completada = idsCompletados.has(lectura.id);
        const nivelTexto = NOMBRE_NIVEL[lectura.nivel] || lectura.nivel;

        const yaIntentada = lecturasIntentadas.includes(lectura.id);
        const tieneBono = bonoActivo === lectura.id;
        const bloqueada = !completada && yaIntentada && !tieneBono;

        const mejor = mejorResultadoPorId[lectura.id];

        let estado = "Comenzar →";
        if (completada) {
            estado = `Completada${mejor ? `<br>${generarHTMLEstrellas(mejor.estrellas, mejor.total)}` : ""}`;
        } else if (bloqueada) {
            estado = mejor
                ? `Sin aprobar<br>${generarHTMLEstrellas(mejor.estrellas, mejor.total)}`
                : "Sin oportunidad";
        } else if (tieneBono) {
            estado = "🎁 Oportunidad extra →";
        }

        return `
            <a href="lectura.html?id=${encodeURIComponent(lectura.id)}"
               class="tarjetaLectura ${completada ? "tarjetaCompletada" : ""} ${bloqueada ? "tarjetaBloqueada" : ""}">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${lectura.titulo}</p>
                    <p class="tarjetaNivel">Nivel ${nivelTexto}</p>
                </div>
                <span class="tarjetaEstado">${estado}</span>
            </a>
        `;

    }).join("");


    // Si ya completó TODAS las que tiene desbloqueadas, sugerirle una
    // lectura nueva al azar (de las que todavía no ha escaneado)
    if (!cajaSugerencia) return;

    const todasCompletas = lecturasDesbloqueadas.every(
        lectura => idsCompletados.has(lectura.id)
    );

    // La sugerencia de "lectura sorpresa" es para cuando ya tiene VARIAS
    // lecturas desbloqueadas (por ejemplo, volvió a escanear una que ya
    // había hecho) — no debe aparecer justo al terminar su primera y
    // única lectura.
    const tieneVariasDesbloqueadas = lecturasDesbloqueadas.length > 1;

    const pendientesPorDescubrir = CATALOGO_LECTURAS.filter(
        lectura => !desbloqueadasCompletas.includes(lectura.id)
    );

    if (!tieneVariasDesbloqueadas) {

        cajaSugerencia.style.display = "none";

    } else if (todasCompletas && pendientesPorDescubrir.length > 0) {

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
