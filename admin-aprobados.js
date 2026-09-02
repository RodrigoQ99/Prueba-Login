// ==========================================================
// PÁGINA "APROBADOS" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-panel.html /
// admin-estadisticas.html: login propio, gate contra esAdmin().
//
// Muestra, para cada LECTURA DE PREMIOS, quién la aprobó (nombre, edad,
// tipo/colegio, país, intentos y fecha). El objetivo es que el admin
// pueda ver si la edad de quien leyó corresponde al nivel de la lectura
// — si su comprensión lectora va acorde a su edad.
//
// Todo sale de una LECTURA de colecciones que ya existen (usuarios,
// progreso, lecturas). No crea ninguna colección nueva ni escribe nada.
//
// "Aprobó" = tiene al menos un intento en "progreso" con el cuestionario
// respondido completo (estrellas === totalPreguntas). Mismo criterio que
// usa puntos.js para decidir si otorga puntos, pero aquí SIN la condición
// de "primera vez" — cuenta también a quien la volvió a aprobar después.
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
    cargarAprobados();

});


// ==========================================================
// EDAD Y BANDAS DE EDAD
// ==========================================================
// Mismas bandas que admin-estadisticas.js (BANDAS_EDAD_ESTADISTICAS) —
// se redefinen aquí porque esta página no carga ese archivo.

const BANDAS_EDAD = [
    { etiqueta: "Menos de 10", min: -Infinity, max: 9 },
    { etiqueta: "10 a 12", min: 10, max: 12 },
    { etiqueta: "13 a 15", min: 13, max: 15 },
    { etiqueta: "16 a 18", min: 16, max: 18 },
    { etiqueta: "19 a 25", min: 19, max: 25 },
    { etiqueta: "26 o más", min: 26, max: Infinity }
];

