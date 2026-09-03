// ==========================================================
// AHORCADO
// ==========================================================
// Palabra al azar del banco GENERAL de palabras (bancoPalabras, ver
// admin.js). "Diccionario desbloqueado" (usuarios/{uid}
// .palabrasDesbloqueadasAhorcado): registro PERMANENTE de las palabras
// ya ADIVINADAS — solo esas entran al diccionario y dejan de salir al
// azar. Una palabra que se pierde nunca se revela ni se guarda.
//
// OPORTUNIDADES = TOKEN COMPARTIDO
// -------------------------------------------------------------------
//   - El jugador tiene un pozo de "oportunidades" (tokens), editable
//     por el admin en configuracion/ahorcado (campo "tokens").
//   - Cada token se gasta SOLO al completar el muñeco (6 errores) en
//     una palabra = fallarla. Ganar o cambiar de palabra sin
//     terminarla NO cuesta.
//   - Al fallar quedando tokens > 0, el jugador decide: "Reintentar
//     esta palabra" (misma palabra, se conservan las letras ya
//     acertadas/falladas, el muñeco vuelve a 0) o "Jugar otra palabra".
//   - Al llegar a 0 tokens: espera configuracion/ahorcado.esperaMinutos
//     (por defecto 60) antes de poder volver a jugar. Al pasar la
//     espera, los tokens se recargan al máximo de una vez.
//   - Durante la espera solo se puede "Ver diccionario". Un contador
//     regresivo mm:ss aparece junto al título "🔤 Ahorcado".
//
// El estado del pozo vive en usuarios/{uid}: ahorcadoTokens (número) y
// ahorcadoBloqueadoHasta (Timestamp, cuándo termina la espera).
// ==========================================================

const ERRORES_MAX_POR_OPORTUNIDAD = 6; // partes del muñeco = fallos por palabra

// Config editable por el admin (configuracion/ahorcado). Valores por
// defecto mientras carga o si nunca se guardó.
let CONFIG_AHORCADO = { tokens: 3, esperaMinutos: 60 };
let _promesaConfigAhorcado = null;

function cargarConfigAhorcado(forzar) {

    if (_promesaConfigAhorcado && !forzar) return _promesaConfigAhorcado;

    _promesaConfigAhorcado = db.collection("configuracion").doc("ahorcado").get()
        .then(doc => {
            if (doc.exists) {
                const d = doc.data();
                if (typeof d.tokens === "number" && d.tokens >= 1) CONFIG_AHORCADO.tokens = Math.floor(d.tokens);
                if (typeof d.esperaMinutos === "number" && d.esperaMinutos >= 1) CONFIG_AHORCADO.esperaMinutos = d.esperaMinutos;
            }
            return CONFIG_AHORCADO;
        })
        .catch(error => {
            console.error("No se pudo cargar la configuración de Ahorcado:", error);
            return CONFIG_AHORCADO;
        });

    return _promesaConfigAhorcado;
}


// ==========================
// ESTADO
// ==========================

let palabraActual = null;
let letrasAcertadas = [];
let letrasFalladas = [];
let letrasIntentadas = []; // orden de intento (aciertos y fallos), solo para mostrar
let erroresActuales = 0;    // 0..6, dibuja la figura

let tokensAhorcado = 0;             // pozo compartido de oportunidades
let esperaHastaAhorcado = null;     // millis: cuándo termina la espera
let esperandoDecisionAhorcado = false; // falló una palabra y quedan tokens: espera "Reintentar / Otra"
let rondaTerminada = false;         // ganó, o se agotaron los tokens
let _intervaloEsperaAhorcado = null;

// "jugar" | "diccionario"
let vistaActualAhorcado = "jugar";

// Mapa explícito (la Ñ NO es un acento: bajo NFD se descompone en N +
// tilde combinada, así que quitar acentos a ciegas la volvería N).
const MAPA_ACENTOS_AHORCADO = { "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ü": "U" };

function normalizarLetraAhorcado(letra) {
    const mayuscula = (letra || "").toUpperCase();
    return MAPA_ACENTOS_AHORCADO[mayuscula] || mayuscula;
}

