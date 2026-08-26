// ==========================================================
// PANTALLA DE INICIO — "Mis lecturas"
// ==========================================================
// NOMBRE_NIVEL vive en lecturas.js (lo comparte con admin.js y
// admin-estadisticas.js).

async function cargarListaLecturas() {

    const contenedorLista = document.getElementById("listaLecturasInicio");
    const cajaSugerencia = document.getElementById("sugerenciaNuevaLectura");
    const user = auth.currentUser;

    if (!user) return;

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

    if (desbloqueadasCompletas.length === 0) {
        contenedorLista.innerHTML =
            "<p style='text-align:center;'>Todavía no has desbloqueado ninguna lectura. " +
            "¡Busca el código de tu golosina e ingrésalo para comenzar tu primera lectura! 🍬</p>";
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


    // Si ya completó TODAS las que tiene desbloqueadas, felicitarla —
    // pero SIN ofrecerle un atajo a una lectura nueva: la única forma de
    // desbloquear lecturas es ingresando un código (ver desbloqueo.js).
    if (!cajaSugerencia) return;

    const todasCompletas = lecturasDesbloqueadas.every(
        lectura => idsCompletados.has(lectura.id)
    );

    // El mensaje es para cuando ya tiene VARIAS lecturas desbloqueadas —
    // no debe aparecer justo al terminar su primera y única lectura.
    const tieneVariasDesbloqueadas = lecturasDesbloqueadas.length > 1;

    const pendientesPorDescubrir = CATALOGO_LECTURAS.filter(
        lectura => !desbloqueadasCompletas.includes(lectura.id)
    );

    if (!tieneVariasDesbloqueadas) {

        cajaSugerencia.style.display = "none";

    } else if (todasCompletas && pendientesPorDescubrir.length > 0) {

        cajaSugerencia.style.display = "block";
        cajaSugerencia.innerHTML = `
            <p>🎉 ¡Completaste todas tus lecturas con la puntuación máxima!
            Busca más códigos en tus golosinas para descubrir lecturas nuevas.</p>
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

// ==========================================================
// SUGERENCIAS (lecturas de otros usuarios que coinciden con los
// géneros de interés marcados en el perfil — ver protagonista.js y
// admin-lecturas.js, "Publicar como lectura de premios")
// ==========================================================
// A diferencia de "Lecturas premiadas", aquí NO importa si el usuario
// tiene o no el código: se muestran TODAS las que coincidan con sus
// géneros favoritos (aunque también tenga código para alguna — en ese
// caso aparece en ambos apartados, cada uno con su propio
// comportamiento). Se abren en lectura-libre.html: sin cronómetro,
// sin puntos, a su propio ritmo.

async function cargarSugerenciasGenero(user) {

    const contenedor = document.getElementById("listaSugerenciasGenero");
    if (!contenedor) return;

    let generosUsuario = [];

    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        generosUsuario = (usuarioDoc.exists && usuarioDoc.data().generosLectura) || [];
    } catch (error) {
        console.error("No se pudieron cargar tus géneros de interés:", error);
    }

    if (generosUsuario.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>Marca tus géneros favoritos " +
            "en \"Editar perfil\" para ver sugerencias aquí.</p>";
        return;
    }

    // Firestore solo permite hasta 10 valores en un "in" — si el usuario
    // marcó más géneros que eso, se usan los primeros 10.
    const generosConsulta = generosUsuario.slice(0, 10);

    let lecturasSugeridas = [];

    try {
        const snapshot = await db.collection("lecturas")
            .where("genero", "in", generosConsulta)
            .get();
        lecturasSugeridas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudieron cargar las sugerencias:", error);
        contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar las sugerencias.</p>";
        return;
    }

    if (lecturasSugeridas.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>Todavía no hay lecturas de tus géneros favoritos. ¡Vuelve pronto!</p>";
        return;
    }

    const porGenero = {};
    lecturasSugeridas.forEach(lectura => {
        if (!porGenero[lectura.genero]) porGenero[lectura.genero] = [];
        porGenero[lectura.genero].push(lectura);
    });

    contenedor.innerHTML = Object.keys(porGenero).sort().map(genero => `
        <details class="grupoNivelAdmin">
            <summary>${genero} (${porGenero[genero].length})</summary>
            <div class="listaAdminLecturasNivel">
                ${porGenero[genero].map(lectura => `
                    <a href="lectura-libre.html?id=${encodeURIComponent(lectura.id)}" class="tarjetaLectura">
                        <div class="tarjetaInfo">
                            <p class="tarjetaTitulo">${lectura.titulo}</p>
                            <p class="tarjetaNivel">Por ${lectura.autorNombre || "un usuario"}</p>
                        </div>
                        <span class="tarjetaEstado">Leer →</span>
                    </a>
                `).join("")}
            </div>
        </details>
    `).join("");

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarListaLecturas();
    const user = auth.currentUser;
    if (user) cargarSugerenciasGenero(user);
}
