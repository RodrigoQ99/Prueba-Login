// ==========================================================
// PÁGINA "CONFIGURAR EDADES" (dentro de Mejorar la lectura, panel de
// administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html: login
// propio, gate contra esAdmin() (ver admin-comun.js). Edita el ÚNICO
// documento configuracion/rangoEdades (ver cargarRangoEdades en
// mejora-lecturas.js) — el rango de edades disponible, los segundos
// del checkpoint, y la meta de palabras por minuto (ppm) de cada edad.
// Todo junto a propósito, en el mismo documento: son las mismas
// "edades disponibles" vistas desde ángulos distintos, no dos
// configuraciones separadas.
//
// Reemplaza al modal chico que antes abría "⚙️ Configuración" en
// admin-mejora.html (abrirFormularioRangoEdades, en admin.js) — ese
// modal nunca tuvo campos de ppm; esta pantalla completa sí.
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


// ==========================================================
// LOGIN Y VERIFICACIÓN DE PERMISO
// ==========================================================

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
    await inicializarPantallaEdades();

});


// ==========================================================
// META DE PPM POR EDAD — filas dinámicas (10..max + "Más de max años")
// ==========================================================
// "metaEnEdicion" es la copia de trabajo en memoria: se actualiza cada
// vez que el admin escribe algo o cambia el rango de edades, así nunca
// se pierde lo ya tecleado al agregar/quitar una edad del rango.
let metaEnEdicion = {};

function renderizarFilasMetaPpm(min, max) {

    const cont = document.getElementById("listaMetaPpm");

    const edades = [];
    for (let e = min; e <= max; e++) edades.push(e);
    edades.push("masDelTope");

    cont.innerHTML = edades.map(edad => {

        const esGrupo = edad === "masDelTope";
        const etiqueta = esGrupo ? `Más de ${max} años` : `${edad} años`;
        const rango = metaEnEdicion[edad] || [0, 0];

        return `
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="flex:1; font-weight:600; font-size:14px;">${etiqueta}</span>
                <input type="number" min="0" data-edad="${edad}" data-campo="min" value="${rango[0] || 0}"
                       title="Mínimo"
                       style="width:80px; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                <span style="color:var(--texto-suave);">a</span>
                <input type="number" min="0" data-edad="${edad}" data-campo="max" value="${rango[1] || 0}"
                       title="Máximo"
                       style="width:80px; padding:8px; border-radius:8px; border:1px solid var(--borde);">
                <span style="color:var(--texto-suave); font-size:13px;">ppm</span>
            </div>
        `;

    }).join("");

}

// Vuelca lo que esté escrito AHORA MISMO en las filas hacia
// metaEnEdicion, antes de redibujarlas (por eso se llama siempre antes
// de renderizarFilasMetaPpm cuando el rango cambia).
function leerFilasEnMetaEdicion() {

    document.querySelectorAll("#listaMetaPpm input[data-edad]").forEach(input => {

        const clave = input.dataset.edad === "masDelTope" ? "masDelTope" : Number(input.dataset.edad);
        if (!metaEnEdicion[clave]) metaEnEdicion[clave] = [0, 0];

        const posicion = input.dataset.campo === "min" ? 0 : 1;
        metaEnEdicion[clave][posicion] = Number(input.value) || 0;

    });

}

function regenerarFilas() {

    leerFilasEnMetaEdicion();

    const min = Number(document.getElementById("campoEdadMin").value) || RANGO_EDADES.min;
    const max = Number(document.getElementById("campoEdadMax").value) || RANGO_EDADES.max;

    renderizarFilasMetaPpm(min, max);

}


// ==========================================================
// ARRANQUE Y GUARDADO
// ==========================================================

async function inicializarPantallaEdades() {

    await cargarRangoEdades();

    document.getElementById("campoEdadMin").value = RANGO_EDADES.min;
    document.getElementById("campoEdadMax").value = RANGO_EDADES.max;
    document.getElementById("campoSegundosPresionar").value = RANGO_EDADES.segundosPresionar ?? 2;

    metaEnEdicion = JSON.parse(JSON.stringify(RANGO_EDADES.metaPpmPorEdad || {}));
    renderizarFilasMetaPpm(RANGO_EDADES.min, RANGO_EDADES.max);

    document.getElementById("campoEdadMin").addEventListener("input", regenerarFilas);
    document.getElementById("campoEdadMax").addEventListener("input", regenerarFilas);

    document.getElementById("btnGuardarEdades").addEventListener("click", guardarConfiguracionEdades);

}

async function guardarConfiguracionEdades() {

    const min = Number(document.getElementById("campoEdadMin").value);
    const max = Number(document.getElementById("campoEdadMax").value);
    const segundosPresionar = Number(document.getElementById("campoSegundosPresionar").value);

    if (!min || !max || min > max) {
        alert("Revisa los valores: la edad mínima debe ser menor o igual a la máxima.");
        return;
    }

    if (!segundosPresionar || segundosPresionar <= 0) {
        alert("Los segundos para marcar una palabra deben ser un número mayor a 0.");
        return;
    }

    leerFilasEnMetaEdicion();

    // Solo se guardan las edades que de verdad quedaron dentro del rango
    // final (+ el grupo "más de") — así no se acumulan claves viejas de
    // edades que ya no existen si el rango se redujo en algún momento.
    const metaPpmPorEdad = {};
    for (let e = min; e <= max; e++) {
        metaPpmPorEdad[e] = metaEnEdicion[e] || [0, 0];
    }
    metaPpmPorEdad.masDelTope = metaEnEdicion.masDelTope || [0, 0];

    const btn = document.getElementById("btnGuardarEdades");
    const estado = document.getElementById("estadoGuardarEdades");

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {

        await db.collection("configuracion").doc("rangoEdades").set({
            min, max, segundosPresionar, metaPpmPorEdad
        });

        await cargarRangoEdades(true);

        estado.textContent = "✅ Guardado — ya se refleja en toda la app.";
        estado.style.color = "#2e9e5b";
        estado.style.display = "block";

    } catch (error) {

        console.error("No se pudo guardar la configuración de edades:", error);
        estado.textContent = "❌ No se pudo guardar. Intenta de nuevo.";
        estado.style.color = "#c0392b";
        estado.style.display = "block";

    }

    btn.disabled = false;
    btn.textContent = "Guardar";

}