// Firestore Timestamp | número | null -> millis | null
function leerMillisAhorcado(valor) {
    if (!valor) return null;
    if (typeof valor === "number") return valor;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.seconds === "number") return valor.seconds * 1000;
    return null;
}

function mmssRestante(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
}


// ==========================
// ELEGIR PALABRA Y ARRANCAR RONDA
// ==========================

async function iniciarRondaAhorcado(user) {

    if (_intervaloEsperaAhorcado) {
        clearInterval(_intervaloEsperaAhorcado);
        _intervaloEsperaAhorcado = null;
    }
    actualizarChipEsperaAhorcado(null);

    const cont = document.getElementById("juegoAhorcado");
    cont.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    await cargarConfigAhorcado();

    let datosUsuario = {};
    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        datosUsuario = usuarioDoc.exists ? usuarioDoc.data() : {};
    } catch (error) {
        console.error("No se pudo cargar tu perfil:", error);
    }

    // ---- Pozo de oportunidades / espera ----
    const bloqueadoHastaMs = leerMillisAhorcado(datosUsuario.ahorcadoBloqueadoHasta);
    const ahora = Date.now();

    if (bloqueadoHastaMs && bloqueadoHastaMs > ahora) {
        // Todavía en espera: solo diccionario.
        mostrarEsperaAhorcado(bloqueadoHastaMs);
        return;
    }

    if (bloqueadoHastaMs && bloqueadoHastaMs <= ahora) {
        // Pasó la espera: recarga TOTAL de tokens.
        tokensAhorcado = CONFIG_AHORCADO.tokens;
        try {
            await db.collection("usuarios").doc(user.uid).update({
                ahorcadoTokens: tokensAhorcado,
                ahorcadoBloqueadoHasta: firebase.firestore.FieldValue.delete()
            });
        } catch (error) {
            console.error("No se pudo recargar tus oportunidades de Ahorcado:", error);
        }
    } else {
        tokensAhorcado = (typeof datosUsuario.ahorcadoTokens === "number")
            ? datosUsuario.ahorcadoTokens
            : CONFIG_AHORCADO.tokens;
        // Si el admin bajó el máximo, no dejar más de lo permitido.
        if (tokensAhorcado > CONFIG_AHORCADO.tokens) tokensAhorcado = CONFIG_AHORCADO.tokens;

        if (tokensAhorcado <= 0) {
            // Sin tokens y sin bloqueo guardado (raro): arranca la espera ya.
            esperaHastaAhorcado = ahora + CONFIG_AHORCADO.esperaMinutos * 60000;
            await persistirEstadoAhorcado(true);
            mostrarEsperaAhorcado(esperaHastaAhorcado);
            return;
        }
    }

    // ---- Banco de palabras ----
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
        palabraActual = null;
        rondaTerminada = true;
        actualizarVisibilidadSelectorVista();
        return;
    }

    const desbloqueadas = datosUsuario.palabrasDesbloqueadasAhorcado || [];
    const candidatas = banco.filter(p => !desbloqueadas.includes(p.id));
    const paraElegir = candidatas.length > 0 ? candidatas : banco;

    palabraActual = paraElegir[Math.floor(Math.random() * paraElegir.length)];
    letrasAcertadas = [];
    letrasFalladas = [];
    letrasIntentadas = [];
    erroresActuales = 0;
    rondaTerminada = false;
    esperandoDecisionAhorcado = false;

    renderAhorcado();
}


// ==========================
// FIGURA DEL AHORCADO (SVG simple, se completa por partes)
// ==========================

function renderFiguraAhorcado(partesAMostrar) {

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
// AJUSTAR EL ANCHO DE LA PALABRA A LA PANTALLA (una sola fila)
// ==========================
// La palabra se pinta en un <span> que no envuelve (white-space:nowrap);
// aquí se le baja el tamaño de letra y el espaciado hasta que quepa en
// el ancho disponible, para que siempre se lea en un solo renglón.

function ajustarAnchoPalabraAhorcado() {

    const span = document.getElementById("palabraAhorcadoTexto");
    if (!span || !span.parentElement) return;

    const disponible = span.parentElement.clientWidth - 2;
    if (disponible <= 0) return; // el juego está oculto (vista "diccionario")

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
    if (document.getElementById("palabraAhorcadoTexto")) ajustarAnchoPalabraAhorcado();
});


