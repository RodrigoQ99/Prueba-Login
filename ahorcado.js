// ==========================================================
// AHORCADO
// ==========================================================
// Palabra al azar del banco (bancoPalabras, ver admin.js), adivinada
// letra por letra con 6 errores permitidos. Para no repetir la misma
// palabra seguido, cada usuario lleva su propio registro de palabras ya
// jugadas (usuarios/{uid}.palabrasJugadasAhorcado) — se evita elegir
// cualquiera de esas mientras queden alternativas, y en cuanto el banco
// se agota (todas ya jugadas) el registro se reinicia solo.
// ==========================================================

const ERRORES_MAX_AHORCADO = 6;

let palabraActual = null;
let letrasAcertadas = [];
let letrasFalladas = [];
let erroresRestantesAhorcado = ERRORES_MAX_AHORCADO;

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

    let banco = [];
    try {
        const snapshot = await db.collection("bancoPalabras").get();
        banco = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    let jugadas = [];
    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        jugadas = (usuarioDoc.exists && usuarioDoc.data().palabrasJugadasAhorcado) || [];
    } catch (error) {
        console.error("No se pudo revisar tus palabras jugadas:", error);
    }

    let candidatas = banco.filter(p => !jugadas.includes(p.id));
    const bancoAgotado = candidatas.length === 0;

    if (bancoAgotado) {

        candidatas = banco;

        try {
            await db.collection("usuarios").doc(user.uid).update({
                palabrasJugadasAhorcado: []
            });
        } catch (error) {
            console.error("No se pudo reiniciar el registro de palabras jugadas:", error);
        }

    }

    palabraActual = candidatas[Math.floor(Math.random() * candidatas.length)];
    letrasAcertadas = [];
    letrasFalladas = [];
    erroresRestantesAhorcado = ERRORES_MAX_AHORCADO;

    renderAhorcado();

}


// ==========================
// FIGURA DEL AHORCADO (SVG simple, se completa por partes)
// ==========================

function renderFiguraAhorcado(erroresCometidos) {

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
            ${partes.slice(0, erroresCometidos).join("")}
        </svg>
    `;

}


// ==========================
// DIBUJAR EL ESTADO ACTUAL
// ==========================

function renderAhorcado() {

    const cont = document.getElementById("juegoAhorcado");
    const letrasPalabra = [...palabraActual.palabra.toUpperCase()];

    const palabraMostrada = letrasPalabra.map(caracter => {
        const normal = normalizarLetraAhorcado(caracter);
        if (!/[A-ZÑ]/.test(normal)) return caracter; // espacios, guiones, etc. siempre visibles
        return letrasAcertadas.includes(normal) ? caracter : "_";
    }).join(" ");

    const erroresCometidos = ERRORES_MAX_AHORCADO - erroresRestantesAhorcado;

    const letrasNecesarias = [...new Set(
        letrasPalabra.map(normalizarLetraAhorcado).filter(l => /[A-ZÑ]/.test(l))
    )];

    const gano = letrasNecesarias.every(l => letrasAcertadas.includes(l));
    const perdio = erroresRestantesAhorcado <= 0;
    const terminado = gano || perdio;

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
        ${renderFiguraAhorcado(erroresCometidos)}

        <p style="text-align:center; font-size:32px; letter-spacing:6px; font-weight:700; margin:15px 0;">
            ${palabraMostrada}
        </p>

        ${palabraActual.pista
            ? `<p style="text-align:center; color:var(--texto-suave); margin-bottom:15px;">💡 ${palabraActual.pista}</p>`
            : ""}

        <p style="text-align:center; margin-bottom:10px;">Errores: ${erroresCometidos}/${ERRORES_MAX_AHORCADO}</p>

        <div style="display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-bottom:20px;">
            ${botonesLetras}
        </div>

        ${terminado ? `
            <p style="text-align:center; font-weight:700; font-size:18px; margin-bottom:15px;">
                ${gano ? "🎉 ¡Adivinaste la palabra!" : `😔 Ya no te quedan intentos. Era: ${palabraActual.palabra}`}
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
        erroresRestantesAhorcado--;
    }

    const letrasNecesarias = [...new Set(letrasPalabra.filter(l => /[A-ZÑ]/.test(l)))];
    const gano = letrasNecesarias.every(l => letrasAcertadas.includes(l));
    const perdio = erroresRestantesAhorcado <= 0;

    if (gano || perdio) {
        guardarPalabraJugadaAhorcado();
    }

    renderAhorcado();

}

async function guardarPalabraJugadaAhorcado() {

    const user = auth.currentUser;
    if (!user) return;

    try {
        await db.collection("usuarios").doc(user.uid).update({
            palabrasJugadasAhorcado: firebase.firestore.FieldValue.arrayUnion(palabraActual.id)
        });
    } catch (error) {
        console.error("No se pudo registrar la palabra jugada:", error);
    }

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

    iniciarRondaAhorcado(user);

});
