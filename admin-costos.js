// ==========================================================
// PÁGINA "COSTOS DE IA" (dentro del panel de administrador) — Etapa 37
// ==========================================================
// Mismo patrón de acceso independiente que admin-estadisticas.html:
// login propio, gate contra esAdmin(). SOLO LECTURA — lee la colección
// "usoIA" que cada Cloud Function de IA va llenando sola (ver
// registrarUsoIA.js) y muestra el total gastado, el desglose por tipo
// de tarea, y las llamadas más recientes. Esta pantalla NO es una
// función de IA — es un panel de monitoreo del uso que ya se hizo.
//
// No hay forma de traer el saldo REAL de la cuenta de Anthropic desde
// aquí: la API de Anthropic no expone el saldo/crédito restante de una
// organización (eso es una vista de facturación, solo en la Consola de
// Anthropic) — el "Admin API" de Anthropic sí puede dar REPORTES de uso
// agregados, pero es una API separada en beta que necesita su propia
// credencial de administrador (una API key "sk-ant-admin...", distinta
// de la que ya usan las Cloud Functions) y solo repetiría, con más
// pasos, lo mismo que este panel ya calcula con sus propios registros.
// Por eso (y como el admin mismo dejó como salida válida): se muestra
// el total registrado por la app, para comparar a mano contra la
// Consola de Anthropic.
// ==========================================================

const pantallaLoginAdmin = document.getElementById("pantallaLoginAdmin");
const pantallaSinPermiso = document.getElementById("pantallaSinPermiso");
const contenedorAdminPanel = document.getElementById("contenedorAdminPanel");

document.getElementById("btnLoginGoogleAdmin").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión. Intenta de nuevo.");
    });
});

document.getElementById("btnCerrarSesionAdminSinPermiso").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged(async (user) => {

    pantallaLoginAdmin.style.display = "none";
    pantallaSinPermiso.style.display = "none";
    contenedorAdminPanel.style.display = "none";

    if (!user) {
        pantallaLoginAdmin.style.display = "flex";
        return;
    }

    await cargarAdministradores();

    if (!esAdmin()) {
        pantallaSinPermiso.style.display = "flex";
        return;
    }

    contenedorAdminPanel.style.display = "block";
    cargarCostosIA();

});


const ETIQUETA_TIPO_IA = {
    generar_preguntas: "Generar preguntas",
    analizar_sugerencia: "Analizar propuesta",
    inventar_historia: "Inventar historia por género",
    analisis_datos: "Análisis de datos de usuarios"
};

function formatoUsd(valor) {
    // Hasta 4 decimales — el costo de UNA llamada suele ser una
    // fracción de centavo, mostrarlo con solo 2 decimales lo
    // redondearía casi siempre a "$0.00".
    return `$${valor.toFixed(4)}`;
}

function formatoFechaCorta(fecha) {
    return (fecha && fecha.toDate) ? fecha.toDate().toLocaleString("es") : "—";
}

async function cargarCostosIA() {

    const tablaPorTipo = document.getElementById("tablaCostoPorTipo");
    const tablaRecientes = document.getElementById("tablaLlamadasRecientes");

    let registros = [];

    try {
        // Todo el historial — se necesita completo para el total y el
        // desglose por tipo (no solo las recientes).
        const snapshot = await db.collection("usoIA").orderBy("fecha", "desc").get();
        registros = snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error("No se pudo cargar el registro de uso de IA:", error);
        document.getElementById("resumenCostos").innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>No se pudo cargar el registro de uso de IA.</p>";
        return;
    }

    // ---- Resumen general ----
    const totalUsd = registros.reduce((suma, r) => suma + (r.costoUsd || 0), 0);
    const totalLlamadas = registros.length;
    const totalInput = registros.reduce((suma, r) => suma + (r.inputTokens || 0), 0);
    const totalOutput = registros.reduce((suma, r) => suma + (r.outputTokens || 0), 0);

    document.getElementById("resumenCostos").innerHTML = `
        <div class="tarjetaResumen"><strong>${formatoUsd(totalUsd)}</strong><span>Gasto total registrado</span></div>
        <div class="tarjetaResumen"><strong>${totalLlamadas}</strong><span>Llamadas a Claude</span></div>
        <div class="tarjetaResumen"><strong>${totalInput.toLocaleString("es")}</strong><span>Tokens de entrada</span></div>
        <div class="tarjetaResumen"><strong>${totalOutput.toLocaleString("es")}</strong><span>Tokens de salida</span></div>
    `;

    // ---- Desglose por tipo ----
    const porTipo = {};
    registros.forEach(r => {
        const tipo = r.tipo || "desconocido";
        if (!porTipo[tipo]) {
            porTipo[tipo] = { llamadas: 0, inputTokens: 0, outputTokens: 0, costoUsd: 0 };
        }
        porTipo[tipo].llamadas++;
        porTipo[tipo].inputTokens += r.inputTokens || 0;
        porTipo[tipo].outputTokens += r.outputTokens || 0;
        porTipo[tipo].costoUsd += r.costoUsd || 0;
    });

    const filasPorTipo = Object.entries(porTipo).sort((a, b) => b[1].costoUsd - a[1].costoUsd);

    tablaPorTipo.innerHTML = filasPorTipo.length > 0
        ? filasPorTipo.map(([tipo, datos]) => `
            <tr>
                <td>${ETIQUETA_TIPO_IA[tipo] || tipo}</td>
                <td>${datos.llamadas}</td>
                <td>${datos.inputTokens.toLocaleString("es")}</td>
                <td>${datos.outputTokens.toLocaleString("es")}</td>
                <td>${formatoUsd(datos.costoUsd)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="5" style="text-align:center; color:var(--texto-suave);">Todavía no hay llamadas registradas.</td></tr>`;

    // ---- Llamadas más recientes (ya vienen ordenadas por fecha desc) ----
    const recientes = registros.slice(0, 30);

    tablaRecientes.innerHTML = recientes.length > 0
        ? recientes.map(r => `
            <tr>
                <td style="white-space:nowrap;">${formatoFechaCorta(r.fecha)}</td>
                <td>${ETIQUETA_TIPO_IA[r.tipo] || r.tipo || "—"}</td>
                <td>${(r.inputTokens || 0).toLocaleString("es")} / ${(r.outputTokens || 0).toLocaleString("es")}</td>
                <td>${formatoUsd(r.costoUsd || 0)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4" style="text-align:center; color:var(--texto-suave);">Todavía no hay llamadas registradas.</td></tr>`;

}
