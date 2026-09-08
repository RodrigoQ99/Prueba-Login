// ==========================================================
// AJUSTES DEL LECTOR (Etapa 37)
// ==========================================================
// Controles para que cada quien acomode la lectura a su gusto: brillo
// del recuadro, tamaño de letra y tipografía. Los usan las tres
// pantallas donde se lee (lectura.html, lectura-mejorar.html y
// lectura-libre.html) — la barra se inyecta sola encima del recuadro
// de lectura, así ninguna de las tres necesita HTML propio.
//
// Se guardan en localStorage (por navegador, no en la cuenta): son una
// preferencia de comodidad visual, como el volumen, no un dato del
// usuario que tenga sentido sincronizar entre dispositivos. Si el
// navegador bloquea el almacenamiento, todo sigue funcionando con los
// valores por defecto.
//
// La TIPOGRAFÍA por defecto es Atkinson Hyperlegible, que ya carga el
// proyecto por su legibilidad (ver la nota al inicio de estilos.css).
// Las otras dos opciones son familias del sistema, sin descargas.
// ==========================================================

const CLAVE_AJUSTES_LECTOR = "ajustesLector";

const TIPOGRAFIAS_LECTOR = [
    { valor: "hyperlegible", etiqueta: "Legible", css: "'Atkinson Hyperlegible', 'Segoe UI', Arial, sans-serif" },
    { valor: "serif",        etiqueta: "Clásica", css: "Georgia, 'Times New Roman', serif" },
    { valor: "sans",         etiqueta: "Simple",  css: "'Segoe UI', system-ui, Arial, sans-serif" }
];

const AJUSTES_LECTOR_POR_DEFECTO = {
    brillo: 100,        // 70 a 115 (%)
    tamano: 20,         // 15 a 30 (px)
    tipografia: "hyperlegible"
};

function leerAjustesLector() {
    try {
        const guardado = JSON.parse(localStorage.getItem(CLAVE_AJUSTES_LECTOR) || "{}");
        return { ...AJUSTES_LECTOR_POR_DEFECTO, ...guardado };
    } catch (error) {
        return { ...AJUSTES_LECTOR_POR_DEFECTO };
    }
}

function guardarAjustesLector(ajustes) {
    try {
        localStorage.setItem(CLAVE_AJUSTES_LECTOR, JSON.stringify(ajustes));
    } catch (error) {
        // Navegador con almacenamiento bloqueado: los ajustes valen solo
        // para esta sesión, que es mejor que no dejarlos cambiar.
    }
}

function aplicarAjustesLector(caja, ajustes) {

    if (!caja) return;

    const tipografia = TIPOGRAFIAS_LECTOR.find(t => t.valor === ajustes.tipografia) || TIPOGRAFIAS_LECTOR[0];

    caja.style.filter = `brightness(${ajustes.brillo}%)`;
    caja.style.fontSize = `${ajustes.tamano}px`;
    caja.style.fontFamily = tipografia.css;

}

/**
 * Inyecta la barra de ajustes justo ANTES del recuadro de lectura y
 * deja aplicados los valores guardados.
 * @param {string} idCaja - id del recuadro que se está leyendo.
 */
function activarAjustesLector(idCaja) {

    const caja = document.getElementById(idCaja);
    if (!caja || document.getElementById("barraAjustesLector")) return;

    const ajustes = leerAjustesLector();
    aplicarAjustesLector(caja, ajustes);

    const barra = document.createElement("div");
    barra.id = "barraAjustesLector";
    barra.innerHTML = `
        <button type="button" id="btnAbrirAjustesLector" class="botonAjustesLector" aria-expanded="false">
            🔆 Ajustar lectura
        </button>

        <div id="panelAjustesLector" class="panelAjustesLector" hidden>

            <label class="filaAjusteLector">
                <span>Brillo</span>
                <input type="range" id="ajusteBrillo" min="70" max="115" step="5" value="${ajustes.brillo}">
            </label>

            <label class="filaAjusteLector">
                <span>Tamaño</span>
                <input type="range" id="ajusteTamano" min="15" max="30" step="1" value="${ajustes.tamano}">
            </label>

            <div class="filaAjusteLector">
                <span>Tipografía</span>
                <div class="opcionesTipografia">
                    ${TIPOGRAFIAS_LECTOR.map(t => `
                        <button type="button" class="botonTipografia ${ajustes.tipografia === t.valor ? "botonTipografiaElegida" : ""}"
                                data-tipografia="${t.valor}" style="font-family:${t.css};">${t.etiqueta}</button>
                    `).join("")}
                </div>
            </div>

        </div>
    `;

    caja.parentNode.insertBefore(barra, caja);

    const panel = barra.querySelector("#panelAjustesLector");
    const btnAbrir = barra.querySelector("#btnAbrirAjustesLector");

    btnAbrir.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        btnAbrir.setAttribute("aria-expanded", String(!panel.hidden));
    });

    function actualizar(cambios) {
        Object.assign(ajustes, cambios);
        aplicarAjustesLector(caja, ajustes);
        guardarAjustesLector(ajustes);
    }

    barra.querySelector("#ajusteBrillo").addEventListener("input", (e) => {
        actualizar({ brillo: Number(e.target.value) });
    });

    barra.querySelector("#ajusteTamano").addEventListener("input", (e) => {
        actualizar({ tamano: Number(e.target.value) });
    });

    barra.querySelectorAll("[data-tipografia]").forEach(boton => {
        boton.addEventListener("click", () => {
            actualizar({ tipografia: boton.dataset.tipografia });
            barra.querySelectorAll("[data-tipografia]").forEach(b => {
                b.classList.toggle("botonTipografiaElegida", b.dataset.tipografia === ajustes.tipografia);
            });
        });
    });

}
