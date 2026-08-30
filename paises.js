// ==========================================================
// LISTA FIJA DE PAÍSES (Etapa 30)
// ==========================================================
// 195 países (193 Estados miembros de la ONU + Palestina + Ciudad del
// Vaticano), en orden alfabético — la MISMA lista en todo el proyecto:
// registro (auth.js), "Editar perfil" (perfil-informacion.js) y el
// conteo de usuarios por país en Estadísticas (admin-estadisticas.js).
//
// Se pinta como un <select> nativo, NUNCA un campo de texto libre: así
// el país guardado SIEMPRE es uno de estos 195 exactos (nunca texto
// escrito a mano, con faltas o variantes como "Mexico"/"México") — y el
// navegador ya deja "buscar" escribiendo la primera letra (comportamiento
// nativo de <select>, no hace falta nada adicional para eso).
//
// Esta misma lista es la que más adelante separará el contenido por
// país (lecturas, ranking, banco de Ahorcado, etc. — ver la nota en
// admin-estadisticas.js) — por eso el valor guardado en
// usuarios/{uid}.pais debe ser SIEMPRE uno de estos textos, tal cual.
// ==========================================================

const LISTA_PAISES = [
    "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda",
    "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán",
    "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bielorrusia",
    "Birmania (Myanmar)", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi",
    "Bulgaria", "Burkina Faso", "Burundi", "Bután",
    "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre",
    "Ciudad del Vaticano", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur",
    "Costa de Marfil", "Costa Rica", "Croacia", "Cuba",
    "Dinamarca", "Dominica",
    "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia",
    "Eslovenia", "España", "Estados Unidos", "Estonia", "Esuatini", "Etiopía",
    "Filipinas", "Finlandia", "Fiyi", "Francia",
    "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guinea",
    "Guinea-Bisáu", "Guinea Ecuatorial", "Guyana",
    "Haití", "Honduras", "Hungría",
    "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall",
    "Islas Salomón", "Israel", "Italia",
    "Jamaica", "Japón", "Jordania",
    "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait",
    "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania",
    "Luxemburgo",
    "Macedonia del Norte", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta",
    "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco",
    "Mongolia", "Montenegro", "Mozambique",
    "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda",
    "Omán",
    "Países Bajos", "Pakistán", "Palaos", "Palestina", "Panamá", "Papúa Nueva Guinea",
    "Paraguay", "Perú", "Polonia", "Portugal",
    "Reino Unido", "República Centroafricana", "República Checa", "República del Congo",
    "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumania", "Rusia",
    "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas",
    "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona",
    "Singapur", "Siria", "Somalia", "Sri Lanka", "Sudáfrica", "Sudán", "Sudán del Sur",
    "Suecia", "Suiza", "Surinam",
    "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental (Timor-Leste)", "Togo", "Tonga",
    "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu",
    "Ucrania", "Uganda", "Uruguay", "Uzbekistán",
    "Vanuatu", "Venezuela", "Vietnam",
    "Yemen", "Yibuti",
    "Zambia", "Zimbabue"
];

/**
 * Pinta las 195 <option> dentro de un <select> ya existente en el HTML
 * (ver #inputPais en index.html / #campoPaisPerfil en
 * perfil-informacion.html) — con una primera opción deshabilitada de
 * "Selecciona tu país" cuando todavía no hay ninguno guardado.
 * @param {HTMLSelectElement} select
 * @param {string} [paisActual] - precarga la selección si ya tenía uno.
 */
function renderizarSelectorPais(select, paisActual) {

    select.innerHTML = `
        <option value="" disabled ${!paisActual ? "selected" : ""}>Selecciona tu país</option>
        ${LISTA_PAISES.map(pais => `
            <option value="${pais}" ${pais === paisActual ? "selected" : ""}>${pais}</option>
        `).join("")}
    `;

}

/**
 * Variante para el panel de administrador (Etapa 30): al crear/editar
 * contenido (lecturas, palabras de Ahorcado, etc.) el admin puede
 * dejarlo en "🌎 Todos los países" (valor "" — contenido GLOBAL,
 * visible para cualquier país) en vez de elegir uno de los 195. Es la
 * ÚNICA diferencia con renderizarSelectorPais(): esa opción SÍ es
 * seleccionable (no disabled) y queda marcada por defecto si el
 * contenido todavía no tiene país asignado.
 * @param {HTMLSelectElement} select
 * @param {string} [paisActual] - "" o ausente = global.
 */
function renderizarSelectorPaisConGlobal(select, paisActual) {

    select.innerHTML = `
        <option value="" ${!paisActual ? "selected" : ""}>🌎 Todos los países (global)</option>
        ${LISTA_PAISES.map(pais => `
            <option value="${pais}" ${pais === paisActual ? "selected" : ""}>${pais}</option>
        `).join("")}
    `;

}
