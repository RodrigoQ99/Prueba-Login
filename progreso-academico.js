// ==========================================================
// PROGRESO ACADÉMICO (VISTA DEL ALUMNO)
// ==========================================================
// Esta pantalla solo se activa si el alumno está vinculado a
// un colegio (tiene colegioId y seccionId en su documento de
// usuarios). Muestra sus tareas asignadas y un resumen de su
// desempeño académico.
// ==========================================================

const pantallaLogin = document.getElementById("pantallaLoginAlumno");
const contenedorProgreso = document.getElementById("contenedorProgreso");

let _datosAlumno = null;

document.getElementById("btnLoginGoogle").addEventListener("click", () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => console.error(e));
});

auth.onAuthStateChanged(async (user) => {
    pantallaLogin.style.display = "none";
    contenedorProgreso.style.display = "none";

    if (!user) { pantallaLogin.style.display = "flex"; return; }

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        _datosAlumno = doc.exists ? { uid: user.uid, ...doc.data() } : null;

        if (!_datosAlumno || !_datosAlumno.colegioId || !_datosAlumno.seccionId) {
            // No está vinculado a un colegio
            pantallaLogin.style.display = "flex";
            document.querySelector(".cajaAuth p").textContent =
                "No estás vinculado a ningún colegio. Pide a tu maestro que te agregue.";
            return;
        }

        // Cargar info del colegio y sección
        const colegioDoc = await db.collection("colegios").doc(_datosAlumno.colegioId).get();
        const colegioNombre = colegioDoc.exists ? colegioDoc.data().nombre : "Mi colegio";

        // Buscar la sección
        let seccionNombre = "";
        let gradoNombre = "";
        const seccionesSnap = await db.collection("colegios").doc(_datosAlumno.colegioId)
            .collection("secciones").get();
        seccionesSnap.forEach(sDoc => {
            if (sDoc.id === _datosAlumno.seccionId) {
                seccionNombre = sDoc.data().nombre || "";
                gradoNombre = sDoc.data().gradoNombre || "";
            }
        });

        document.getElementById("subtituloProgreso").textContent =
            `${colegioNombre} — ${gradoNombre} ${seccionNombre}`;

        contenedorProgreso.style.display = "block";
        cargarResumen();
        cargarTareasAlumno();

    } catch (error) {
        console.error("Error al cargar progreso académico:", error);
    }
});


async function cargarResumen() {

    const contenedor = document.getElementById("datosResumen");

    try {

        const progresoSnap = await db.collection("progresoEscolar")
            .where("uid", "==", _datosAlumno.uid)
            .get();

        let tareasCompletadas = 0;
        let tareasAnuladas = 0;
        let tareasSospechosas = 0;
        let totalComprension = 0;
        let countComprension = 0;

        progresoSnap.forEach(doc => {
            const data = doc.data();
            if (data.estado === "completada") {
                tareasCompletadas++;
                if (typeof data.comprensionPorcentaje === "number") {
                    totalComprension += data.comprensionPorcentaje;
                    countComprension++;
                }
            }
            if (data.estado === "anulada") tareasAnuladas++;
            if (data.estado === "sospechosa") tareasSospechosas++;
        });

        const promedioComprension = countComprension > 0
            ? Math.round(totalComprension / countComprension)
            : 0;

        contenedor.innerHTML = `
            <p class="datosAlumno">🏆 ${_datosAlumno.puntosTotales || 0} puntos totales</p>
            <p class="datosAlumno">✅ ${tareasCompletadas} tarea(s) completada(s)</p>
            <p class="datosAlumno">📊 Comprensión promedio: ${promedioComprension}%</p>
            <div class="barraProgreso" style="margin:8px 0;">
                <div class="relleno ${promedioComprension >= 70 ? 'verde' : promedioComprension >= 40 ? 'amarillo' : 'rojo'}" style="width:${promedioComprension}%"></div>
            </div>
            ${tareasAnuladas > 0 ? `<span class="alertaAntiTrampas">❌ ${tareasAnuladas} anulada(s)</span> ` : ''}
            ${tareasSospechosas > 0 ? `<span class="alertaAntiTrampas">⚠️ ${tareasSospechosas} sospechosa(s)</span>` : ''}
        `;

    } catch (error) {
        console.error("Error al cargar resumen:", error);
        contenedor.innerHTML = '<p style="color:#c0392b;">Error al cargar resumen.</p>';
    }
}


