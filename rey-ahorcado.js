// ==========================================================
// EL REY AHORCADO (Etapa 34) — variante de Ahorcado
// ==========================================================
// Mismo banco de palabras que Ahorcado (bancoPalabras) y mismo
// mecanismo de adivinar letra por letra, pero SIN el pozo de
// oportunidades ni el diccionario de palabras desbloqueadas de
// Ahorcado (ver ahorcado.js): acá se elige una palabra al azar y, al
// terminar (ganada o perdida), se puede pedir "Otra palabra" sin
// ningún límite. Esta función NO usa IA en ningún momento — todo el
// contenido (palabras, pistas, ejemplos) lo escribe el administrador
// a mano en el panel (ver abrirFormularioPalabra en admin.js).
//
// Recompensa al completar la palabra:
//   - CERO errores en todo el intento -> 👑 corona de oro.
//   - Uno o más errores -> 🎖️ símbolo más sencillo.
// Además, al completarla (con o sin corona) se muestra un ejemplo de
// uso elegido AL AZAR entre los que el admin haya cargado para esa
// palabra (bancoPalabras/{id}.ejemplos, hasta 10) — si no tiene
// ninguno guardado, esta parte simplemente no aparece.
//
// Si se completa la figura del ahorcado sin adivinar la palabra, esta
// NUNCA se revela (mismo criterio que Ahorcado) — solo se ofrece
// probar con otra palabra.
// ==========================================================

const ERRORES_MAX_REY_AHORCADO = 6;

let palabraActualRey = null;
let letrasAcertadasRey = [];
let letrasFalladasRey = [];
let letrasIntentadasRey = [];
let erroresActualesRey = 0;
let rondaTerminadaRey = false;

// Mapa explícito (la Ñ NO es un acento — ver mismo criterio en ahorcado.js).
const MAPA_ACENTOS_REY = { "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ü": "U" };

function normalizarLetraRey(letra) {
    const mayuscula = (letra || "").toUpperCase();
    return MAPA_ACENTOS_REY[mayuscula] || mayuscula;
}


// ==========================
// ELEGIR PALABRA Y ARRANCAR RONDA
// ==========================

async function iniciarRondaReyAhorcado(user) {

    const cont = document.getElementById("juegoReyAhorcado");
    cont.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    let datosUsuario = {};
    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        datosUsuario = usuarioDoc.exists ? usuarioDoc.data() : {};
    } catch (error) {
        console.error("No se pudo cargar tu perfil:", error);
    }

    let banco = [];
    try {
        const snapshot = await db.collection("bancoPalabras").get();
        banco = filtrarPorPais(
            snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            datosUsuario.pais || null
        );
    } catch (error) {
        console.error("No se pudo cargar el banco de palabras:", error);
        cont.innerHTML = "<p style='text-align:center;'>Ocurrió un error al cargar el banco de palabras.</p>";
        return;
    }

    if (banco.length === 0) {
        cont.innerHTML =
            "<p style='text-align:center;'>Todavía no hay palabras en el banco. Pídele al administrador que agregue algunas. 📖</p>";
        palabraActualRey = null;
        return;
    }

    palabraActualRey = banco[Math.floor(Math.random() * banco.length)];
    letrasAcertadasRey = [];
    letrasFalladasRey = [];
    letrasIntentadasRey = [];
    erroresActualesRey = 0;
    rondaTerminadaRey = false;

    renderReyAhorcado();

}


// ==========================
// FIGURA DEL AHORCADO (SVG simple, se completa por partes — igual que
// Ahorcado, ver renderFiguraAhorcado en ahorcado.js)
// ==========================

function renderFiguraReyAhorcado(partesAMostrar) {

    const base = `
        <line x1="20" y1="220" x2="120" y2="220" stroke="var(--texto)" stroke-width="4"/>
        <line x1="50" y1="220" x2="50" y2="20" stroke="var(--texto)" stroke-width="4"/>
        <line x1="50" y1="20" x2="150" y2="20" stroke="var(--texto)" stroke-width="4"/>
        <line x1="150" y1="20" x2="150" y2="50" stroke="var(--texto)" stroke-width="4"/>
    `;

    const partes = [
        `<circle cx="150" cy="70" r="20" stroke="var(--texto)" stroke-width="4" fill="none"/>`,
        `<line x1="150" y1="90" x2="150" y2="150" stroke="var(--texto)" stroke-width="4"/>`,
        `<line x1="150" y1="105" x2="120" y2="130" stroke="var(--texto)" stroke-width="4"/>`,
        `<line x1="150" y1="105" x2="180" y2="130" stroke="var(--texto)" stroke-width="4"/>`,
        `<line x1="150" y1="150" x2="125" y2="190" stroke="var(--texto)" stroke-width="4"/>`,
        `<line x1="150" y1="150" x2="175" y2="190" stroke="var(--texto)" stroke-width="4"/>`
    ];

    return `
        <svg viewBox="0 0 220 240" style="width:180px; height:auto; display:block; margin:0 auto;">
            ${base}
            ${partes.slice(0, partesAMostrar).join("")}
        </svg>
    `;
}


