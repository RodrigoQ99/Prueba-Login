// ==========================================================
// ATERRIZAJE DEL CÓDIGO QR ÚNICO DE UNA LECTURA (Etapa 32)
// ==========================================================
// A esta página apunta el QR que genera el admin (uno solo por lectura,
// ver abrirModalCodigoQR en admin.js) — nunca reemplaza las llaves de 8
// caracteres, las complementa. Al llegar aquí (con el mismo login/
// registro de siempre, boilerplate compartido con lectura.html/
// mejora.html/etc.), toma automáticamente uno de los códigos de 8
// caracteres TODAVÍA DISPONIBLES de esa lectura y lo canjea (ver
// canjearCodigoLecturaPorQR en desbloqueo.js) — la persona no escribe
// nada. Reusa elegirDestinoTrasCanjear() (la misma lógica de "ya la
// tenías aprobada, te mandamos a otra" y de "El premio gordo") para que
// el QR se comporte exactamente igual que escribir un código a mano,
// solo que sin escribirlo.
// ==========================================================

const parametrosQR = new URLSearchParams(window.location.search);
const idLecturaQR = parametrosQR.get("lectura");

function mostrarEstadoQR(mensaje, esError) {

    const cont = document.getElementById("estadoQR");
    if (!cont) return;

    cont.innerHTML = `
        <p style="text-align:center; ${esError ? "color:#c0392b;" : ""}">${mensaje}</p>
        ${esError ? `
            <a href="index.html" class="menuLink" style="display:block; max-width:260px; margin:15px auto 0; text-align:center;">
                ← Volver a Inicio
            </a>
        ` : ""}
    `;

}

// auth.js llama a esta función (con este mismo nombre) apenas el
// usuario inició sesión o terminó de registrarse.
async function iniciarLectura() {

    if (!idLecturaQR) {
        mostrarEstadoQR("Este enlace no incluye ninguna lectura válida.", true);
        return;
    }

    mostrarEstadoQR("📱 Verificando el código QR...");

    try {

        await canjearCodigoLecturaPorQR(idLecturaQR);
        const destino = await elegirDestinoTrasCanjear(idLecturaQR);
        window.location.href = `lectura.html?id=${encodeURIComponent(destino)}`;

    } catch (error) {
        console.error("No se pudo canjear el código QR:", error);
        mostrarEstadoQR(`❌ ${error.message || "No se pudo desbloquear esta lectura."}`, true);
    }

}