async function cargarTareasAlumno() {

    const contenedor = document.getElementById("listaTareasAlumno");
    contenedor.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">Cargando…</p>';

    try {

        const tareasSnap = await db.collection("tareasEscolares")
            .where("seccionId", "==", _datosAlumno.seccionId)
            .orderBy("fechaLimite", "desc")
            .get();

        if (tareasSnap.empty) {
            contenedor.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">No tienes tareas asignadas.</p>';
            return;
        }

        // Cargar progreso del alumno
        const progresoSnap = await db.collection("progresoEscolar")
            .where("uid", "==", _datosAlumno.uid)
            .get();
        const progresoMap = {};
        progresoSnap.forEach(doc => {
            const data = doc.data();
            progresoMap[data.tareaId] = data;
        });

        const ahora = new Date();
        let html = '<div class="listaTareas">';

        tareasSnap.forEach(doc => {
            const t = doc.data();
            const inicio = t.fechaInicio ? (t.fechaInicio.toDate ? t.fechaInicio.toDate() : new Date(t.fechaInicio)) : null;
            const limite = t.fechaLimite ? (t.fechaLimite.toDate ? t.fechaLimite.toDate() : new Date(t.fechaLimite)) : null;

            const prog = progresoMap[doc.id];

            let estadoClase = "";
            let estadoTexto = "";
            let estadoBadge = "";
            let puedeIniciar = false;

            if (prog) {
                if (prog.estado === "completada") {
                    estadoTexto = `✅ Completada (${prog.comprensionPorcentaje || 0}%)`;
                    estadoBadge = "estadoCompletada";
                } else if (prog.estado === "anulada") {
                    estadoTexto = "❌ Anulada";
                    estadoBadge = "estadoAnulada";
                } else if (prog.estado === "sospechosa") {
                    estadoTexto = "⚠️ En revisión";
                    estadoBadge = "estadoSospechosa";
                }
            } else if (limite && ahora > limite) {
                estadoTexto = "Cerrada (no entregada)";
                estadoBadge = "estadoAnulada";
            } else if (inicio && ahora < inicio) {
                estadoTexto = "Programada";
                estadoBadge = "estadoPendiente";
            } else {
                estadoTexto = "Disponible";
                estadoBadge = "estadoDisponible";
                puedeIniciar = true;
            }

            const fechaLimiteStr = limite
                ? limite.toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                : "—";

            html += `
                <div class="tarjetaTarea ${prog ? '' : 'tareaActiva'}">
                    <p class="tituloTarea">${t.titulo || "Sin título"}</p>
                    <p class="metaTarea">📅 Límite: ${fechaLimiteStr}</p>
                    ${t.metaPPM ? `<p class="metaTarea">🎯 Meta: ${t.metaPPM} PPM | ${t.metaComprension || '?'}% comprensión</p>` : ''}
                    <p class="metaTarea">⏱️ ${t.tiempoExamenMinutos || 15} min | ${t.cantidadPreguntas || '?'} preguntas</p>
                    <span class="estadoTarea ${estadoBadge}">${estadoTexto}</span>
                    ${puedeIniciar ? `
                        <button type="button" class="botonAdminChico btnIniciarExamen" data-tarea-id="${doc.id}"
                                style="display:block; margin-top:10px; width:100%; padding:12px; font-size:15px;">
                            📝 Iniciar evaluación
                        </button>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        contenedor.innerHTML = html;

        // Eventos: iniciar examen
        contenedor.querySelectorAll(".btnIniciarExamen").forEach(btn => {
            btn.addEventListener("click", () => {
                window.location.href = `examen-escolar.html?tarea=${btn.dataset.tareaId}`;
            });
        });

    } catch (error) {
        console.error("Error al cargar tareas:", error);
        contenedor.innerHTML = '<p style="text-align:center; color:#c0392b;">Error al cargar.</p>';
    }
}
