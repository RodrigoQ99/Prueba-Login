// ==========================================================
// LECTURA LIBRE (desde "Sugerencias" en Lecturas)
// ==========================================================
// A diferencia de lectura.html (motor.js), aquí NO hay cronómetro, NO
// se exige haber desbloqueado con código, y NO se otorgan puntos,
// premios ni racha — es una lectura de descubrimiento libre, a su
// propio ritmo. Solo cuenta como "vista" (mismo contador que usa
// motor.js, ver "Mis publicaciones" en perfil.js).
//
// El cuestionario (si la lectura tiene preguntas) es un autochequeo:
// se califica EN MEMORIA, igual que la vista previa del administrador
// (ver admin.js, abrirVistaPreviaLectura) — nunca se guarda
// en "progreso" ni afecta ranking.
// ==========================================================

const parametrosLibre = new URLSearchParams(window.location.search);
const idLecturaLibre = parametrosLibre.get("id");

async function iniciarLecturaLibre() {

    const cont = document.getElementById("cuerpoLecturaLibre");
    const tituloEl = document.getElementById("tituloLecturaLibre");

    if (!idLecturaLibre) {
        tituloEl.textContent = "Lectura no encontrada";
        cont.innerHTML = "<p style='text-align:center;'>Falta el ID de la lectura.</p>";
        return;
    }

    let lectura;

    try {
        const doc = await db.collection("lecturas").doc(idLecturaLibre).get();
        if (!doc.exists) {
            tituloEl.textContent = "Lectura no encontrada";
            cont.innerHTML = "<p style='text-align:center;'>Esta lectura ya no está disponible.</p>";
            return;
        }
        lectura = { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error("No se pudo cargar la lectura:", error);
        tituloEl.textContent = "Error";
        cont.innerHTML = "<p style='text-align:center;'>Ocurrió un error al cargar la lectura.</p>";
        return;
    }

    document.title = lectura.titulo;
    tituloEl.textContent = lectura.titulo;

    // Cuenta esta apertura como "vista" — mismo contador que usa
    // motor.js, sin afectar puntos/racha/ranking.
    db.collection("lecturas").doc(lectura.id)
        .update({ vistas: firebase.firestore.FieldValue.increment(1) })
        .catch(error => console.error("No se pudo registrar la vista de esta lectura:", error));

    const preguntas = lectura.bancoPreguntas || [];

    cont.innerHTML = `
        ${lectura.autorNombre ? `<p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">✍️ Por ${lectura.autorNombre}</p>` : ""}
        <div style="text-align:left; margin-bottom:25px;">
            ${(lectura.texto || []).map(p => `<p style="margin-bottom:14px;">${p}</p>`).join("")}
        </div>
        ${preguntas.length > 0 ? `
            <h3>Ponte a prueba (opcional)</h3>
            <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
                Solo para comprobar cuánto entendiste — no suma puntos.
            </p>
            <div id="preguntasLecturaLibre" style="text-align:left;"></div>
            <button type="button" id="btnCalificarLecturaLibre" style="margin-top:15px;">Ver resultado</button>
            <p id="resultadoLecturaLibre" style="display:none; text-align:center; font-weight:700; margin-top:15px;"></p>
        ` : ""}
    `;

    if (preguntas.length === 0) return;

    const contPreguntas = document.getElementById("preguntasLecturaLibre");
    contPreguntas.innerHTML = preguntas.map((pregunta, pi) => `
        <div style="margin-bottom:15px;">
            <p style="font-weight:600; margin-bottom:6px;">${pi + 1}. ${pregunta.pregunta}</p>
            ${pregunta.opciones.map(opcion => `
                <label style="display:block; margin-bottom:4px;">
                    <input type="radio" name="preguntaLibre${pi}" value="${opcion.valor}">
                    ${opcion.texto}
                </label>
            `).join("")}
        </div>
    `).join("");

    document.getElementById("btnCalificarLecturaLibre").addEventListener("click", () => {

        let correctas = 0;

        preguntas.forEach((pregunta, pi) => {
            const marcada = document.querySelector(`input[name="preguntaLibre${pi}"]:checked`);
            if (marcada && marcada.value === pregunta.correcta) correctas++;
        });

        const resultado = document.getElementById("resultadoLecturaLibre");
        resultado.style.display = "block";
        resultado.textContent = `${correctas} de ${preguntas.length} correctas`;

    });

}

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("cuerpoLecturaLibre").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para leer esto.</p>";
        return;
    }

    iniciarLecturaLibre();

});
