// ==========================================================
// PANTALLA "MEJORAR LA LECTURA"
// ==========================================================

async function cargarPantallaMejora() {

    const user = auth.currentUser;
    if (!user) return;

    // Trae el catálogo y el rango de edades desde Firestore (cacheados)
    await Promise.all([cargarCatalogoMejora(), cargarRangoEdades()]);

    const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
    const datos = usuarioDoc.exists ? usuarioDoc.data() : {};

    if (!datos.edadActual) {
        mostrarModalEdad(true);
        return;
    }

    renderizarListaMejora(datos.edadActual, datos.mejoraCompletadas || []);

}


// ==========================================================
// MODAL PARA ELEGIR / CAMBIAR EDAD
// ==========================================================

async function mostrarModalEdad(esPrimeraVez) {

    await cargarRangoEdades();

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";

    const opciones = [];
    for (let edad = RANGO_EDADES.min; edad <= RANGO_EDADES.max; edad++) {
        opciones.push(`<option value="${edad}">${edad} años</option>`);
    }

    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>${esPrimeraVez ? "¿Cuántos años tienes?" : "Cambiar edad"}</h2>
            <p>
                ${esPrimeraVez
                    ? "Así te mostramos lecturas del nivel adecuado para ti."
                    : "Puedes cambiar tu edad cuando quieras — no se borra tu progreso anterior."}
            </p>
            <select id="selectEdad" style="width:100%; padding:10px; margin:15px 0; border-radius:8px; border:1px solid #ccc;">
                <option value="" disabled selected>Selecciona tu edad</option>
                ${opciones.join("")}
            </select>
            <button id="btnConfirmarEdad">Confirmar</button>
            ${esPrimeraVez ? "" : "<button class='modalCerrar' style='background:white; color:var(--texto-suave); border:1px solid var(--borde); margin-top:10px;'>Cancelar</button>"}
        </div>
    `;

    document.body.appendChild(overlay);

    const btnCancelar = overlay.querySelector(".modalCerrar");
    if (btnCancelar) {
        btnCancelar.addEventListener("click", () => overlay.remove());
    }

    overlay.querySelector("#btnConfirmarEdad").addEventListener("click", async () => {

        const edadElegida = Number(overlay.querySelector("#selectEdad").value);
        if (!edadElegida) return;

        const user = auth.currentUser;
        if (!user) return;

        await db.collection("usuarios").doc(user.uid).update({
            edadActual: edadElegida
        });

        overlay.remove();
        cargarPantallaMejora();

    });

}


// ==========================================================
// LISTA DE LECTURAS DE LA EDAD ACTUAL
// ==========================================================

function renderizarListaMejora(edadActual, completadas) {

    const contenedor = document.getElementById("listaMejora");
    const encabezado = document.getElementById("encabezadoEdad");

    encabezado.textContent = `Edad actual: ${edadActual} años`;

    const listaDeEstaEdad = CATALOGO_MEJORA[edadActual] || [];

    if (typeof inicializarAdminMejora === "function") inicializarAdminMejora(edadActual);

    if (listaDeEstaEdad.length === 0) {
        contenedor.innerHTML = `
            <p style="text-align:center;">
                Todavía no hay lecturas de práctica para ${edadActual} años.
                ¡Vuelve pronto! 🌱
            </p>
        `;
        return;
    }

    const completadasEnEstaEdad = listaDeEstaEdad.filter(l => completadas.includes(l.id)).length;

    contenedor.innerHTML = listaDeEstaEdad.map((lectura, indice) => {

        const completada = completadas.includes(lectura.id);
        const desbloqueada = indice <= completadasEnEstaEdad;

        if (completada) {
            return `
                <a href="lectura-mejorar.html?id=${encodeURIComponent(lectura.id)}" class="tarjetaLectura tarjetaCompletada">
                    <div class="tarjetaInfo">
                        <p class="tarjetaTitulo">${lectura.titulo}</p>
                        <p class="tarjetaNivel">Lectura ${indice + 1} de ${listaDeEstaEdad.length}</p>
                    </div>
                    <span class="tarjetaEstado">✅ Completada</span>
                </a>
            `;
        }

        if (desbloqueada) {
            return `
                <a href="lectura-mejorar.html?id=${encodeURIComponent(lectura.id)}" class="tarjetaLectura">
                    <div class="tarjetaInfo">
                        <p class="tarjetaTitulo">${lectura.titulo}</p>
                        <p class="tarjetaNivel">Lectura ${indice + 1} de ${listaDeEstaEdad.length}</p>
                    </div>
                    <span class="tarjetaEstado">Comenzar →</span>
                </a>
            `;
        }

        return `
            <div class="tarjetaLectura tarjetaBloqueada">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${lectura.titulo}</p>
                    <p class="tarjetaNivel">Lectura ${indice + 1} de ${listaDeEstaEdad.length}</p>
                </div>
                <span class="tarjetaEstado">🔒 Bloqueada</span>
            </div>
        `;

    }).join("");

}


// ==========================================================
// BOTÓN "CAMBIAR EDAD"
// ==========================================================

document.getElementById("btnCambiarEdad").addEventListener("click", () => {
    mostrarModalEdad(false);
});


// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
function iniciarLectura() {
    cargarPantallaMejora();
}
