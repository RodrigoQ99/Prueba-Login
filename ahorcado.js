// ==========================================================
// AHORCADO
// ==========================================================
// Palabra al azar del banco GENERAL de palabras (bancoPalabras, ver
// admin.js) — el admin lo llena a mano, con IA (URL/documento) o
// importando un Excel (Etapa 28, sin IA). Desde la Etapa 29 este es el
// ÚNICO banco: se quitó el glosario personal que cada usuario podía
// subir con IA — los usuarios ya no pueden subir documentos ni usar IA,
// eso queda exclusivo del panel de administrador (ver la nota en
// functions/index.js sobre cargarGlosarioPersonalIA, desconectada).
//
// "Diccionario desbloqueado" (Etapa 31): usuarios/{uid}
// .palabrasDesbloqueadasAhorcado es un registro PERMANENTE (nunca se
// borra) de las palabras que el usuario ya ADIVINÓ CORRECTAMENTE — solo
// esas entran a su diccionario y se le dejan de mostrar al azar. Una
// palabra que PIERDE nunca se revela ni se guarda ahí (ver
// "Las palabras solo se muestran cuando se adivinan" — el usuario lo
// pidió explícitamente) — sigue disponible para volver a intentarla
// después. Cuando ya desbloqueó TODO el banco, simplemente deja de
// excluir nada (vuelve a poder salir cualquiera) SIN borrar su
// diccionario — a diferencia de antes, este campo ya no se reinicia
// nunca, porque también sirve para la pantalla "Ver diccionario".
// ==========================================================

// "Oportunidades" (Etapa 31): dentro de CADA oportunidad tiene derecho
// a fallar hasta 6 letras (el ahorcado clásico completo, sus 6 partes)
// — recién ahí se pierde ESA oportunidad. Con 3 oportunidades por
// palabra, se permiten hasta 3×6=18 letras falladas en total antes de
// perder de verdad. "erroresActuales" (0 a 6, dibuja la figura) es
// INDEPENDIENTE de "oportunidadesRestantes" (0 a 3): al completarse el
// ahorcado se resta una oportunidad y, si todavía queda alguna, la
// figura se limpia y sigue con la MISMA palabra — las letras ya
// acertadas se conservan, y las ya falladas se quedan marcadas (no
// tiene sentido dejar que las vuelva a intentar).
const OPORTUNIDADES_MAX_AHORCADO = 3;
const ERRORES_MAX_POR_OPORTUNIDAD = 6;

let palabraActual = null;
let letrasAcertadas = [];
let letrasFalladas = [];
let erroresActuales = 0;
let oportunidadesRestantes = OPORTUNIDADES_MAX_AHORCADO;

// "jugar" | "diccionario" — qué pantalla se muestra ahora mismo.
let vistaActualAhorcado = "jugar";

// Mapa explícito en vez de normalize("NFD") + quitar acentos: la Ñ se
// descompone bajo NFD en "N" + tilde combinada (mismo rango Unicode que
// los acentos de las vocales), así que quitarlos a ciegas convertiría
// "Ñ" en "N" — hay que tratarla como letra propia, no como acento.
const MAPA_ACENTOS_AHORCADO = { "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ú": "U", "Ü": "U" };

function normalizarLetraAhorcado(letra) {
    const mayuscula = (letra || "").toUpperCase();
    return MAPA_ACENTOS_AHORCADO[mayuscula] || mayuscula;
}


// ==========================
// ELEGIR PALABRA Y ARRANCAR RONDA
// ==========================

async function iniciarRondaAhorcado(user) {

    const cont = document.getElementById("juegoAhorcado");
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
        // Solo palabras globales o del mismo país del usuario (Etapa 30
        // — "bases de datos separadas" por país, ver filtrarPorPais en
        // lecturas.js).
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
        return;
    }

    const desbloqueadas = datosUsuario.palabrasDesbloqueadasAhorcado || [];

    // Si ya desbloqueó TODO el banco, simplemente ya no excluye nada —
    // el diccionario (ese mismo arreglo) NUNCA se borra, a diferencia de
    // antes (ver nota arriba).
    const candidatas = banco.filter(p => !desbloqueadas.includes(p.id));
    const paraElegir = candidatas.length > 0 ? candidatas : banco;

    palabraActual = paraElegir[Math.floor(Math.random() * paraElegir.length)];
    letrasAcertadas = [];
    letrasFalladas = [];
    erroresActuales = 0;
    oportunidadesRestantes = OPORTUNIDADES_MAX_AHORCADO;

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
// DIBUJAR EL ESTADO ACTUAL
// ==========================

