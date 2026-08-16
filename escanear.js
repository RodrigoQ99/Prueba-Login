// ==========================================================
// ESCANEAR CÓDIGO QR DESDE "MIS LECTURAS"
// ==========================================================
// Abre la cámara dentro de la misma página (sin salir a la app de
// cámara del celular) y, apenas detecta un código QR válido, navega
// directo a esa lectura. Usa la librería jsQR (cargada en index.html).
//
// Requiere HTTPS (o localhost) y que el usuario dé permiso de cámara.
// ==========================================================

let streamCamara = null;
let animacionEscaneo = null;

const btnEscanearQR = document.getElementById("btnEscanearQR");
if (btnEscanearQR) {
    btnEscanearQR.addEventListener("click", abrirEscanerQR);
}

function abrirEscanerQR() {

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Este navegador no permite usar la cámara aquí. Intenta con la app de cámara de tu celular.");
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modalOverlay";
    overlay.id = "overlayEscanerQR";
    overlay.innerHTML = `
        <div class="modalCaja modalCajaInfo" style="text-align:center;">
            <h2>Escanear código QR</h2>
            <video id="videoEscanerQR" playsinline autoplay muted
                   style="width:100%; border-radius:12px; background:#000;"></video>
            <p id="estadoEscanerQR" style="color:var(--texto-suave); margin-top:12px;">
                Apunta la cámara al código QR de tu golosina.
            </p>
            <button class="modalCerrar" style="background:white; border:1px solid var(--borde); color:var(--texto-suave);">
                Cancelar
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".modalCerrar").addEventListener("click", cerrarEscanerQR);

    const video = document.getElementById("videoEscanerQR");
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d");

    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {

            streamCamara = stream;
            video.srcObject = stream;
            video.play();

            function analizarCuadro() {

                if (video.readyState === video.HAVE_ENOUGH_DATA) {

                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const imagen = contexto.getImageData(0, 0, canvas.width, canvas.height);
                    const resultado = jsQR(imagen.data, imagen.width, imagen.height);

                    if (resultado && resultado.data) {
                        procesarCodigoDetectado(resultado.data);
                        return;
                    }

                }

                animacionEscaneo = requestAnimationFrame(analizarCuadro);

            }

            animacionEscaneo = requestAnimationFrame(analizarCuadro);

        })
        .catch(error => {
            console.error("No se pudo abrir la cámara:", error);
            document.getElementById("estadoEscanerQR").textContent =
                "No se pudo abrir la cámara. Revisa los permisos e intenta de nuevo.";
        });

}

function procesarCodigoDetectado(textoDetectado) {

    let idLectura = textoDetectado.trim();

    // Si el código guarda una URL completa (como las que ya tienes
    // impresas), extraemos el "?id=..." de ahí. Si no, usamos el
    // texto tal cual como ID.
    try {
        const url = new URL(textoDetectado);
        const idDeLaUrl = url.searchParams.get("id");
        if (idDeLaUrl) idLectura = idDeLaUrl;
    } catch (error) {
        // No era una URL válida: se usa el texto tal cual.
    }

    cerrarEscanerQR();
    window.location.href = `lectura.html?id=${encodeURIComponent(idLectura)}`;

}

function cerrarEscanerQR() {

    if (animacionEscaneo) {
        cancelAnimationFrame(animacionEscaneo);
        animacionEscaneo = null;
    }

    if (streamCamara) {
        streamCamara.getTracks().forEach(track => track.stop());
        streamCamara = null;
    }

    const overlay = document.getElementById("overlayEscanerQR");
    if (overlay) overlay.remove();

}
