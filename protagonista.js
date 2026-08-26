// ==========================================================
// "SER EL PROTAGONISTA DE LA HISTORIA"
// ==========================================================
// Desde su perfil, cualquier usuario puede proponer su propia lectura:
// escribe el texto, el sistema SUGIERE (no impone) una cantidad de
// preguntas según cuántas palabras escribió, y arma su banco de
// preguntas con el mismo editor que usa el panel de administrador
// (construirEditorPreguntas, ver editor-preguntas.js).
//
// El usuario NUNCA elige el ID de la lectura — eso lo asigna el admin
// al publicarla (ver admin-lecturas.js). Lo que se envía aquí va a una
// cola de revisión (propuestasLecturas), no directo al catálogo.
//
// También clasifica su historia con UN género (mismos géneros
// configurables de la encuesta de preferencias — ver generos.js,
// renderizarSelectorGeneroUnico). Ese género viaja con la propuesta y
// se conserva al publicarse, para poder sugerir la lectura después a
// otros usuarios con ese mismo interés (ver inicio.js, "Sugerencias").
// ==========================================================

const BANDAS_SUGERENCIA_PROTAGONISTA = [
    { min: 200, max: 400, preguntas: 5, etiqueta: "Fácil" },
    { min: 600, max: 900, preguntas: 8, etiqueta: "Intermedio" },
    { min: 1200, max: 1800, preguntas: 11, etiqueta: "Difícil" }
];

function contarPalabras(texto) {
    return (texto.trim().match(/\S+/g) || []).length;
}

/**
 * Devuelve la banda de sugerencia más cercana a "cantidadPalabras".
 * "exacta" indica si cayó DENTRO de alguna banda, o si es solo la más
 * parecida (para poder aclarárselo al usuario en la interfaz).
 */
function sugerirPreguntasProtagonista(cantidadPalabras) {

    for (const banda of BANDAS_SUGERENCIA_PROTAGONISTA) {
        if (cantidadPalabras >= banda.min && cantidadPalabras <= banda.max) {
            return { ...banda, exacta: true };
        }
    }

    let mejor = BANDAS_SUGERENCIA_PROTAGONISTA[0];
    let mejorDistancia = Infinity;

    BANDAS_SUGERENCIA_PROTAGONISTA.forEach(banda => {
        const distancia = cantidadPalabras < banda.min
            ? banda.min - cantidadPalabras
            : cantidadPalabras - banda.max;
        if (distancia < mejorDistancia) {
            mejorDistancia = distancia;
            mejor = banda;
        }
    });

    return { ...mejor, exacta: false };

}

let _preguntasProtagonista = [];
let _protagonistaInicializado = false;
let _nombreAutorProtagonista = "";

