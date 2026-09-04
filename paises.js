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

// ==========================================================
// IDIOMA PRINCIPAL POR PAÍS (Etapa 34)
// ==========================================================
// Solo para PRE-LLENAR "Lengua materna" al elegir país (ver
// activarAutocompletadoIdioma más abajo) — el campo sigue siendo texto
// libre, el usuario puede cambiarlo o borrarlo y escribir el suyo si no
// coincide (países multilingües, el criterio es una simplificación:
// "idioma más asociado internacionalmente con el país").
const IDIOMA_POR_PAIS = {
    "Afganistán": "pastún", "Albania": "albanés", "Alemania": "alemán", "Andorra": "catalán",
    "Angola": "portugués", "Antigua y Barbuda": "inglés", "Arabia Saudita": "árabe",
    "Argelia": "árabe", "Argentina": "español", "Armenia": "armenio", "Australia": "inglés",
    "Austria": "alemán", "Azerbaiyán": "azerí",
    "Bahamas": "inglés", "Bangladés": "bengalí", "Barbados": "inglés", "Baréin": "árabe",
    "Bélgica": "neerlandés", "Belice": "inglés", "Benín": "francés", "Bielorrusia": "bielorruso",
    "Birmania (Myanmar)": "birmano", "Bolivia": "español", "Bosnia y Herzegovina": "bosnio",
    "Botsuana": "inglés", "Brasil": "portugués", "Brunéi": "malayo", "Bulgaria": "búlgaro",
    "Burkina Faso": "francés", "Burundi": "kirundi", "Bután": "dzongkha",
    "Cabo Verde": "portugués", "Camboya": "jemer", "Camerún": "francés", "Canadá": "inglés",
    "Catar": "árabe", "Chad": "árabe", "Chile": "español", "China": "chino mandarín",
    "Chipre": "griego", "Ciudad del Vaticano": "italiano", "Colombia": "español",
    "Comoras": "francés", "Corea del Norte": "coreano", "Corea del Sur": "coreano",
    "Costa de Marfil": "francés", "Costa Rica": "español", "Croacia": "croata", "Cuba": "español",
    "Dinamarca": "danés", "Dominica": "inglés",
    "Ecuador": "español", "Egipto": "árabe", "El Salvador": "español",
    "Emiratos Árabes Unidos": "árabe", "Eritrea": "tigriña", "Eslovaquia": "eslovaco",
    "Eslovenia": "esloveno", "España": "español", "Estados Unidos": "inglés", "Estonia": "estonio",
    "Esuatini": "suazi", "Etiopía": "amhárico",
    "Filipinas": "filipino", "Finlandia": "finés", "Fiyi": "inglés", "Francia": "francés",
    "Gabón": "francés", "Gambia": "inglés", "Georgia": "georgiano", "Ghana": "inglés",
    "Granada": "inglés", "Grecia": "griego", "Guatemala": "español", "Guinea": "francés",
    "Guinea-Bisáu": "portugués", "Guinea Ecuatorial": "español", "Guyana": "inglés",
    "Haití": "criollo haitiano", "Honduras": "español", "Hungría": "húngaro",
    "India": "hindi", "Indonesia": "indonesio", "Irak": "árabe", "Irán": "persa",
    "Irlanda": "inglés", "Islandia": "islandés", "Islas Marshall": "marshalés",
    "Islas Salomón": "inglés", "Israel": "hebreo", "Italia": "italiano",
    "Jamaica": "inglés", "Japón": "japonés", "Jordania": "árabe",
    "Kazajistán": "kazajo", "Kenia": "inglés", "Kirguistán": "kirguís", "Kiribati": "inglés",
    "Kuwait": "árabe",
    "Laos": "lao", "Lesoto": "sesoto", "Letonia": "letón", "Líbano": "árabe",
    "Liberia": "inglés", "Libia": "árabe", "Liechtenstein": "alemán", "Lituania": "lituano",
    "Luxemburgo": "luxemburgués",
    "Macedonia del Norte": "macedonio", "Madagascar": "malgache", "Malasia": "malayo",
    "Malaui": "inglés", "Maldivas": "dhivehi", "Malí": "bambara", "Malta": "maltés",
    "Marruecos": "árabe", "Mauricio": "inglés", "Mauritania": "árabe", "México": "español",
    "Micronesia": "inglés", "Moldavia": "rumano", "Mónaco": "francés", "Mongolia": "mongol",
    "Montenegro": "montenegrino", "Mozambique": "portugués",
    "Namibia": "inglés", "Nauru": "nauruano", "Nepal": "nepalí", "Nicaragua": "español",
    "Níger": "francés", "Nigeria": "inglés", "Noruega": "noruego", "Nueva Zelanda": "inglés",
    "Omán": "árabe",
    "Países Bajos": "neerlandés", "Pakistán": "urdu", "Palaos": "inglés", "Palestina": "árabe",
    "Panamá": "español", "Papúa Nueva Guinea": "inglés", "Paraguay": "español", "Perú": "español",
    "Polonia": "polaco", "Portugal": "portugués",
    "Reino Unido": "inglés", "República Centroafricana": "francés", "República Checa": "checo",
    "República del Congo": "francés", "República Democrática del Congo": "francés",
    "República Dominicana": "español", "Ruanda": "kinyarwanda", "Rumania": "rumano",
    "Rusia": "ruso",
    "Samoa": "samoano", "San Cristóbal y Nieves": "inglés", "San Marino": "italiano",
    "San Vicente y las Granadinas": "inglés", "Santa Lucía": "inglés",
    "Santo Tomé y Príncipe": "portugués", "Senegal": "francés", "Serbia": "serbio",
    "Seychelles": "criollo seychelense", "Sierra Leona": "inglés", "Singapur": "inglés",
    "Siria": "árabe", "Somalia": "somalí", "Sri Lanka": "cingalés", "Sudáfrica": "inglés",
    "Sudán": "árabe", "Sudán del Sur": "inglés", "Suecia": "sueco", "Suiza": "alemán",
    "Surinam": "neerlandés",
    "Tailandia": "tailandés", "Tanzania": "suajili", "Tayikistán": "tayiko",
    "Timor Oriental (Timor-Leste)": "tetum", "Togo": "francés", "Tonga": "tongano",
    "Trinidad y Tobago": "inglés", "Túnez": "árabe", "Turkmenistán": "turcomano",
    "Turquía": "turco", "Tuvalu": "tuvaluano",
    "Ucrania": "ucraniano", "Uganda": "inglés", "Uruguay": "español", "Uzbekistán": "uzbeko",
    "Vanuatu": "bislama", "Venezuela": "español", "Vietnam": "vietnamita",
    "Yemen": "árabe", "Yibuti": "francés",
    "Zambia": "inglés", "Zimbabue": "inglés"
};

