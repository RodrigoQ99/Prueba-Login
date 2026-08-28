// ==========================================================
// AHORCADO
// ==========================================================
// Palabra al azar del banco, adivinada letra por letra con 6 errores
// permitidos. Dos bancos posibles (ver "modoActual" más abajo, Etapa
// 24): el banco general (bancoPalabras, ver admin.js) o el glosario
// PERSONAL de cada usuario (usuarios/{uid}.glosarioPersonal, que él
// mismo sube con IA — ver ahorcado-ia.js — y que nunca se mezcla con
// el banco general ni es visible para otros usuarios).
//
// Para no repetir la misma palabra seguido, cada usuario lleva su
// propio registro de palabras ya jugadas — uno POR BANCO, para que
// jugar en un modo no afecte el progreso del otro:
// usuarios/{uid}.palabrasJugadasAhorcado (banco general) y
// .palabrasJugadasGlosarioPersonal (glosario personal). Se evita
// elegir cualquiera de esas mientras queden alternativas, y en cuanto
// el banco se agota (todas ya jugadas) el registro se reinicia solo.
// ==========================================================

const ERRORES_MAX_AHORCADO = 6;

let palabraActual = null;
let letrasAcertadas = [];
let letrasFalladas = [];
let erroresRestantesAhorcado = ERRORES_MAX_AHORCADO;

