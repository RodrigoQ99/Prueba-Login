// ==========================================================
// GÉNEROS DE LECTURA (encuesta del registro / editar perfil)
// ==========================================================
// La lista de géneros disponibles vive en Firestore, en
// configuracion/generosLectura — la administra el admin desde su
// portal (ver abrirFormularioGenerosLectura en admin.js), mismo patrón
// que RANGO_EDADES en mejora-lecturas.js.
//
// renderizarCheckboxesGeneros() la usan tanto el formulario de registro
// (auth.js) como "Editar perfil" (perfil.js) para pintar la misma
// encuesta — checkboxes por cada género + un campo de texto libre
// "Otro" (varios géneros a la vez).
//
// renderizarSelectorGeneroUnico() es la variante de UN SOLO género —
// mismos géneros configurados + el mismo campo "Otro", pero con radios
// en vez de checkboxes. La usa protagonista.js para clasificar POR QUÉ
// género se puede sugerir esa lectura a otros usuarios (ver Etapa 15).
// ==========================================================

let GENEROS_LECTURA = [
    "Aventura", "Misterio", "Ciencia", "Biografías", "Terror",
    "Humor", "Fantasía", "Deportes", "Romance", "Historia"
];
let _promesaGenerosLectura = null;

function cargarGenerosLectura(forzarRecarga) {

    if (_promesaGenerosLectura && !forzarRecarga) {
        return _promesaGenerosLectura;
    }

    _promesaGenerosLectura = db.collection("configuracion").doc("generosLectura")
        .get()
        .then(doc => {
            if (doc.exists && Array.isArray(doc.data().lista) && doc.data().lista.length > 0) {
                GENEROS_LECTURA = doc.data().lista;
            }
            return GENEROS_LECTURA;
        })
        .catch(error => {
            console.error("No se pudo cargar la lista de géneros de lectura:", error);
            return GENEROS_LECTURA;
        });

    return _promesaGenerosLectura;

}

/**
 * Pinta un checkbox por cada género de GENEROS_LECTURA más un campo de
 * texto libre "Otro", dentro de "contenedor". "seleccionActual" es el
 * arreglo de géneros ya guardados (usuarios/{uid}.generosLectura) — los
 * que coincidan con la lista quedan marcados, y cualquier otro valor
 * (texto libre de una edición anterior) se precarga en el campo "Otro".
 */
function renderizarCheckboxesGeneros(contenedor, seleccionActual) {

    const seleccion = seleccionActual || [];
    const otroPrevio = seleccion.find(g => !GENEROS_LECTURA.includes(g)) || "";

    contenedor.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
            ${GENEROS_LECTURA.map(genero => `
                <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto;">
                    <input type="checkbox" name="generoLectura" value="${genero.replace(/"/g, "&quot;")}"
                           ${seleccion.includes(genero) ? "checked" : ""}>
                    ${genero}
                </label>
            `).join("")}
        </div>
        <label style="display:block; font-weight:600; margin-bottom:6px;">Otro (opcional)</label>
        <input type="text" id="campoGeneroOtro" placeholder="Escribe otro género que te guste"
               value="${otroPrevio.replace(/"/g, "&quot;")}"
               style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
    `;

}

/**
 * Lee lo marcado/escrito en un contenedor pintado por
 * renderizarCheckboxesGeneros() y devuelve el arreglo listo para
 * guardar en usuarios/{uid}.generosLectura.
 */
function leerGenerosSeleccionados(contenedor) {

    const marcados = [...contenedor.querySelectorAll('input[name="generoLectura"]:checked')]
        .map(input => input.value);

    const otro = (contenedor.querySelector("#campoGeneroOtro")?.value || "").trim();
    if (otro) marcados.push(otro);

    return marcados;

}

/**
 * Pinta UN radio por cada género de GENEROS_LECTURA más el mismo campo
 * de texto libre "Otro" — para clasificar una lectura con un solo
 * género (a diferencia de la encuesta de preferencias, que permite
 * varios). "generoActual" precarga la selección si ya tenía uno.
 */
function renderizarSelectorGeneroUnico(contenedor, generoActual) {

    const esOtro = generoActual && !GENEROS_LECTURA.includes(generoActual);

    contenedor.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
            ${GENEROS_LECTURA.map(genero => `
                <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto;">
                    <input type="radio" name="generoLecturaUnico" value="${genero.replace(/"/g, "&quot;")}"
                           ${generoActual === genero ? "checked" : ""}>
                    ${genero}
                </label>
            `).join("")}
            <label class="opcionTipo" style="display:inline-flex; align-items:center; gap:6px; width:auto;">
                <input type="radio" name="generoLecturaUnico" value="__otro__" ${esOtro ? "checked" : ""}>
                Otro
            </label>
        </div>
        <input type="text" id="campoGeneroUnicoOtro" placeholder="Escribe el género"
               value="${(esOtro ? generoActual : "").replace(/"/g, "&quot;")}"
               style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--borde);">
    `;

}

/**
 * Lee lo marcado/escrito en un contenedor pintado por
 * renderizarSelectorGeneroUnico() y devuelve un solo string (o "" si no
 * eligió nada).
 */
function leerGeneroUnicoSeleccionado(contenedor) {

    const marcado = contenedor.querySelector('input[name="generoLecturaUnico"]:checked');
    if (!marcado) return "";

    if (marcado.value === "__otro__") {
        return (contenedor.querySelector("#campoGeneroUnicoOtro")?.value || "").trim();
    }

    return marcado.value;

}