/**
 * Deja un texto de idioma con la primera letra en mayúscula y el resto
 * igual ("español" -> "Español", "chino mandarín" -> "Chino mandarín"),
 * sin espacios de sobra. Se usa al pre-llenar/guardar la lengua materna
 * y al mostrar el conteo de lenguas en Estadísticas, para que "español"
 * y "Español" no cuenten como dos idiomas distintos.
 */
function capitalizarLengua(texto) {
    const limpio = String(texto == null ? "" : texto).trim().replace(/\s+/g, " ");
    if (!limpio) return "";
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * Conecta un <select> de país con un <input> de lengua materna:
 *  - La lengua materna NO se muestra hasta que se elige un país (si se
 *    pasa "contenedorLengua", se oculta/enseña ese contenedor).
 *  - Al elegir país, PRE-LLENA el idioma asociado (IDIOMA_POR_PAIS) ya
 *    con la primera letra en mayúscula — el usuario lo puede cambiar o
 *    borrar libremente (por ejemplo si habla un dialecto), y en cuanto
 *    lo edita a mano deja de sobreescribirse en cambios de país
 *    posteriores. Si el país no tiene idioma mapeado, no toca el campo.
 * @param {HTMLSelectElement} selectPais
 * @param {HTMLInputElement} inputLengua
 * @param {HTMLElement} [contenedorLengua] - se muestra solo cuando hay país.
 */
function activarAutocompletadoIdioma(selectPais, inputLengua, contenedorLengua) {

    if (!selectPais || !inputLengua) return;

    let editadoAMano = false;
    inputLengua.addEventListener("input", () => { editadoAMano = true; });

    const sincronizar = () => {
        const tienePais = !!selectPais.value;
        if (contenedorLengua) contenedorLengua.style.display = tienePais ? "" : "none";
        if (tienePais && !editadoAMano) {
            const idioma = IDIOMA_POR_PAIS[selectPais.value];
            if (idioma) inputLengua.value = capitalizarLengua(idioma);
        }
    };

    selectPais.addEventListener("change", sincronizar);
    sincronizar(); // estado inicial (por si el país ya venía elegido)

}

function normalizarBusquedaPais(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

/**
 * Convierte el <select id="inputPais" / #campoPaisPerfil> del HTML en un
 * COMBOBOX "escribe para buscar": un <input> de texto que filtra
 * LISTA_PAISES en vivo mientras se escribe (sin pedir nada a internet).
 *
 * El <select> original NO se quita: queda oculto y sigue guardando el
 * valor elegido, así todo lo que ya lee `select.value` o escucha su
 * evento "change" (auth.js, perfil-informacion.js,
 * activarAutocompletadoIdioma) sigue funcionando igual — el combobox
 * dispara "change" en el <select> cada vez que se elige o se borra un
 * país.
 *
 * @param {HTMLSelectElement} select
 * @param {string} [paisActual] - precarga la selección si ya tenía uno.
 */
function renderizarSelectorPais(select, paisActual) {

    if (!select) return;

    // El <select> pasa a ser un depósito oculto del valor. Se le quita
    // "required" (un <select required> oculto y vacío bloquea el submit
    // nativo); la validación "elige tu país" ya se hace a mano.
    select.style.display = "none";
    select.removeAttribute("required");
    select.innerHTML = paisActual
        ? `<option value="${paisActual}" selected>${paisActual}</option>`
        : `<option value="" selected></option>`;
    select.value = paisActual || "";

    // Reusar el combobox si esta función se vuelve a llamar sobre el
    // mismo <select> (evita duplicarlo).
    let caja = select.previousElementSibling;
    if (!caja || !caja.classList || !caja.classList.contains("comboPais")) {
        caja = document.createElement("div");
        caja.className = "comboPais";
        select.parentNode.insertBefore(caja, select);
    }

    caja.innerHTML = `
        <input type="text" class="comboPaisInput" autocomplete="off" autocapitalize="off" spellcheck="false"
               placeholder="Escribe tu país…"
               value="${paisActual ? String(paisActual).replace(/"/g, "&quot;") : ""}">
        <div class="comboPaisLista" style="display:none;"></div>
    `;

    const input = caja.querySelector(".comboPaisInput");
    const lista = caja.querySelector(".comboPaisLista");

    function fijarValor(pais) {
        if (select.value === pais) return;
        select.innerHTML = `<option value="${pais}" selected>${String(pais).replace(/"/g, "&quot;")}</option>`;
        select.value = pais;
        select.dispatchEvent(new Event("change"));
    }

    function elegir(pais) {
        fijarValor(pais);
        input.value = pais;
        lista.style.display = "none";
    }

    function pintarLista() {
        const q = normalizarBusquedaPais(input.value);
        let resultados;
        if (!q) {
            resultados = LISTA_PAISES;
        } else {
            const empiezan = [];
            const contienen = [];
            for (const pais of LISTA_PAISES) {
                const n = normalizarBusquedaPais(pais);
                if (n.startsWith(q)) empiezan.push(pais);
                else if (n.includes(q)) contienen.push(pais);
            }
            resultados = empiezan.concat(contienen);
        }
        resultados = resultados.slice(0, 60);

        lista.innerHTML = resultados.length === 0
            ? `<p class="comboPaisVacio">Sin coincidencias</p>`
            : resultados.map(pais =>
                `<button type="button" class="comboPaisOpcion" data-pais="${String(pais).replace(/"/g, "&quot;")}">${pais}</button>`
              ).join("");
        lista.style.display = "block";
    }

    input.addEventListener("focus", pintarLista);

    input.addEventListener("input", () => {
        const exacto = LISTA_PAISES.find(p => normalizarBusquedaPais(p) === normalizarBusquedaPais(input.value));
        fijarValor(exacto || "");
        pintarLista();
    });

    // mousedown (no click) para ganarle la carrera al blur del input.
    lista.addEventListener("mousedown", (e) => {
        const opcion = e.target.closest(".comboPaisOpcion");
        if (opcion) {
            e.preventDefault();
            elegir(opcion.dataset.pais);
        }
    });

    input.addEventListener("blur", () => {
        setTimeout(() => { lista.style.display = "none"; }, 120);
        const exacto = LISTA_PAISES.find(p => normalizarBusquedaPais(p) === normalizarBusquedaPais(input.value));
        if (exacto) {
            input.value = exacto; // normaliza mayúsculas/acentos a la forma oficial
            fijarValor(exacto);
        } else {
            fijarValor("");
        }
    });

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
