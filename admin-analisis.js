// ==========================================================
// PÁGINA "ANÁLISIS CON IA" (dentro del panel de administrador) — Etapa 37
// ==========================================================
// Mismo patrón de acceso independiente que admin-estadisticas.html:
// login propio, gate contra esAdmin(). El admin escribe una pregunta en
// lenguaje natural + filtros opcionales; la Cloud Function
// (analizarDatosUsuariosIA, ver admin-ia.js) hace TODO el conteo del
// lado del servidor y solo le manda a Claude el resumen ya compacto —
// aquí solo se arma la pregunta/filtros y se muestra la respuesta.
//
// "Librería de respuestas": consultas ya guardadas (colección
// analisisIA, ver firestore.rules — solo lectura para el admin, solo
// la Cloud Function escribe) que se pueden volver a filtrar SIN gastar
// una consulta nueva a la IA.
// ==========================================================

const pantallaLoginAdmin = document.getElementById("pantallaLoginAdmin");
const pantallaSinPermiso = document.getElementById("pantallaSinPermiso");
const contenedorAdminPanel = document.getElementById("contenedorAdminPanel");

document.getElementById("btnLoginGoogleAdmin").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión. Intenta de nuevo.");
    });
});

document.getElementById("btnCerrarSesionAdminSinPermiso").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged(async (user) => {

    pantallaLoginAdmin.style.display = "none";
    pantallaSinPermiso.style.display = "none";
    contenedorAdminPanel.style.display = "none";

    if (!user) {
        pantallaLoginAdmin.style.display = "flex";
        return;
    }

    await cargarAdministradores();

    if (!esAdmin()) {
        pantallaSinPermiso.style.display = "flex";
        return;
    }

    contenedorAdminPanel.style.display = "block";
    inicializarAnalisis();

});


// ==========================================================
// FILTROS (compartidos entre "preguntar" y "librería de respuestas")
// ==========================================================

async function inicializarAnalisis() {

    renderizarSelectorPaisConGlobal(document.getElementById("filtroPais"), "");
    await cargarGenerosLectura();
    renderizarCheckboxesGeneros(document.getElementById("filtroGenerosLectura"), []);

    document.getElementById("btnPreguntarAnalisis").addEventListener("click", preguntarConIA);
    document.getElementById("btnFiltrarLibreria").addEventListener("click", () => cargarLibreria(leerFiltrosActuales()));
    document.getElementById("btnLimpiarFiltroLibreria").addEventListener("click", () => cargarLibreria(null));

    cargarLibreria(null);

}

function leerFiltrosActuales() {

    const edadMin = document.getElementById("filtroEdadMin").value;
    const edadMax = document.getElementById("filtroEdadMax").value;
    const genero = document.getElementById("filtroGenero").value;
    const pais = document.getElementById("filtroPais").value;
    const generosLectura = leerGenerosSeleccionados(document.getElementById("filtroGenerosLectura"));

    return {
        edadMin: edadMin !== "" ? Number(edadMin) : null,
        edadMax: edadMax !== "" ? Number(edadMax) : null,
        genero: genero || null,
        pais: pais || null,
        generosLectura: generosLectura
    };

}

function etiquetaFiltros(filtros) {

    if (!filtros) return "Sin filtros";

    const partes = [];
    if (typeof filtros.edadMin === "number") partes.push(`desde ${filtros.edadMin} años`);
    if (typeof filtros.edadMax === "number") partes.push(`hasta ${filtros.edadMax} años`);
    if (filtros.genero) partes.push(filtros.genero === "hombre" ? "Hombre" : "Mujer");
    if (filtros.pais) partes.push(filtros.pais);
    if (filtros.generosLectura && filtros.generosLectura.length > 0) partes.push(filtros.generosLectura.join(", "));

    return partes.length > 0 ? partes.join(" · ") : "Sin filtros";

}


// ==========================================================
// PREGUNTAR
// ==========================================================

async function preguntarConIA() {

    const campoPregunta = document.getElementById("campoPreguntaAnalisis");
    const pregunta = campoPregunta.value.trim();
    const btn = document.getElementById("btnPreguntarAnalisis");
    const cajaRespuesta = document.getElementById("respuestaAnalisis");

    if (!pregunta) {
        alert("Escribe una pregunta.");
        return;
    }

    const filtros = leerFiltrosActuales();

    btn.disabled = true;
    btn.textContent = "🤖 Pensando... (puede tardar unos segundos)";
    cajaRespuesta.style.display = "none";

    try {

        const { respuesta } = await analizarDatosUsuariosConIA({ pregunta, filtros });

        cajaRespuesta.innerHTML = `
            <p style="font-weight:600; margin-bottom:8px;">${pregunta}</p>
            <p style="white-space:pre-wrap;">${respuesta}</p>
            <p style="font-size:12px; color:var(--texto-suave); margin-top:10px;">Filtros usados: ${etiquetaFiltros(filtros)}</p>
        `;
        cajaRespuesta.style.display = "block";

        campoPregunta.value = "";
        cargarLibreria(null); // la consulta que se acaba de guardar ya aparece

    } catch (error) {

        console.error("No se pudo generar el análisis con IA:", error);
        cajaRespuesta.innerHTML = `<p style="color:#c0392b;">❌ No se pudo generar el análisis. ${(error && error.message) ? error.message : ""}</p>`;
        cajaRespuesta.style.display = "block";

    }

    btn.disabled = false;
    btn.textContent = "🤖 Preguntar";

}


// ==========================================================
// LIBRERÍA DE RESPUESTAS
// ==========================================================

function entradaCoincideFiltros(entrada, filtros) {

    if (!filtros) return true;

    const f = entrada.filtros || {};

    if (typeof filtros.edadMin === "number" && f.edadMin !== filtros.edadMin) return false;
    if (typeof filtros.edadMax === "number" && f.edadMax !== filtros.edadMax) return false;
    if (filtros.genero && f.genero !== filtros.genero) return false;
    if (filtros.pais && f.pais !== filtros.pais) return false;

    if (filtros.generosLectura && filtros.generosLectura.length > 0) {
        const propios = f.generosLectura || [];
        if (!filtros.generosLectura.some(g => propios.includes(g))) return false;
    }

    return true;

}

async function cargarLibreria(filtros) {

    const cont = document.getElementById("listaLibreriaAnalisis");
    cont.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    let entradas = [];
    try {
        const snapshot = await db.collection("analisisIA").orderBy("fecha", "desc").limit(100).get();
        entradas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudo cargar la librería de respuestas:", error);
        cont.innerHTML = "<p style='text-align:center;'>No se pudo cargar la librería de respuestas.</p>";
        return;
    }

    const filtradas = entradas.filter(e => entradaCoincideFiltros(e, filtros));

    if (filtradas.length === 0) {
        cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>Ninguna respuesta guardada coincide con estos filtros.</p>";
        return;
    }

    cont.innerHTML = filtradas.map(e => `
        <div class="tarjetaLectura" style="cursor:default; display:block;">
            <p class="tarjetaTitulo">${e.pregunta}</p>
            <p style="margin:8px 0; white-space:pre-wrap;">${e.respuesta}</p>
            <p class="tarjetaNivel">
                ${e.fecha && e.fecha.toDate ? e.fecha.toDate().toLocaleString("es") : "—"}
                · ${etiquetaFiltros(e.filtros)}
            </p>
        </div>
    `).join("");

}
