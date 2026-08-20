// ==========================================================
// DESBLOQUEAR UNA LECTURA CON CÓDIGO (golosinas)
// ==========================================================
// Cada golosina trae un código único de 8 caracteres (letras mayúsculas,
// minúsculas y números — sensible a mayúsculas/minúsculas). El usuario
// lo escribe aquí para desbloquear la lectura de premio correspondiente.
//
// Cada código vive en la colección "codigosLectura", usando el código
// mismo como ID del documento, y solo se puede usar UNA vez en total
// (no por usuario, sino globalmente): en cuanto alguien lo canjea queda
// inutilizado para siempre (ver firestore.rules).
//
// Si el código canjeado resulta ser de una lectura que el usuario YA
// TIENE APROBADA, y todavía le queda catálogo por descubrir, no lo
// manda ahí (sería un callejón sin salida: "repaso bloqueado" sin nada
// nuevo que hacer) — en vez de eso lo lleva a una lectura al azar de
// las que no ha desbloqueado, para que ningún código se sienta
// "desperdiciado" en contenido repetido mientras haya algo nuevo por
// leer (ver elegirDestinoTrasCanjear).
// ==========================================================

const btnIngresarCodigo = document.getElementById("btnIngresarCodigo");
if (btnIngresarCodigo) {
    btnIngresarCodigo.addEventListener("click", abrirModalCodigo);
}

function abrirModalCodigo() {

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.id = "overlayCodigo";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>Ingresar código</h2>
            <p style="color:var(--texto-suave);">
                Escribe el código de 8 caracteres que viene en tu golosina.
            </p>
            <form id="formCodigo">
                <input type="text" id="campoCodigo" maxlength="8" autocomplete="off"
                       autocapitalize="off" autocorrect="off" spellcheck="false"
                       placeholder="Ej. aB3dE9kL"
                       style="width:100%; padding:12px; margin:15px 0 5px; border-radius:8px; border:1px solid var(--borde); text-align:center; font-size:20px; letter-spacing:2px; font-family:monospace;">
                <p id="errorCodigo" class="errorTexto" style="display:none;"></p>
                <button type="submit" id="btnEnviarCodigo" style="margin-top:10px;">Desbloquear lectura</button>
            </form>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave);">
                Cancelar
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", () => overlay.remove());
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) overlay.remove();
    });

    const campoCodigo = overlay.querySelector("#campoCodigo");
    campoCodigo.focus();

    overlay.querySelector("#formCodigo").addEventListener("submit", async (e) => {

        e.preventDefault();

        const errorEl = overlay.querySelector("#errorCodigo");
        const btn = overlay.querySelector("#btnEnviarCodigo");
        const codigo = campoCodigo.value.trim();

        errorEl.style.display = "none";

        if (!/^[A-Za-z0-9]{8}$/.test(codigo)) {
            errorEl.textContent = "El código debe tener exactamente 8 letras y/o números.";
            errorEl.style.display = "block";
            return;
        }

        btn.disabled = true;
        btn.textContent = "Verificando...";

        try {

            const lecturaId = await canjearCodigoLectura(codigo);
            const destino = await elegirDestinoTrasCanjear(lecturaId);
            window.location.href = `lectura.html?id=${encodeURIComponent(destino)}`;

        } catch (error) {

            errorEl.textContent = error.message || "No se pudo verificar el código.";
            errorEl.style.display = "block";
            btn.disabled = false;
            btn.textContent = "Desbloquear lectura";

        }

    });

}

/**
 * Intenta canjear un código de 8 caracteres. Si es válido y no ha sido
 * usado, lo marca como usado por el usuario actual (en una transacción,
 * para que dos personas no puedan canjear el mismo código al mismo
 * tiempo) y desbloquea la lectura correspondiente para esta cuenta.
 * Devuelve el ID de la lectura desbloqueada, o lanza un Error con un
 * mensaje listo para mostrarle al usuario si el código no existe o ya
 * fue usado.
 */
async function canjearCodigoLectura(codigo) {

    const user = auth.currentUser;
    if (!user) throw new Error("Debes iniciar sesión primero.");

    const ref = db.collection("codigosLectura").doc(codigo);

    const lecturaId = await db.runTransaction(async (transaccion) => {

        const doc = await transaccion.get(ref);

        if (!doc.exists) {
            throw new Error("Ese código no existe. Revisa que lo hayas escrito bien.");
        }

        const datos = doc.data();

        if (datos.usado) {
            throw new Error("Ese código ya fue usado.");
        }

        transaccion.update(ref, {
            usado: true,
            usadoPor: user.uid,
            usadoEn: firebase.firestore.FieldValue.serverTimestamp()
        });

        return datos.lecturaId;

    });

    await db.collection("usuarios").doc(user.uid).update({
        lecturasDesbloqueadas: firebase.firestore.FieldValue.arrayUnion(lecturaId)
    });

    return lecturaId;

}

