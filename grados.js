// ==========================================================
// LISTA FIJA DE GRADOS (Etapa 36)
// ==========================================================
// El grado de un estudiante ya NO se escribe a mano — se elige de esta
// lista fija, con el mismo patrón que el país (paises.js): un <select>
// nativo, nunca texto libre, para que "4to bachillerato" / "4to Bach" /
// "cuarto bachillerato" no cuenten como grados distintos al agrupar
// puntos por colegio+grado (ver puntos.js, actualizarRankingActual).
// ==========================================================

const LISTA_GRADOS = [
    "Primaria 1ro", "Primaria 2do", "Primaria 3ro", "Primaria 4to", "Primaria 5to", "Primaria 6to",
    "Básico 1ro", "Básico 2do", "Básico 3ro",
    "Bachillerato 4to", "Bachillerato 5to"
];

/**
 * Pinta las opciones de LISTA_GRADOS dentro de un <select> ya existente
 * en el HTML (ver #inputGrado en el registro / edición de perfil).
 * @param {HTMLSelectElement} select
 * @param {string} [gradoActual] - precarga la selección si ya tenía uno.
 */
function renderizarSelectorGrado(select, gradoActual) {

    select.innerHTML = `
        <option value="" disabled ${!gradoActual ? "selected" : ""}>Selecciona tu grado</option>
        ${LISTA_GRADOS.map(grado => `
            <option value="${grado}" ${grado === gradoActual ? "selected" : ""}>${grado}</option>
        `).join("")}
    `;

}