function renderAhorcado() {

    const cont = document.getElementById("juegoAhorcado");
    const letrasPalabra = [...palabraActual.palabra.toUpperCase()];

    const letrasNecesarias = [...new Set(
        letrasPalabra.map(normalizarLetraAhorcado).filter(l => /[A-ZÑ]/.test(l))
    )];

    const gano = letrasNecesarias.every(l => letrasAcertadas.includes(l));
    const perdio = oportunidadesRestantes <= 0;
    const terminado = gano || perdio;

    // Si perdió, la palabra NUNCA se revela (ni aquí ni al final) — solo
    // se muestra completa cuando SÍ se adivinó.
    const palabraMostrada = letrasPalabra.map(caracter => {
        const normal = normalizarLetraAhorcado(caracter);
        if (!/[A-ZÑ]/.test(normal)) return caracter; // espacios, guiones, etc. siempre visibles
        return letrasAcertadas.includes(normal) ? caracter : "_";
    }).join(" ");

    // Se acaba de "quemar" una oportunidad (la figura se completó y
    // volvió a limpiar), pero todavía queda otra — se avisa con un
    // mensaje aparte del de "terminado" (que es solo para game over/gano
    // de verdad).
    const rondaRecienPerdida = !terminado && erroresActuales === 0 && letrasFalladas.length > 0
        && oportunidadesRestantes < OPORTUNIDADES_MAX_AHORCADO;

    const alfabeto = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

    const botonesLetras = alfabeto.split("").map(letra => {

        const acertada = letrasAcertadas.includes(letra);
        const fallada = letrasFalladas.includes(letra);
        const clase = acertada ? "botonExito" : fallada ? "botonPeligro" : "";

        return `
            <button type="button" class="botonAdminChico ${clase}" data-letra="${letra}"
                    ${acertada || fallada || terminado ? "disabled" : ""} style="min-width:38px;">
                ${letra}
            </button>
        `;

    }).join("");

    cont.innerHTML = `
        ${palabraActual.pista
            ? `<p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">💡 Pista: ${palabraActual.pista}</p>`
            : ""}

        ${renderFiguraAhorcado(erroresActuales)}

        ${rondaRecienPerdida
            ? `<p style="text-align:center; font-weight:600; color:#c0392b; margin-bottom:10px;">
                   💀 ¡Se completó el ahorcado! Pierdes esta oportunidad — te queda${oportunidadesRestantes === 1 ? "" : "n"} ${oportunidadesRestantes}. Sigue con la misma palabra.
               </p>`
            : ""}

        <p style="text-align:center; font-size:32px; letter-spacing:6px; font-weight:700; margin:15px 0;">
            ${palabraMostrada}
        </p>

        <p style="text-align:center; margin-bottom:2px;">Oportunidades: ${oportunidadesRestantes}/${OPORTUNIDADES_MAX_AHORCADO}</p>
        <p style="text-align:center; margin-bottom:10px; color:var(--texto-suave); font-size:14px;">Errores en esta oportunidad: ${erroresActuales}/${ERRORES_MAX_POR_OPORTUNIDAD}</p>

        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:20px;">
            ${botonesLetras}
        </div>

        ${terminado ? `
            <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:15px;">
                ${gano ? "🎉 ¡Adivinaste la palabra! Se agregó a tu diccionario 📖" : "😔 Ya no te quedan oportunidades."}
            </p>
            <button id="btnJugarOtraAhorcado" style="display:block; margin:0 auto;">🔄 Jugar otra</button>
        ` : ""}
    `;

    if (!terminado) {
        cont.querySelectorAll("[data-letra]").forEach(btn => {
            btn.addEventListener("click", () => manejarLetraAhorcado(btn.dataset.letra));
        });
    } else {
        document.getElementById("btnJugarOtraAhorcado").addEventListener("click", () => {
            iniciarRondaAhorcado(auth.currentUser);
        });
    }

}


// ==========================
// ADIVINAR UNA LETRA
// ==========================

function manejarLetraAhorcado(letra) {

    if (letrasAcertadas.includes(letra) || letrasFalladas.includes(letra)) return;

    const letrasPalabra = [...palabraActual.palabra.toUpperCase()].map(normalizarLetraAhorcado);

    if (letrasPalabra.includes(letra)) {
        letrasAcertadas.push(letra);
    } else {

        letrasFalladas.push(letra);
        erroresActuales++;

        // Se completó el ahorcado (6 fallos) DENTRO de esta oportunidad:
        // se pierde esa oportunidad. Si todavía queda alguna, la figura
        // se limpia y sigue con la MISMA palabra (las letras ya
        // acertadas/falladas no se pierden); si era la última, ahí sí
        // se acabó de verdad (perdio, más abajo).
        if (erroresActuales >= ERRORES_MAX_POR_OPORTUNIDAD) {
            oportunidadesRestantes--;
            if (oportunidadesRestantes > 0) {
                erroresActuales = 0;
            }
        }

    }

    const letrasNecesarias = [...new Set(letrasPalabra.filter(l => /[A-ZÑ]/.test(l)))];
    const gano = letrasNecesarias.every(l => letrasAcertadas.includes(l));
    const perdio = oportunidadesRestantes <= 0;

    if (gano || perdio) {
        guardarPalabraJugadaAhorcado(gano);
    }

    renderAhorcado();

}

async function guardarPalabraJugadaAhorcado(gano) {

    const user = auth.currentUser;
    if (!user) return;

    // Solo se "desbloquea" (y entra al diccionario) si la adivinó — si
    // perdió, la palabra sigue disponible para volver a intentarla,
    // nunca se le revela ni se guarda.
    if (gano) {
        try {
            await db.collection("usuarios").doc(user.uid).update({
                palabrasDesbloqueadasAhorcado: firebase.firestore.FieldValue.arrayUnion(palabraActual.id)
            });
        } catch (error) {
            console.error("No se pudo agregar la palabra a tu diccionario:", error);
        }
    }

    // Terminar una ronda (ganada o perdida) es actividad verificable —
    // mantiene viva la racha 🔥 igual que completar una lectura (ver
    // racha.js). Esto SÍ cuenta pase lo que pase, a diferencia de
    // "desbloquear" la palabra.
    if (typeof registrarActividadRacha === "function") registrarActividadRacha();

}


// ==========================
// "VER DICCIONARIO" — palabras ya desbloqueadas + su significado
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
    }

    actualizarBotones();

    btnJugar.addEventListener("click", () => {
        vistaActualAhorcado = "jugar";
        actualizarBotones();
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
        // Se trae TODO el banco (sin filtrar por país): una palabra ya
        // desbloqueada se queda en tu diccionario para siempre, aunque
        // el admin le cambie el país después.
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
