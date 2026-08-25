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
// "Otro".
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
