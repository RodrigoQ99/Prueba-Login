// ==========================================================
// PÁGINA "ESTADÍSTICAS" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html: login
// propio, gate contra esAdmin(). Todo lo que se muestra aquí sale de
// una lectura de las colecciones ya existentes (usuarios, progreso,
// lecturas) — no crea ninguna colección nueva ni escribe nada.
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
document.getElementById("btnCerrarSesionAdmin").addEventListener("click", () => auth.signOut());

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
    cargarEstadisticas();

});


// ==========================================================
// CARGA Y CÁLCULO
// ==========================================================

function renderizarBarras(contenedor, entradas, opcionesFormato) {

    if (entradas.length === 0) {
        contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>Todavía no hay datos suficientes.</p>";
        return;
    }

    const max = Math.max(...entradas.map(e => e.valor));
    const formatoValor = (opcionesFormato && opcionesFormato.formatoValor) || (v => v);

    contenedor.innerHTML = entradas.map(e => `
        <div class="filaEstadistica">
            <span class="filaEstadisticaEtiqueta" title="${e.etiqueta}">${e.etiqueta}</span>
            <div class="filaEstadisticaBarra">
                <div class="filaEstadisticaBarraRelleno" style="width:${max ? (e.valor / max * 100) : 0}%;"></div>
            </div>
            <span class="filaEstadisticaValor">${formatoValor(e.valor)}</span>
        </div>
    `).join("");

}

function contarPorCampo(usuarios, campo) {

    const conteos = {};

    usuarios.forEach(u => {
        const valor = (u[campo] || "").toString().trim();
        if (!valor) return;
        conteos[valor] = (conteos[valor] || 0) + 1;
    });

    return Object.entries(conteos)
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor);

}

function agruparEdades(usuarios) {

    const bandas = [
        { etiqueta: "Menos de 10", min: -Infinity, max: 9 },
        { etiqueta: "10 a 12", min: 10, max: 12 },
        { etiqueta: "13 a 15", min: 13, max: 15 },
        { etiqueta: "16 a 18", min: 16, max: 18 },
        { etiqueta: "19 a 25", min: 19, max: 25 },
        { etiqueta: "26 o más", min: 26, max: Infinity }
    ];

    const conteos = bandas.map(b => ({ etiqueta: b.etiqueta, valor: 0, banda: b }));
    let sinDato = 0;

    usuarios.forEach(u => {
        const edad = u.edadPerfil;
        if (typeof edad !== "number" || !isFinite(edad)) {
            sinDato++;
            return;
        }
        const fila = conteos.find(c => edad >= c.banda.min && edad <= c.banda.max);
        if (fila) fila.valor++;
    });

    const resultado = conteos.filter(c => c.valor > 0).map(({ etiqueta, valor }) => ({ etiqueta, valor }));
    if (sinDato > 0) resultado.push({ etiqueta: "Sin dato", valor: sinDato });

    return resultado;

}

function contarGeneros(usuarios) {

    const conteos = {};

    usuarios.forEach(u => {
        (u.generosLectura || []).forEach(genero => {
            const valor = (genero || "").trim();
            if (!valor) return;
            conteos[valor] = (conteos[valor] || 0) + 1;
        });
    });

    return Object.entries(conteos)
        .map(([etiqueta, valor]) => ({ etiqueta, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 15);

}

function formatoDuracion(segundos) {
    if (!segundos || !isFinite(segundos)) return "—";
    const mins = Math.floor(segundos / 60);
    const segs = Math.round(segundos % 60);
    return `${mins}:${String(segs).padStart(2, "0")}`;
}

async function cargarEstadisticas() {

    try {

        const [usuariosSnap, progresoSnap] = await Promise.all([
            db.collection("usuarios").get(),
            db.collection("progreso").get(),
            cargarCatalogoLecturas()
        ]);

        const usuarios = usuariosSnap.docs.map(doc => doc.data());
        const progreso = progresoSnap.docs.map(doc => doc.data());

        // ---- Resumen general ----
        const particulares = usuarios.filter(u => u.tipo === "particular").length;
        const estudiantes = usuarios.filter(u => u.tipo === "estudiante").length;

        const rachasVigentes = usuarios
            .map(u => (typeof calcularRachaVigente === "function" ? calcularRachaVigente(u) : (u.rachaActual || 0)))
            .filter(r => r > 0);

        const rachaPromedio = rachasVigentes.length
            ? (rachasVigentes.reduce((suma, r) => suma + r, 0) / rachasVigentes.length)
            : 0;

        document.getElementById("resumenGeneral").innerHTML = `
            <div class="tarjetaResumen"><strong>${usuarios.length}</strong><span>Usuarios registrados</span></div>
            <div class="tarjetaResumen"><strong>${particulares}</strong><span>Particulares</span></div>
            <div class="tarjetaResumen"><strong>${estudiantes}</strong><span>Estudiantes</span></div>
            <div class="tarjetaResumen"><strong>${rachasVigentes.length}</strong><span>Con racha 🔥 activa</span></div>
            <div class="tarjetaResumen"><strong>${rachaPromedio.toFixed(1)}</strong><span>Racha promedio (activas)</span></div>
        `;

        // ---- Edades / países / lenguas / géneros ----
        renderizarBarras(document.getElementById("statsEdades"), agruparEdades(usuarios));
        renderizarBarras(document.getElementById("statsPaises"), contarPorCampo(usuarios, "pais").slice(0, 10));
        renderizarBarras(document.getElementById("statsLenguas"), contarPorCampo(usuarios, "lenguaMaterna").slice(0, 10));
        renderizarBarras(document.getElementById("statsGeneros"), contarGeneros(usuarios));

        // ---- Lecturas de premios: vistas, intentos, aprobados, tiempo promedio ----
        const progresoPorLectura = {};
        progreso.forEach(p => {
            if (!progresoPorLectura[p.lecturaId]) progresoPorLectura[p.lecturaId] = [];
            progresoPorLectura[p.lecturaId].push(p);
        });

        const filasLecturas = CATALOGO_LECTURAS.map(lectura => {

            const intentos = progresoPorLectura[lectura.id] || [];
            const aprobados = new Set(
                intentos.filter(i => i.puntosGanados > 0).map(i => i.usuarioId)
            ).size;
            const duraciones = intentos.map(i => i.duracionSegundos).filter(d => typeof d === "number");
            const promedioDuracion = duraciones.length
                ? duraciones.reduce((s, d) => s + d, 0) / duraciones.length
                : null;

            return { lectura, intentos: intentos.length, aprobados, promedioDuracion };

        }).sort((a, b) => b.intentos - a.intentos);

        document.getElementById("statsLecturas").innerHTML = filasLecturas.map(f => `
            <tr>
                <td>${f.lectura.titulo}</td>
                <td>${NOMBRE_NIVEL[f.lectura.nivel] || f.lectura.nivel}</td>
                <td>${f.lectura.vistas || 0}</td>
                <td>${f.intentos}</td>
                <td>${f.aprobados}</td>
                <td>${formatoDuracion(f.promedioDuracion)}</td>
            </tr>
        `).join("") || `<tr><td colspan="6" style="text-align:center; color:var(--texto-suave);">Todavía no hay lecturas en el catálogo.</td></tr>`;

    } catch (error) {
        console.error("No se pudieron cargar las estadísticas:", error);
        document.getElementById("resumenGeneral").innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar las estadísticas.</p>";
    }

}
