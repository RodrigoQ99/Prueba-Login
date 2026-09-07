// ==========================================================
// QR PERSONALIZADO (Etapa 35)
// ==========================================================
// A esta página apunta EL ÚNICO QR "personalizado" (ver
// abrirModalQrPersonalizado en admin.js) — a diferencia del QR de una
// lectura específica (qr.html/qr.js), este no viene con "?lectura=":
// aquí mismo se ELIGE cuál lectura darle a quien escaneó, en vez de que
// el admin la fije de antemano. Pensado para repartirse fuera de la app
// (un afiche, redes sociales) en lugar de una golosina puntual.
//
// Cómo elige:
//   1. Solo lecturas que este usuario TODAVÍA no tenga desbloqueadas
//      (nunca una repetida).
//   2. Solo entre las que TODAVÍA tengan alguna llave de 8 caracteres
//      disponible (misma escasez real que el resto del sistema — este
//      QR no crea acceso "gratis" e ilimitado, de verdad gasta una
//      llave, igual que canjearCodigoLecturaPorQR).
//   3. Si el usuario marcó géneros de interés en su perfil y alguna
//      candidata coincide, se elige entre esas; si no hay ninguna
//      coincidencia (o no marcó géneros), se elige al azar entre todas
//      las candidatas.
// Reusa canjearCodigoLecturaPorQR() y elegirDestinoTrasCanjear() (ver
// desbloqueo.js) tal cual — la única diferencia con el QR de una
// lectura fija es CUÁL lecturaId se le pasa a esas dos funciones.
// ==========================================================

/**
 * Elige una lectura para este usuario y la canjea de verdad (gastando
 * una llave). Si la elegida se quedó sin llaves justo en ese instante
 * (carrera con otro escaneo casi simultáneo), reintenta con otra
 * candidata antes de rendirse. Devuelve el ID de lectura a la que hay
 * que mandar al usuario (ya pasado por elegirDestinoTrasCanjear).
 */
async function elegirYCanjearLecturaPersonalizada(user) {

    let datosUsuario = {};
    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        datosUsuario = doc.exists ? doc.data() : {};
    } catch (error) {
        console.error("No se pudo cargar tu perfil:", error);
    }

    const generosUsuario = datosUsuario.generosLectura || [];
    const lecturasDesbloqueadas = datosUsuario.lecturasDesbloqueadas || [];

    await cargarCatalogoLecturas();
    const catalogoDelPais = filtrarPorPais(CATALOGO_LECTURAS, datosUsuario.pais || null);

    const sinDescubrir = catalogoDelPais.filter(l => !lecturasDesbloqueadas.includes(l.id));

    if (sinDescubrir.length === 0) {
        throw new Error("Ya desbloqueaste todas las lecturas disponibles — ¡no queda ninguna nueva por descubrir!");
    }

    // Solo candidatas que TODAVÍA tengan alguna llave de 8 caracteres
    // disponible (un solo "where", filtrado en memoria — mismo criterio
    // que canjearCodigoLecturaPorQR, sin necesitar un índice compuesto).
    let snapshotCodigos;
    try {
        snapshotCodigos = await db.collection("codigosLectura").where("usado", "==", false).get();
    } catch (error) {
        console.error("No se pudieron revisar las llaves disponibles:", error);
        throw new Error("No se pudo verificar la disponibilidad ahora mismo. Intenta de nuevo en un momento.");
    }

    const idsConLlaveDisponible = new Set(snapshotCodigos.docs.map(doc => doc.data().lecturaId));
    const candidatas = sinDescubrir.filter(l => idsConLlaveDisponible.has(l.id));

    if (candidatas.length === 0) {
        throw new Error("Ahora mismo no hay llaves disponibles para ninguna lectura nueva. Vuelve a intentarlo más tarde.");
    }

    const afinesAGeneros = generosUsuario.length > 0
        ? candidatas.filter(l => l.genero && generosUsuario.includes(l.genero))
        : [];

    const grupo = afinesAGeneros.length > 0 ? afinesAGeneros : candidatas;
    const orden = [...grupo].sort(() => Math.random() - 0.5);

    for (const candidata of orden) {

        try {
            await canjearCodigoLecturaPorQR(candidata.id);
        } catch (error) {
            // Se quedó sin llaves justo ahora (carrera con otro escaneo) —
            // prueba con la siguiente candidata en vez de rendirse.
            continue;
        }

        return await elegirDestinoTrasCanjear(candidata.id);

    }

    throw new Error("No se pudo desbloquear ninguna lectura nueva ahora mismo. Intenta de nuevo en un momento.");

}

function mostrarEstadoQrPersonalizado(mensaje, esError) {

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

    const user = auth.currentUser;
    if (!user) return;

    mostrarEstadoQrPersonalizado("📱 Eligiendo tu próxima lectura...");

    try {

        const destino = await elegirYCanjearLecturaPersonalizada(user);
        window.location.href = `lectura.html?id=${encodeURIComponent(destino)}`;

    } catch (error) {
        console.error("No se pudo elegir una lectura personalizada:", error);
        mostrarEstadoQrPersonalizado(`❌ ${error.message || "No se pudo desbloquear una lectura nueva."}`, true);
    }

}