// Edad del usuario: usa edadPerfil si está guardada; si no, la calcula
// desde fechaNacimiento ("YYYY-MM-DD") — misma cuenta que
// calcularEdadDesdeFecha en auth.js (que esta página no carga).
function edadDeUsuario(u) {

    if (u && typeof u.edadPerfil === "number" && isFinite(u.edadPerfil)) {
        return u.edadPerfil;
    }

    if (u && u.fechaNacimiento) {
        const nacimiento = new Date(u.fechaNacimiento + "T00:00:00");
        if (!isNaN(nacimiento.getTime())) {
            const hoy = new Date();
            let edad = hoy.getFullYear() - nacimiento.getFullYear();
            const noHaCumplido =
                hoy.getMonth() < nacimiento.getMonth() ||
                (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
            if (noHaCumplido) edad--;
            return edad;
        }
    }

    return null;

}

function bandaDeEdad(edad) {
    if (typeof edad !== "number" || !isFinite(edad)) return null;
    return BANDAS_EDAD.find(b => edad >= b.min && edad <= b.max) || null;
}


// ==========================================================
// CARGA Y CÁLCULO
// ==========================================================

// Dataset ya cruzado (lectura -> lista de aprobadores). Se calcula una
// vez en cargarAprobados() y los filtros solo lo repintan.
let DATOS_APROBADOS = [];

function intentoAprobado(p) {
    // Cuestionario respondido completo. El "|| puntosGanados > 0" es una
    // red por si algún registro viejo no tuviera totalPreguntas.
    return (typeof p.totalPreguntas === "number" && p.totalPreguntas > 0 && p.estrellas === p.totalPreguntas)
        || p.puntosGanados > 0;
}

function fechaMs(p) {
    if (p && p.fecha && typeof p.fecha.toDate === "function") return p.fecha.toDate().getTime();
    return 0;
}

function formatoFecha(ms) {
    if (!ms) return "—";
    return new Date(ms).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" });
}

function formatoDuracion(segundos) {
    if (typeof segundos !== "number" || !isFinite(segundos)) return "—";
    const mins = Math.floor(segundos / 60);
    const segs = Math.round(segundos % 60);
    return `${mins}:${String(segs).padStart(2, "0")}`;
}

function escaparHtml(texto) {
    return (texto == null ? "" : String(texto))
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

async function cargarAprobados() {

    const cont = document.getElementById("listaAprobados");

    try {

        const [usuariosSnap, progresoSnap] = await Promise.all([
            db.collection("usuarios").get(),
            db.collection("progreso").get(),
            cargarCatalogoLecturas()
        ]);

        const usuariosPorId = {};
        usuariosSnap.docs.forEach(doc => { usuariosPorId[doc.id] = doc.data(); });

        // progreso -> agrupado por lectura y por usuario
        const porLectura = {};
        progresoSnap.docs.forEach(doc => {
            const p = doc.data();
            if (!p.lecturaId || !p.usuarioId) return;
            if (!porLectura[p.lecturaId]) porLectura[p.lecturaId] = {};
            if (!porLectura[p.lecturaId][p.usuarioId]) porLectura[p.lecturaId][p.usuarioId] = [];
            porLectura[p.lecturaId][p.usuarioId].push(p);
        });

        DATOS_APROBADOS = CATALOGO_LECTURAS.map(lectura => {

            const porUsuario = porLectura[lectura.id] || {};
            const aprobadores = [];

            Object.keys(porUsuario).forEach(uid => {

                const intentos = porUsuario[uid];
                const aprobados = intentos.filter(intentoAprobado);
                if (aprobados.length === 0) return;

                // El primer intento aprobado (cronológicamente) es cuando
                // demostró la comprensión por primera vez.
                const primerAprobado = aprobados
                    .slice()
                    .sort((a, b) => fechaMs(a) - fechaMs(b))[0];

                const usuario = usuariosPorId[uid] || {};
                const edad = edadDeUsuario(usuario);

                aprobadores.push({
                    uid,
                    nombre: usuario.nombre || "(sin nombre)",
                    email: usuario.email || "",
                    tipo: usuario.tipo || "",
                    colegio: usuario.colegio || "",
                    grado: usuario.grado || "",
                    pais: usuario.pais || "",
                    edad,
                    banda: bandaDeEdad(edad),
                    intentosTotales: intentos.length,
                    intentosAprobados: aprobados.length,
                    tiempoSegundos: primerAprobado.duracionSegundos,
                    fechaMs: fechaMs(primerAprobado)
                });

            });

            aprobadores.sort((a, b) => b.fechaMs - a.fechaMs);

            return { lectura, aprobadores };

        });

        renderResumen();
        renderLista();

    } catch (error) {
        console.error("No se pudieron cargar los aprobados:", error);
        cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar los datos.</p>";
    }

}


// ==========================================================
// RESUMEN (sobre TODO el dataset, sin filtrar)
// ==========================================================

function renderResumen() {

    const totalLecturas = DATOS_APROBADOS.length;
    const conAprobados = DATOS_APROBADOS.filter(d => d.aprobadores.length > 0).length;

    // Personas-lectura: cada (persona, lectura) aprobada cuenta una vez.
    const aprobacionesTotales = DATOS_APROBADOS.reduce((s, d) => s + d.aprobadores.length, 0);

    // Personas distintas que han aprobado al menos una lectura.
    const personas = new Set();
    DATOS_APROBADOS.forEach(d => d.aprobadores.forEach(a => personas.add(a.uid)));

    document.getElementById("resumenGeneral").innerHTML = `
        <div class="tarjetaResumen"><strong>${personas.size}</strong><span>Personas que han aprobado</span></div>
        <div class="tarjetaResumen"><strong>${aprobacionesTotales}</strong><span>Lecturas aprobadas (persona × lectura)</span></div>
        <div class="tarjetaResumen"><strong>${conAprobados} / ${totalLecturas}</strong><span>Lecturas con al menos 1 aprobado</span></div>
    `;

    // Rellenar el <select> de bandas solo con las que tienen gente.
    const bandasConGente = new Set();
    DATOS_APROBADOS.forEach(d => d.aprobadores.forEach(a => {
        bandasConGente.add(a.banda ? a.banda.etiqueta : "Sin dato");
    }));

    const selBanda = document.getElementById("filtroBanda");
    const ordenadas = BANDAS_EDAD.map(b => b.etiqueta).filter(e => bandasConGente.has(e));
    if (bandasConGente.has("Sin dato")) ordenadas.push("Sin dato");

    selBanda.innerHTML = `<option value="">Todas las edades</option>` +
        ordenadas.map(e => `<option value="${escaparHtml(e)}">${escaparHtml(e)}</option>`).join("");

}


// ==========================================================
// LISTA FILTRADA
// ==========================================================

function leerFiltros() {
    return {
        texto: document.getElementById("filtroTexto").value.trim().toLowerCase(),
        nivel: document.getElementById("filtroNivel").value,
        banda: document.getElementById("filtroBanda").value
    };
}

function aprobadorPasaFiltro(a, filtros) {

    if (filtros.banda) {
        const etiqueta = a.banda ? a.banda.etiqueta : "Sin dato";
        if (etiqueta !== filtros.banda) return false;
    }

    if (filtros.texto) {
        const heno = `${a.nombre} ${a.colegio} ${a.grado} ${a.pais} ${a.email}`.toLowerCase();
        if (!heno.includes(filtros.texto)) return false;
    }

    return true;

}

function etiquetaTipo(a) {
    if (a.tipo === "estudiante") {
        const detalle = [a.colegio, a.grado].filter(Boolean).join(" · ");
        return detalle ? `Estudiante (${escaparHtml(detalle)})` : "Estudiante";
    }
    if (a.tipo === "particular") return "Particular";
    return "—";
}

function filasFiltradas() {

    const filtros = leerFiltros();

    return DATOS_APROBADOS
        .filter(d => !filtros.nivel || d.lectura.nivel === filtros.nivel)
        .map(d => ({
            lectura: d.lectura,
            aprobadores: d.aprobadores.filter(a => aprobadorPasaFiltro(a, filtros))
        }));

}

function renderLista() {

    const cont = document.getElementById("listaAprobados");
    const grupos = filasFiltradas();

    const totalMostrados = grupos.reduce((s, g) => s + g.aprobadores.length, 0);
    if (totalMostrados === 0) {
        cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave); padding:20px 0;'>Nadie coincide con estos filtros.</p>";
        return;
    }

    // Lecturas con más aprobados primero; las que quedaron en 0 tras el
    // filtro no se muestran.
    const conGente = grupos
        .filter(g => g.aprobadores.length > 0)
        .sort((a, b) => b.aprobadores.length - a.aprobadores.length);

    cont.innerHTML = conGente.map(g => {

        const nivel = NOMBRE_NIVEL[g.lectura.nivel] || g.lectura.nivel;

        // Desglose por banda de edad (el dato clave: ¿qué edades están
        // aprobando una lectura de este nivel?).
        const porBanda = {};
        g.aprobadores.forEach(a => {
            const etiqueta = a.banda ? a.banda.etiqueta : "Sin dato";
            porBanda[etiqueta] = (porBanda[etiqueta] || 0) + 1;
        });
        const ordenBandas = BANDAS_EDAD.map(b => b.etiqueta).concat(["Sin dato"]);
        const chips = ordenBandas
            .filter(e => porBanda[e])
            .map(e => `<span class="chipEdad">${escaparHtml(e)}: <strong>${porBanda[e]}</strong></span>`)
            .join("");

        const filas = g.aprobadores.map(a => `
            <tr>
                <td>${escaparHtml(a.nombre)}</td>
                <td style="text-align:center;">${typeof a.edad === "number" && isFinite(a.edad) ? a.edad : "—"}</td>
                <td>${etiquetaTipo(a)}</td>
                <td>${escaparHtml(a.pais) || "—"}</td>
                <td style="text-align:center;">${a.intentosTotales}${a.intentosAprobados > 1 ? ` <span style="color:var(--texto-suave);">(${a.intentosAprobados}✔)</span>` : ""}</td>
                <td style="text-align:center;">${formatoDuracion(a.tiempoSegundos)}</td>
                <td style="white-space:nowrap;">${formatoFecha(a.fechaMs)}</td>
            </tr>
        `).join("");

        return `
            <details class="grupoNivelAdmin" open>
                <summary>
                    ${escaparHtml(g.lectura.titulo)}
                    <span style="font-weight:400; font-size:12px; color:var(--texto-suave);">
                        · ${nivel} · ${g.aprobadores.length} ${g.aprobadores.length === 1 ? "persona" : "personas"}
                    </span>
                </summary>
                <div style="padding:10px 0 4px;">
                    <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">${chips}</div>
                    <div style="overflow-x:auto;">
                        <table class="tablaEstadisticas">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Edad</th>
                                    <th>Tipo</th>
                                    <th>País</th>
                                    <th>Intentos</th>
                                    <th>Tiempo</th>
                                    <th>1ª aprob.</th>
                                </tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                    </div>
                </div>
            </details>
        `;

    }).join("");

}


// ==========================================================
// DESCARGA CSV (de lo que se está viendo, con filtros aplicados)
// ==========================================================

function descargarCsv() {

    const grupos = filasFiltradas().filter(g => g.aprobadores.length > 0);

    if (grupos.length === 0) {
        alert("No hay filas que exportar con los filtros actuales.");
        return;
    }

    const encabezados = [
        "Lectura", "Nivel", "Nombre", "Email", "Edad", "Banda de edad",
        "Tipo", "Colegio", "Grado", "Pais",
        "Intentos totales", "Intentos aprobados", "Tiempo 1a aprob (s)", "Fecha 1a aprob"
    ];

    const escaparCsv = (v) => {
        const s = (v == null ? "" : String(v));
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lineas = [encabezados.join(",")];

    grupos.forEach(g => {
        g.aprobadores.forEach(a => {
            lineas.push([
                g.lectura.titulo,
                NOMBRE_NIVEL[g.lectura.nivel] || g.lectura.nivel,
                a.nombre,
                a.email,
                (typeof a.edad === "number" && isFinite(a.edad)) ? a.edad : "",
                a.banda ? a.banda.etiqueta : "Sin dato",
                a.tipo,
                a.colegio,
                a.grado,
                a.pais,
                a.intentosTotales,
                a.intentosAprobados,
                (typeof a.tiempoSegundos === "number" && isFinite(a.tiempoSegundos)) ? Math.round(a.tiempoSegundos) : "",
                a.fechaMs ? new Date(a.fechaMs).toISOString().slice(0, 10) : ""
            ].map(escaparCsv).join(","));
        });
    });

    // BOM para que Excel abra los acentos bien.
    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aprobados-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

}


document.getElementById("filtroTexto").addEventListener("input", renderLista);
document.getElementById("filtroNivel").addEventListener("change", renderLista);
document.getElementById("filtroBanda").addEventListener("change", renderLista);
document.getElementById("btnDescargarCsv").addEventListener("click", descargarCsv);