async function inicializarProtagonista() {

    const cont = document.getElementById("contenedorProtagonista");
    if (!cont) return;

    // Esta página vuelve a llamar a inicializarProtagonista() cada vez
    // que recarga (por ejemplo, si auth.js dispara el evento dos veces)
    // — no hace falta reconstruir el formulario si ya está armado, así
    // no se pierde lo que el usuario esté escribiendo a medio llenar.
    if (_protagonistaInicializado) return;
    _protagonistaInicializado = true;

    const user = auth.currentUser;

    // Nombre para "autorNombre" — se trae de su perfil (no de un campo
    // en pantalla: esta página vive sola, sin el formulario de
    // Información al lado, ver Etapa 20).
    if (user) {
        try {
            const doc = await db.collection("usuarios").doc(user.uid).get();
            _nombreAutorProtagonista = (doc.exists && doc.data().nombre) || user.displayName || "";
        } catch (error) {
            console.error("No se pudo cargar tu nombre para la propuesta:", error);
            _nombreAutorProtagonista = user.displayName || "";
        }
    }

    await cargarGenerosLectura();

    _preguntasProtagonista = [];

    cont.innerHTML = `
        <label style="display:block; font-weight:600; margin-bottom:6px;">Título</label>
        <input type="text" id="campoTituloProtagonista" placeholder="Título de tu historia">

        <label style="display:block; font-weight:600; margin:15px 0 6px;">Texto</label>
        <textarea id="campoTextoProtagonista" rows="10" placeholder="Escribe o pega tu historia aquí"
                  style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; font-family:inherit; font-size:15px;"
        ></textarea>

        <p id="sugerenciaProtagonista" style="font-size:13px; color:var(--texto-suave); margin:8px 0 15px;">
            0 palabras.
        </p>

        <label style="display:block; font-weight:600; margin:15px 0 6px;">Género de tu historia</label>
        <div id="contenedorGeneroProtagonista"></div>

        <h3 style="margin-top:15px;">Preguntas de tu historia</h3>
        <p style="font-size:13px; color:var(--texto-suave); margin-bottom:10px;">
            Escribe cada pregunta y sus opciones, y marca cuál es la correcta.
        </p>
        <div id="editorPreguntasProtagonista"></div>

        <button type="button" id="btnEnviarProtagonista" style="margin-top:15px; width:100%;">
            Enviar propuesta para revisión
        </button>

        <p id="mensajeProtagonista" style="text-align:center; margin-top:12px; font-weight:600;"></p>
    `;

    construirEditorPreguntas(cont.querySelector("#editorPreguntasProtagonista"), _preguntasProtagonista);
    renderizarSelectorGeneroUnico(cont.querySelector("#contenedorGeneroProtagonista"), "");

    const campoTexto = cont.querySelector("#campoTextoProtagonista");
    const sugerenciaEl = cont.querySelector("#sugerenciaProtagonista");

    function actualizarSugerencia() {

        const cantidad = contarPalabras(campoTexto.value);

        if (cantidad === 0) {
            sugerenciaEl.textContent = "0 palabras.";
            return;
        }

        const sugerencia = sugerirPreguntasProtagonista(cantidad);

        sugerenciaEl.textContent = sugerencia.exacta
            ? `${cantidad} palabras — nivel ${sugerencia.etiqueta.toLowerCase()}, sugerencia: ~${sugerencia.preguntas} preguntas (recomendación, no un límite estricto).`
            : `${cantidad} palabras — la sugerencia más cercana es nivel ${sugerencia.etiqueta.toLowerCase()}, ~${sugerencia.preguntas} preguntas (recomendación, no un límite estricto).`;

    }

    campoTexto.addEventListener("input", actualizarSugerencia);

    cont.querySelector("#btnEnviarProtagonista").addEventListener("click", async () => {

        const user = auth.currentUser;
        if (!user) return;

        const mensajeEl = cont.querySelector("#mensajeProtagonista");
        mensajeEl.textContent = "";

        const titulo = cont.querySelector("#campoTituloProtagonista").value.trim();
        const textoCrudo = campoTexto.value;
        const cantidadPalabras = contarPalabras(textoCrudo);

        if (!titulo) {
            alert("Escribe un título para tu historia.");
            return;
        }

        const texto = textoCrudo
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        if (texto.length === 0) {
            alert("Escribe el texto de tu historia.");
            return;
        }

        if (_preguntasProtagonista.length === 0) {
            alert("Agrega al menos una pregunta antes de enviar.");
            return;
        }

        const genero = leerGeneroUnicoSeleccionado(cont.querySelector("#contenedorGeneroProtagonista"));

        if (!genero) {
            alert("Elige (o escribe) el género de tu historia.");
            return;
        }

        const sugerencia = sugerirPreguntasProtagonista(cantidadPalabras);
        const btn = cont.querySelector("#btnEnviarProtagonista");
        btn.disabled = true;

        try {

            await db.collection("propuestasLecturas").add({
                autorUid: user.uid,
                autorNombre: _nombreAutorProtagonista.trim(),
                autorEmail: user.email || "",
                titulo: titulo,
                texto: texto,
                genero: genero,
                bancoPreguntas: _preguntasProtagonista,
                cantidadPalabras: cantidadPalabras,
                nivelSugerido: sugerencia.etiqueta,
                preguntasSugeridas: sugerencia.preguntas,
                fechaEnvio: firebase.firestore.FieldValue.serverTimestamp()
            });

            mensajeEl.textContent = "¡Enviado! El administrador la va a revisar antes de publicarla.";

            cont.querySelector("#campoTituloProtagonista").value = "";
            campoTexto.value = "";
            actualizarSugerencia();
            renderizarSelectorGeneroUnico(cont.querySelector("#contenedorGeneroProtagonista"), "");
            _preguntasProtagonista.length = 0;
            construirEditorPreguntas(cont.querySelector("#editorPreguntasProtagonista"), _preguntasProtagonista);

        } catch (error) {
            console.error("No se pudo enviar la propuesta:", error);
            mensajeEl.textContent = "No se pudo enviar. Intenta de nuevo.";
        }

        btn.disabled = false;

    });

}

// Cuando vive en su propia página (perfil-protagonista.html) se
// dispara solo; si algún día se vuelve a incrustar dentro de otra
// pantalla que ya llame a inicializarProtagonista() por su cuenta, el
// guard de _protagonistaInicializado evita armar el formulario dos veces.
auth.onAuthStateChanged((user) => {
    if (user) inicializarProtagonista();
});