/**
 * Si "lecturaId" (lo que acaba de desbloquear el código) ya está
 * APROBADA por este usuario, y todavía hay lecturas del catálogo sin
 * descubrir, elige una de esas al azar, la desbloquea de una vez (sin
 * gastar otro código) y la devuelve como destino en su lugar. Si no
 * aplica ninguna de las dos condiciones, devuelve la misma lecturaId
 * sin tocar nada más.
 *
 * Excepción para "El premio gordo" (ver premio-gordo-comun.js): mientras
 * el usuario no haya completado su meta de difíciles seguidas, un
 * código de una DIFÍCIL que ya tiene en 3/3 no la manda a cualquier
 * pendiente — la manda específicamente a otra difícil que todavía no
 * tenga perfeccionada, para no desperdiciar el código fuera del reto.
 * Si la difícil NO está en 3/3 (nueva o fallida), se deja pasar tal
 * cual: motor.js es quien le da el reintento libre.
 */
async function elegirDestinoTrasCanjear(lecturaId) {

    const user = auth.currentUser;
    if (!user) return lecturaId;

    let yaAprobada = false;

    try {

        const intentosPrevios = await db.collection("progreso")
            .where("usuarioId", "==", user.uid)
            .where("lecturaId", "==", lecturaId)
            .get();

        yaAprobada = intentosPrevios.docs.some(doc => doc.data().puntosGanados > 0);

    } catch (error) {
        console.error("No se pudo revisar si esa lectura ya estaba aprobada:", error);
        return lecturaId;
    }

    await cargarCatalogoLecturas();
    const lecturaCanjeada = obtenerLecturaPorId(lecturaId);

    if (lecturaCanjeada && lecturaCanjeada.nivel === "dificil"
        && typeof obtenerProgresoPremioGordo === "function") {

        try {

            const progresoGordo = await obtenerProgresoPremioGordo(user.uid);

            if (!progresoGordo.completo) {

                if (!yaAprobada) {
                    // Nueva o fallida: se deja pasar, motor.js le da el
                    // reintento libre — no aplica la lógica general de
                    // "ya aprobada" de aquí abajo.
                    return lecturaId;
                }

                const dificilesPendientes = CATALOGO_LECTURAS.filter(l =>
                    l.nivel === "dificil" && !progresoGordo.lecturasAprobadas.includes(l.id)
                );

                if (dificilesPendientes.length > 0) {

                    const sugerida = dificilesPendientes[
                        Math.floor(Math.random() * dificilesPendientes.length)
                    ];

                    try {
                        await db.collection("usuarios").doc(user.uid).update({
                            lecturasDesbloqueadas: firebase.firestore.FieldValue.arrayUnion(sugerida.id)
                        });
                        alert("Esa lectura difícil ya la tenías con 3 estrellas. Te llevamos a otra difícil para seguir con El premio gordo.");
                        return sugerida.id;
                    } catch (error) {
                        console.error("No se pudo desbloquear la siguiente difícil:", error);
                        return lecturaId;
                    }

                }
                // Si no quedan difíciles pendientes de perfeccionar, cae
                // a la lógica general de abajo como red de seguridad.

            }

        } catch (error) {
            console.error("No se pudo revisar tu progreso de El premio gordo:", error);
        }

    }

    if (!yaAprobada) return lecturaId;

    let desbloqueadas = [];

    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        desbloqueadas = (usuarioDoc.exists && usuarioDoc.data().lecturasDesbloqueadas) || [];
    } catch (error) {
        console.error("No se pudo revisar tus lecturas desbloqueadas:", error);
        return lecturaId;
    }

    const pendientes = CATALOGO_LECTURAS.filter(l => !desbloqueadas.includes(l.id));
    if (pendientes.length === 0) return lecturaId;

    const sugerida = pendientes[Math.floor(Math.random() * pendientes.length)];

    try {
        await db.collection("usuarios").doc(user.uid).update({
            lecturasDesbloqueadas: firebase.firestore.FieldValue.arrayUnion(sugerida.id)
        });
    } catch (error) {
        console.error("No se pudo desbloquear la lectura nueva:", error);
        return lecturaId;
    }

    alert("Esa lectura ya la tenías aprobada. Como todavía hay lecturas nuevas por descubrir, te llevamos a una de ellas.");

    return sugerida.id;

}