// "general" | "personal" — qué banco de palabras está jugando ahora.
let modoActual = "general";

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

    if (modoActual === "personal") {

        // El glosario personal vive completo dentro del documento del
        // usuario (arreglo, no colección aparte) — no necesita ID real
        // como bancoPalabras, así que se usa la palabra misma (igual
        // criterio que el banco general) para llevar el registro de
        // "ya jugadas" sin chocar entre sí.
        banco = (datosUsuario.glosarioPersonal || []).map(p => ({ id: (p.palabra || "").toLowerCase(), ...p }));

        if (banco.length === 0) {
            cont.innerHTML =
                "<p style='text-align:center;'>Todavía no tienes un glosario personal — súbelo arriba para jugar con tus propias palabras. 📘</p>";
            return;
        }

    } else {

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

    }

    // Un registro de "jugadas" POR BANCO (ver nota al inicio del
    // archivo) — así cambiar de modo nunca afecta el progreso del otro.
    const campoJugadas = modoActual === "personal" ? "palabrasJugadasGlosarioPersonal" : "palabrasJugadasAhorcado";
    const jugadas = datosUsuario[campoJugadas] || [];

    let candidatas = banco.filter(p => !jugadas.includes(p.id));
    const bancoAgotado = candidatas.length === 0;

    if (bancoAgotado) {

        candidatas = banco;

        try {
            await db.collection("usuarios").doc(user.uid).update({
                [campoJugadas]: []
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

    const campoJugadas = modoActual === "personal" ? "palabrasJugadasGlosarioPersonal" : "palabrasJugadasAhorcado";

    try {
        await db.collection("usuarios").doc(user.uid).update({
            [campoJugadas]: firebase.firestore.FieldValue.arrayUnion(palabraActual.id)
        });
    } catch (error) {
        console.error("No se pudo registrar la palabra jugada:", error);
    }

    // Terminar una ronda (ganada o perdida) es actividad verificable —
    // mantiene viva la racha 🔥 igual que completar una lectura (ver
    // racha.js).
    if (typeof registrarActividadRacha === "function") registrarActividadRacha();

}


// ==========================
// GLOSARIO PERSONAL (Etapa 24)
// ==========================
// subirGlosarioPersonalConIA vive en ahorcado-ia.js — si no está
// cargada (no debería pasar en esta página), todo este bloque
// simplemente no se activa y el juego sigue funcionando con el banco
// general de siempre, sin el selector de modo.

function actualizarBotonesModoAhorcado() {

    const btnGeneral = document.getElementById("btnModoGeneral");
    const btnPersonal = document.getElementById("btnModoPersonal");
    if (!btnGeneral || !btnPersonal) return;

    btnGeneral.style.background = modoActual === "general" ? "var(--azul)" : "";
    btnGeneral.style.color = modoActual === "general" ? "white" : "";
    btnPersonal.style.background = modoActual === "personal" ? "var(--azul)" : "";
    btnPersonal.style.color = modoActual === "personal" ? "white" : "";

}

function activarSelectorModoAhorcado(user) {

    const contenedorModo = document.getElementById("modoAhorcado");
    if (!contenedorModo || typeof subirGlosarioPersonalConIA !== "function") return;

    contenedorModo.style.display = "block";
    actualizarBotonesModoAhorcado();

    document.getElementById("btnModoGeneral").addEventListener("click", () => {
        modoActual = "general";
        actualizarBotonesModoAhorcado();
        iniciarRondaAhorcado(user);
    });

    document.getElementById("btnModoPersonal").addEventListener("click", () => {
        modoActual = "personal";
        actualizarBotonesModoAhorcado();
        iniciarRondaAhorcado(user);
    });

    const linkCambiar = document.getElementById("linkCambiarGlosario");
    const cajaGlosario = document.getElementById("cajaGlosarioPersonal");

    linkCambiar.addEventListener("click", (e) => {
        e.preventDefault();
        cajaGlosario.style.display = cajaGlosario.style.display === "block" ? "none" : "block";
    });

    activarSubidaGlosarioPersonal(user);

}

function activarSubidaGlosarioPersonal(user) {

    const campoArchivo = document.getElementById("campoSubirGlosario");
    const estado = document.getElementById("estadoSubirGlosario");
    const cajaRevision = document.getElementById("revisionGlosario");

    campoArchivo.addEventListener("change", async () => {

        const archivo = campoArchivo.files[0];
        if (!archivo) return;

        campoArchivo.disabled = true;
        estado.textContent = "📘 Leyendo tu documento y preparando las palabras... (puede tardar unos segundos)";
        estado.style.color = "var(--texto-suave)";
        estado.style.display = "block";
        cajaRevision.style.display = "none";
        cajaRevision.innerHTML = "";

        try {

            const palabras = await subirGlosarioPersonalConIA(archivo);

            if (!palabras || palabras.length === 0) {
                throw new Error("No se encontraron palabras en el documento.");
            }

            estado.textContent = `✅ Se encontraron ${palabras.length} palabra(s) — revísalas y ajústalas antes de guardar.`;
            estado.style.color = "#2e9e5b";

            mostrarRevisionGlosario(palabras, user);

        } catch (error) {

            console.error("No se pudo subir el glosario personal:", error);
            estado.textContent = "❌ No se pudo procesar el documento. " + (error && error.message ? error.message : "");
            estado.style.color = "#c0392b";

        }

        campoArchivo.disabled = false;
        campoArchivo.value = "";

    });

}

// Lista editable de las palabras que devolvió la IA — el usuario puede
// corregir el texto, quitar alguna que no quiera, y solo entonces
// guardar. Nunca se guarda automáticamente sin que las vea primero.
function mostrarRevisionGlosario(palabrasIniciales, user) {

    const cajaRevision = document.getElementById("revisionGlosario");
    const palabras = palabrasIniciales.map(p => ({ ...p }));

    function render() {

        cajaRevision.innerHTML = palabras.map((p, i) => `
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:6px;">
                <input type="text" data-campo="palabra" data-i="${i}" value="${(p.palabra || "").replace(/"/g, "&quot;")}"
                       placeholder="Palabra" style="flex:1; padding:6px; border-radius:6px; border:1px solid var(--borde);">
                <input type="text" data-campo="pista" data-i="${i}" value="${(p.pista || "").replace(/"/g, "&quot;")}"
                       placeholder="Pista" style="flex:2; padding:6px; border-radius:6px; border:1px solid var(--borde);">
                <button type="button" class="botonAdminChico botonPeligro" data-quitar="${i}">✕</button>
            </div>
        `).join("") + `<button type="button" id="btnGuardarGlosario" style="width:100%; margin-top:10px;">💾 Guardar glosario y jugar</button>`;

        cajaRevision.querySelectorAll("[data-campo]").forEach(input => {
            input.addEventListener("input", () => {
                palabras[Number(input.dataset.i)][input.dataset.campo] = input.value;
            });
        });

        cajaRevision.querySelectorAll("[data-quitar]").forEach(btn => {
            btn.addEventListener("click", () => {
                palabras.splice(Number(btn.dataset.quitar), 1);
                render();
            });
        });

        document.getElementById("btnGuardarGlosario").addEventListener("click", () => guardarGlosarioPersonal(palabras, user));

    }

    cajaRevision.style.display = "block";
    render();

}

async function guardarGlosarioPersonal(palabras, user) {

    const limpias = palabras
        .map(p => ({ palabra: (p.palabra || "").trim(), pista: (p.pista || "").trim() }))
        .filter(p => p.palabra.length > 0);

    if (limpias.length === 0) {
        alert("Agrega al menos una palabra antes de guardar.");
        return;
    }

    try {

        await db.collection("usuarios").doc(user.uid).update({
            glosarioPersonal: limpias,
            // Un glosario nuevo empieza su propio registro de "ya
            // jugadas" desde cero — las palabras anteriores ya no existen.
            palabrasJugadasGlosarioPersonal: []
        });

        document.getElementById("cajaGlosarioPersonal").style.display = "none";
        document.getElementById("revisionGlosario").style.display = "none";
        document.getElementById("estadoSubirGlosario").style.display = "none";

        modoActual = "personal";
        actualizarBotonesModoAhorcado();
        iniciarRondaAhorcado(user);

    } catch (error) {
        console.error("No se pudo guardar el glosario personal:", error);
        alert("No se pudo guardar el glosario. Intenta de nuevo.");
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

    activarSelectorModoAhorcado(user);
    iniciarRondaAhorcado(user);

});