// ==========================
// AJUSTAR EL ANCHO DE LA PALABRA A LA PANTALLA (una sola fila) — mismo
// mecanismo que ajustarAnchoPalabraAhorcado en ahorcado.js.
// ==========================

function ajustarAnchoPalabraRey() {

    const span = document.getElementById("palabraReyAhorcadoTexto");
    if (!span || !span.parentElement) return;

    const disponible = span.parentElement.clientWidth - 2;
    if (disponible <= 0) return;

    let fontPx = 32;
    let lsPx = 6;

    span.style.fontSize = fontPx + "px";
    span.style.letterSpacing = lsPx + "px";

    let guarda = 0;
    while (span.scrollWidth > disponible && guarda < 60) {
        if (fontPx > 13) fontPx -= 1;
        if (lsPx > 1) lsPx -= 0.4;
        span.style.fontSize = fontPx + "px";
        span.style.letterSpacing = Math.max(1, lsPx) + "px";
        if (fontPx <= 13 && lsPx <= 1) break;
        guarda++;
    }
}

window.addEventListener("resize", () => {
    if (document.getElementById("palabraReyAhorcadoTexto")) ajustarAnchoPalabraRey();
});


// ==========================
// DIBUJAR EL ESTADO ACTUAL
// ==========================

function renderReyAhorcado() {

    const cont = document.getElementById("juegoReyAhorcado");
    if (!palabraActualRey) return;

    const letrasPalabra = [...palabraActualRey.palabra.toUpperCase()];

    const letrasNecesarias = [...new Set(
        letrasPalabra.map(normalizarLetraRey).filter(l => /[A-ZÑ]/.test(l))
    )];

    const gano = letrasNecesarias.every(l => letrasAcertadasRey.includes(l));
    const perdio = rondaTerminadaRey && !gano;
    const terminado = gano || perdio;
    const jugando = !terminado;

    // Si perdió, la palabra NUNCA se revela (mismo criterio que Ahorcado).
    const palabraMostrada = letrasPalabra.map(caracter => {
        const normal = normalizarLetraRey(caracter);
        if (!/[A-ZÑ]/.test(normal)) return caracter;
        return letrasAcertadasRey.includes(normal) ? caracter : "_";
    }).join(" ");

    const chipsLetras = letrasIntentadasRey.map(letra => {
        const acertada = letrasAcertadasRey.includes(letra);
        const clase = acertada ? "botonExito" : "botonPeligro";
        return `<span class="botonAdminChico ${clase}" style="min-width:38px; display:inline-block; text-align:center;">${letra}</span>`;
    }).join("");

    let recompensaHtml = "";
    if (gano) {

        const sinErrores = erroresActualesRey === 0;

        recompensaHtml = sinErrores
            ? `
                <p style="text-align:center; font-size:48px; margin:15px 0 5px;">👑</p>
                <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:10px;">
                    ¡Corona de oro! La adivinaste sin ningún error.
                </p>
            `
            : `
                <p style="text-align:center; font-size:40px; margin:15px 0 5px;">🎖️</p>
                <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:10px;">
                    ¡La adivinaste! Esta vez tuviste algún error en el camino.
                </p>
            `;

        // Ejemplo de uso al azar (si esta palabra tiene alguno guardado).
        const ejemplos = Array.isArray(palabraActualRey.ejemplos) ? palabraActualRey.ejemplos : [];
        if (ejemplos.length > 0) {
            const ejemplo = ejemplos[Math.floor(Math.random() * ejemplos.length)];
            recompensaHtml += `
                <p style="text-align:center; color:var(--texto-suave); font-style:italic; margin:10px 0 15px;">
                    💬 "${ejemplo}"
                </p>
            `;
        }

    }

    cont.innerHTML = `
        ${palabraActualRey.pista
            ? `<p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">💡 Pista: ${palabraActualRey.pista}</p>`
            : ""}

        ${renderFiguraReyAhorcado(erroresActualesRey)}

        <div style="text-align:center; margin:15px 0; overflow:hidden;">
            <span id="palabraReyAhorcadoTexto" style="white-space:nowrap; display:inline-block; font-weight:700; font-size:32px; letter-spacing:6px;">${palabraMostrada}</span>
        </div>

        <p style="text-align:center; margin-bottom:10px; color:var(--texto-suave); font-size:14px;">Errores: ${erroresActualesRey}/${ERRORES_MAX_REY_AHORCADO}</p>

        ${jugando ? `
            <p style="text-align:center; color:var(--texto-suave); font-size:13px; margin-bottom:10px;">
                ⌨️ Escribe una letra en el recuadro de abajo para intentarla.
            </p>
        ` : ""}

        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:20px;">
            ${chipsLetras || `<span style="color:var(--texto-suave); font-size:13px;">Todavía no has intentado ninguna letra.</span>`}
        </div>

        ${recompensaHtml}

        ${perdio ? `
            <p style="text-align:center; font-weight:600; color:#c0392b; margin-bottom:15px;">
                💀 ¡Se completó el ahorcado! Prueba con otra palabra.
            </p>
        ` : ""}

        ${terminado ? `<button id="btnOtraPalabraRey" style="display:block; margin:0 auto;">🔄 Jugar otra palabra</button>` : ""}
    `;

    if (terminado) {
        document.getElementById("btnOtraPalabraRey").addEventListener("click", () => {
            iniciarRondaReyAhorcado(auth.currentUser);
        });
    }

    // Recuadro de teclado (vive fuera de #juegoReyAhorcado): visible solo
    // mientras se está adivinando de verdad.
    const entrada = document.getElementById("entradaLetraRey");
    if (entrada) {
        if (jugando) {
            entrada.style.display = "block";
            entrada.value = "";
            entrada.focus({ preventScroll: true });
        } else {
            entrada.blur();
            entrada.style.display = "none";
        }
    }

    ajustarAnchoPalabraRey();

}


// ==========================
// ADIVINAR UNA LETRA
// ==========================

function manejarLetraReyAhorcado(letra) {

    if (rondaTerminadaRey || !palabraActualRey) return;
    if (letrasAcertadasRey.includes(letra) || letrasFalladasRey.includes(letra)) return;

    letrasIntentadasRey.push(letra);

    const letrasPalabra = [...palabraActualRey.palabra.toUpperCase()].map(normalizarLetraRey);

    if (letrasPalabra.includes(letra)) {
        letrasAcertadasRey.push(letra);
    } else {
        letrasFalladasRey.push(letra);
        erroresActualesRey++;
    }

    const letrasNecesarias = [...new Set(letrasPalabra.filter(l => /[A-ZÑ]/.test(l)))];
    const gano = letrasNecesarias.every(l => letrasAcertadasRey.includes(l));

    if (gano || erroresActualesRey >= ERRORES_MAX_REY_AHORCADO) {
        rondaTerminadaRey = true;
    }

    renderReyAhorcado();

}


// ==========================
// TECLADO FÍSICO (computadora)
// ==========================

document.addEventListener("keydown", (e) => {

    if (!palabraActualRey || rondaTerminadaRey) return;

    const activo = document.activeElement;
    if (activo && (activo.tagName === "INPUT" || activo.tagName === "TEXTAREA")) return;

    const letra = normalizarLetraRey(e.key);
    if (!/^[A-ZÑ]$/.test(letra)) return;

    manejarLetraReyAhorcado(letra);
});


// ==========================
// TECLADO DEL TELÉFONO — recuadro real que abre el teclado nativo
// ==========================

const _entradaLetraRey = document.getElementById("entradaLetraRey");
if (_entradaLetraRey) {
    _entradaLetraRey.addEventListener("input", () => {

        const letra = normalizarLetraRey(_entradaLetraRey.value.slice(-1));
        _entradaLetraRey.value = "";

        if (!palabraActualRey || rondaTerminadaRey) return;
        if (!/^[A-ZÑ]$/.test(letra)) return;

        manejarLetraReyAhorcado(letra);
    });
}


// ==========================
// LOGIN
// ==========================

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("juegoReyAhorcado").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para jugar.</p>";
        return;
    }

    iniciarRondaReyAhorcado(user);

});