// ==========================
// DIBUJAR EL ESTADO ACTUAL
// ==========================

function renderAhorcado() {

    const cont = document.getElementById("juegoAhorcado");

    if (!palabraActual) {
        actualizarVisibilidadSelectorVista();
        return;
    }

    const letrasPalabra = [...palabraActual.palabra.toUpperCase()];

    const letrasNecesarias = [...new Set(
        letrasPalabra.map(normalizarLetraAhorcado).filter(l => /[A-ZÑ]/.test(l))
    )];

    const gano = letrasNecesarias.every(l => letrasAcertadas.includes(l));
    const perdio = rondaTerminada && !gano; // se agotaron los tokens
    const terminado = gano || perdio;

    // Si perdió, la palabra NUNCA se revela.
    const palabraMostrada = letrasPalabra.map(caracter => {
        const normal = normalizarLetraAhorcado(caracter);
        if (!/[A-ZÑ]/.test(normal)) return caracter;
        return letrasAcertadas.includes(normal) ? caracter : "_";
    }).join(" ");

    const chipsLetras = letrasIntentadas.map(letra => {
        const acertada = letrasAcertadas.includes(letra);
        const clase = acertada ? "botonExito" : "botonPeligro";
        return `<span class="botonAdminChico ${clase}" style="min-width:38px; display:inline-block; text-align:center;">${letra}</span>`;
    }).join("");

    const jugando = !terminado && !esperandoDecisionAhorcado;

    cont.innerHTML = `
        ${palabraActual.pista
            ? `<p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">💡 Pista: ${palabraActual.pista}</p>`
            : ""}

        ${renderFiguraAhorcado(erroresActuales)}

        ${esperandoDecisionAhorcado ? `
            <p style="text-align:center; font-weight:600; color:#c0392b; margin:12px 0 10px;">
                💀 ¡Se completó el ahorcado! Perdiste 1 oportunidad — te queda${tokensAhorcado === 1 ? "" : "n"} ${tokensAhorcado}.
            </p>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin-bottom:15px;">
                <button id="btnReintentarAhorcado">🔄 Reintentar esta palabra</button>
                <button id="btnOtraPalabraAhorcado" style="background:white; color:var(--azul); border:2px solid var(--azul);">➡️ Jugar otra palabra</button>
            </div>
        ` : ""}

        <div style="text-align:center; margin:15px 0; overflow:hidden;">
            <span id="palabraAhorcadoTexto" style="white-space:nowrap; display:inline-block; font-weight:700; font-size:32px; letter-spacing:6px;">${palabraMostrada}</span>
        </div>

        <p style="text-align:center; margin-bottom:2px;">Oportunidades: ${tokensAhorcado}/${CONFIG_AHORCADO.tokens}</p>
        <p style="text-align:center; margin-bottom:10px; color:var(--texto-suave); font-size:14px;">Errores en esta palabra: ${erroresActuales}/${ERRORES_MAX_POR_OPORTUNIDAD}</p>

        ${jugando ? `
            <p style="text-align:center; color:var(--texto-suave); font-size:13px; margin-bottom:10px;">
                ⌨️ Escribe una letra en el recuadro de abajo para intentarla.
            </p>
        ` : ""}

        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:20px;">
            ${chipsLetras || `<span style="color:var(--texto-suave); font-size:13px;">Todavía no has intentado ninguna letra.</span>`}
        </div>

        ${gano ? `
            <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:15px;">
                🎉 ¡Adivinaste la palabra! Se agregó a tu diccionario 📖
            </p>
            <button id="btnJugarOtraAhorcado" style="display:block; margin:0 auto;">🔄 Jugar otra</button>
        ` : ""}
    `;

    if (gano) {
        document.getElementById("btnJugarOtraAhorcado").addEventListener("click", () => {
            iniciarRondaAhorcado(auth.currentUser);
        });
    }

    if (esperandoDecisionAhorcado) {
        document.getElementById("btnReintentarAhorcado").addEventListener("click", () => {
            esperandoDecisionAhorcado = false;
            erroresActuales = 0; // el muñeco vuelve a 0; las letras ya jugadas se conservan
            renderAhorcado();
        });
        document.getElementById("btnOtraPalabraAhorcado").addEventListener("click", () => {
            iniciarRondaAhorcado(auth.currentUser);
        });
    }

    // Recuadro de teclado (vive fuera de #juegoAhorcado): visible solo
    // mientras se está adivinando de verdad.
    const entrada = document.getElementById("entradaLetraAhorcado");
    if (entrada) {
        if (jugando && vistaActualAhorcado === "jugar") {
            entrada.style.display = "block";
            entrada.value = "";
            entrada.focus({ preventScroll: true });
        } else {
            entrada.blur();
            entrada.style.display = "none";
        }
    }

    actualizarVisibilidadSelectorVista();
    ajustarAnchoPalabraAhorcado();
}


// ==========================
// ADIVINAR UNA LETRA
// ==========================

function manejarLetraAhorcado(letra) {

    if (rondaTerminada || esperandoDecisionAhorcado || !palabraActual) return;
    if (letrasAcertadas.includes(letra) || letrasFalladas.includes(letra)) return;

    letrasIntentadas.push(letra);

    const letrasPalabra = [...palabraActual.palabra.toUpperCase()].map(normalizarLetraAhorcado);

    if (letrasPalabra.includes(letra)) {
        letrasAcertadas.push(letra);
    } else {
        letrasFalladas.push(letra);
        erroresActuales++;
    }

    const letrasNecesarias = [...new Set(letrasPalabra.filter(l => /[A-ZÑ]/.test(l)))];
    const gano = letrasNecesarias.every(l => letrasAcertadas.includes(l));

    if (gano) {
        rondaTerminada = true;
        guardarPalabraJugadaAhorcado(true);
        renderAhorcado();
        return;
    }

    // ¿Se completó el muñeco en esta palabra? -> se gasta un token.
    if (erroresActuales >= ERRORES_MAX_POR_OPORTUNIDAD) {

        tokensAhorcado = Math.max(0, tokensAhorcado - 1);

        if (tokensAhorcado <= 0) {
            esperaHastaAhorcado = Date.now() + CONFIG_AHORCADO.esperaMinutos * 60000;
            rondaTerminada = true;
            persistirEstadoAhorcado(true);
            guardarPalabraJugadaAhorcado(false);
            mostrarEsperaAhorcado(esperaHastaAhorcado);
            return;
        }

        esperandoDecisionAhorcado = true;
        persistirEstadoAhorcado(false);
    }

    renderAhorcado();
}

// Guarda el pozo de tokens (y, si es game over, hasta cuándo dura la
// espera) en usuarios/{uid}.
async function persistirEstadoAhorcado(gameOver) {

    const user = auth.currentUser;
    if (!user) return;

    const cambios = { ahorcadoTokens: tokensAhorcado };
    if (gameOver && esperaHastaAhorcado) {
        cambios.ahorcadoBloqueadoHasta = firebase.firestore.Timestamp.fromMillis(esperaHastaAhorcado);
    }

    try {
        await db.collection("usuarios").doc(user.uid).update(cambios);
    } catch (error) {
        console.error("No se pudo guardar tu estado de Ahorcado:", error);
    }
}


// ==========================
// PANTALLA DE ESPERA + CONTADOR REGRESIVO
// ==========================

function mostrarEsperaAhorcado(hastaMs) {

    esperaHastaAhorcado = hastaMs;
    rondaTerminada = true;
    palabraActual = null;
    esperandoDecisionAhorcado = false;

    const cont = document.getElementById("juegoAhorcado");
    cont.innerHTML = `
        <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:6px;">⏳ Se te acabaron las oportunidades de Ahorcado.</p>
        <p style="text-align:center; color:var(--texto-suave); margin-bottom:6px;">Podrás volver a jugar y a acumular palabras en:</p>
        <p id="contadorGrandeEspera" style="text-align:center; font-size:44px; font-weight:800; margin:6px 0; font-variant-numeric:tabular-nums;">--:--</p>
        <p style="text-align:center; color:var(--texto-suave); font-size:13px;">Mientras tanto puedes revisar tu 📖 diccionario.</p>
    `;

    const entrada = document.getElementById("entradaLetraAhorcado");
    if (entrada) { entrada.blur(); entrada.style.display = "none"; }

    actualizarVisibilidadSelectorVista();
    arrancarIntervaloEspera(hastaMs);
}

function arrancarIntervaloEspera(hastaMs) {

    if (_intervaloEsperaAhorcado) clearInterval(_intervaloEsperaAhorcado);

    const tick = () => {
        const restante = hastaMs - Date.now();

        if (restante <= 0) {
            clearInterval(_intervaloEsperaAhorcado);
            _intervaloEsperaAhorcado = null;
            actualizarChipEsperaAhorcado(null);
            if (auth.currentUser) iniciarRondaAhorcado(auth.currentUser);
            return;
        }

        const grande = document.getElementById("contadorGrandeEspera");
        if (grande) grande.textContent = mmssRestante(restante);
        actualizarChipEsperaAhorcado(hastaMs);
    };

    tick();
    _intervaloEsperaAhorcado = setInterval(tick, 1000);
}

// Etiqueta chica junto al título "🔤 Ahorcado" (como la racha, pero un
// mm:ss regresivo). hastaMs null -> se esconde.
function actualizarChipEsperaAhorcado(hastaMs) {

    const chip = document.getElementById("contadorEsperaAhorcado");
    if (!chip) return;

    if (!hastaMs) { chip.style.display = "none"; return; }

    const restante = hastaMs - Date.now();
    if (restante <= 0) { chip.style.display = "none"; return; }

    chip.textContent = "⏱️ " + mmssRestante(restante);
    chip.style.display = "inline-block";
}

// El selector "🎮 Jugar / 📖 Ver diccionario" NO se ve a media partida:
// solo al inicio, al terminar la ronda (ganó o se agotaron los tokens)
// y durante la espera.
function actualizarVisibilidadSelectorVista() {
    const sel = document.getElementById("selectorVistaAhorcado");
    if (!sel) return;
    const enPartida = !!palabraActual && !rondaTerminada;
    sel.style.display = enPartida ? "none" : "flex";
}


// ==========================
// TECLADO FÍSICO (computadora)
// ==========================

document.addEventListener("keydown", (e) => {

    if (vistaActualAhorcado !== "jugar") return;
    if (!palabraActual || rondaTerminada || esperandoDecisionAhorcado) return;

    const activo = document.activeElement;
    if (activo && (activo.tagName === "INPUT" || activo.tagName === "TEXTAREA")) return;

    const letra = normalizarLetraAhorcado(e.key);
    if (!/^[A-ZÑ]$/.test(letra)) return;

    manejarLetraAhorcado(letra);
});


// ==========================
// TECLADO DEL TELÉFONO — recuadro real que abre el teclado nativo
// ==========================

const _entradaLetraAhorcado = document.getElementById("entradaLetraAhorcado");
if (_entradaLetraAhorcado) {
    _entradaLetraAhorcado.addEventListener("input", () => {

        const letra = normalizarLetraAhorcado(_entradaLetraAhorcado.value.slice(-1));
        _entradaLetraAhorcado.value = "";

        if (vistaActualAhorcado !== "jugar" || !palabraActual || rondaTerminada || esperandoDecisionAhorcado) return;
        if (!/^[A-ZÑ]$/.test(letra)) return;

        manejarLetraAhorcado(letra);
    });
}


async function guardarPalabraJugadaAhorcado(gano) {

    const user = auth.currentUser;
    if (!user) return;

    if (gano) {
        try {
            await db.collection("usuarios").doc(user.uid).update({
                palabrasDesbloqueadasAhorcado: firebase.firestore.FieldValue.arrayUnion(palabraActual.id)
            });
        } catch (error) {
            console.error("No se pudo agregar la palabra a tu diccionario:", error);
        }
    }

    // Terminar una ronda (ganada o se agotaron los tokens) mantiene viva
    // la racha 🔥 igual que completar una lectura (ver racha.js).
    if (typeof registrarActividadRacha === "function") registrarActividadRacha();
}


// ==========================
// "VER DICCIONARIO"
// ==========================

function activarSelectorVistaAhorcado(user) {

    const btnJugar = document.getElementById("btnVistaJugar");
    const btnDiccionario = document.getElementById("btnVistaDiccionario");

    function actualizarBotones() {
        btnJugar.style.background = vistaActualAhorcado === "jugar" ? "var(--azul)" : "";
        btnJugar.style.color = vistaActualAhorcado === "jugar" ? "white" : "";
        btnDiccionario.style.background = vistaActualAhorcado === "diccionario" ? "var(--azul)" : "";
        btnDiccionario.style.color = vistaActualAhorcado === "diccionario" ? "white" : "";
        document.getElementById("juegoAhorcado").style.display = vistaActualAhorcado === "jugar" ? "block" : "none";
        document.getElementById("diccionarioAhorcado").style.display = vistaActualAhorcado === "diccionario" ? "block" : "none";

        const entrada = document.getElementById("entradaLetraAhorcado");
        if (entrada && vistaActualAhorcado !== "jugar") {
            entrada.blur();
            entrada.style.display = "none";
        } else if (entrada && palabraActual && !rondaTerminada && !esperandoDecisionAhorcado) {
            entrada.style.display = "block";
        }
    }

    actualizarBotones();

    btnJugar.addEventListener("click", () => {
        vistaActualAhorcado = "jugar";
        actualizarBotones();
        if (document.getElementById("palabraAhorcadoTexto")) ajustarAnchoPalabraAhorcado();
    });

    btnDiccionario.addEventListener("click", () => {
        vistaActualAhorcado = "diccionario";
        actualizarBotones();
        mostrarDiccionarioAhorcado(user);
    });
}

async function mostrarDiccionarioAhorcado(user) {

    const cont = document.getElementById("diccionarioAhorcado");
    cont.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    let desbloqueadas = [];
    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        desbloqueadas = (usuarioDoc.exists ? usuarioDoc.data().palabrasDesbloqueadasAhorcado : []) || [];
    } catch (error) {
        console.error("No se pudo cargar tu diccionario:", error);
        cont.innerHTML = "<p style='text-align:center;'>Ocurrió un error al cargar tu diccionario.</p>";
        return;
    }

    if (desbloqueadas.length === 0) {
        cont.innerHTML =
            "<p style='text-align:center;'>Todavía no has desbloqueado ninguna palabra — ¡adivina una en '🎮 Jugar' para que aparezca aquí! 📖</p>";
        return;
    }

    let palabras = [];
    try {
        const snapshot = await db.collection("bancoPalabras").get();
        const todas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        palabras = todas
            .filter(p => desbloqueadas.includes(p.id))
            .sort((a, b) => a.palabra.localeCompare(b.palabra, "es"));
    } catch (error) {
        console.error("No se pudo cargar el banco de palabras:", error);
        cont.innerHTML = "<p style='text-align:center;'>Ocurrió un error al cargar tu diccionario.</p>";
        return;
    }

    cont.innerHTML = `
        <p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">
            📖 ${palabras.length} palabra(s) desbloqueada(s)
        </p>
        ${palabras.map(p => `
            <div class="tarjetaLectura" style="cursor:default;">
                <div class="tarjetaInfo">
                    <p class="tarjetaTitulo">${p.palabra}</p>
                    <p class="tarjetaNivel">${p.pista || "Sin significado guardado"}</p>
                </div>
            </div>
        `).join("")}
    `;
}


// ==========================
// LOGIN
// ==========================

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("juegoAhorcado").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para jugar Ahorcado.</p>";
        return;
    }

    activarSelectorVistaAhorcado(user);
    iniciarRondaAhorcado(user);
});
