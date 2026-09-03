// ==========================================================
// PÁGINA "TIEMPOS DE LECTURA" (dentro del panel de administrador)
// ==========================================================
// Mismo patrón de acceso independiente que admin-aprobados.html: login
// propio, gate contra esAdmin().
//
// Para cada LECTURA DE PREMIOS muestra cuántas palabras tiene y, por
// banda de edad, cuánta gente la ha hecho y cuánto tardó en promedio
// (lectura + cuestionario — el campo "duracionSegundos" de "progreso",
// ver motor.js/puntos.js). Cada persona cuenta UNA sola vez por lectura:
// su intento aprobado, o el más reciente si todavía no la aprobó.
//
// Todo sale de una LECTURA de colecciones que ya existen (usuarios,
// progreso, lecturas). No crea ninguna colección nueva ni escribe nada.
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
    cargarTiempos();

});


// ==========================================================
// EDAD Y BANDAS DE EDAD (mismas bandas que admin-estadisticas.js /
// admin-aprobados.js — se redefinen aquí porque esta página no carga
// esos archivos)
// ==========================================================

const BANDAS_EDAD = [
    { etiqueta: "Menos de 10", min: -Infinity, max: 9 },
    { etiqueta: "10 a 12", min: 10, max: 12 },
    { etiqueta: "13 a 15", min: 13, max: 15 },
    { etiqueta: "16 a 18", min: 16, max: 18 },
    { etiqueta: "19 a 25", min: 19, max: 25 },
    { etiqueta: "26 o más", min: 26, max: Infinity }
];

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

function escaparHtml(texto) {
    return (texto == null ? "" : String(texto))
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function promedio(valores) {
    if (!valores.length) return null;
    return valores.reduce((s, v) => s + v, 0) / valores.length;
}

// Segundos -> "M:SS" (usa la util compartida de lecturas.js si está).
function mmss(segundos) {
    if (typeof formatearDuracionLectura === "function") return formatearDuracionLectura(segundos);
    if (typeof segundos !== "number" || !isFinite(segundos)) return "—";
    const m = Math.floor(segundos / 60);
    const s = Math.round(segundos % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
}


// ==========================================================
// CARGA Y CÁLCULO
// ==========================================================

let DATOS_TIEMPOS = [];

async function cargarTiempos() {

    const cont = document.getElementById("listaTiempos");

    try {

        const [usuariosSnap, progresoSnap] = await Promise.all([
            db.collection("usuarios").get(),
            db.collection("progreso").get(),
            cargarCatalogoLecturas()
        ]);

        const usuariosPorId = {};
        usuariosSnap.docs.forEach(doc => { usuariosPorId[doc.id] = doc.data(); });

        // progreso -> por lectura -> por usuario -> el intento "que cuenta"
        // (aprobado preferido; entre iguales, el más reciente).
        const porLectura = {};
        progresoSnap.docs.forEach(doc => {

            const p = doc.data();
            if (!p.lecturaId || !p.usuarioId) return;
            if (typeof p.duracionSegundos !== "number" || !isFinite(p.duracionSegundos)) return;

            const fechaMs = (p.fecha && typeof p.fecha.toDate === "function") ? p.fecha.toDate().getTime() : 0;
            const aprobado = p.puntosGanados > 0;

            if (!porLectura[p.lecturaId]) porLectura[p.lecturaId] = {};
            const prev = porLectura[p.lecturaId][p.usuarioId];

            if (!prev
                || (aprobado && !prev.aprobado)
                || (aprobado === prev.aprobado && fechaMs >= prev.fechaMs)) {
                porLectura[p.lecturaId][p.usuarioId] = { segundos: p.duracionSegundos, aprobado, fechaMs };
            }

        });

        DATOS_TIEMPOS = CATALOGO_LECTURAS.map(lectura => {

            const porUsuario = porLectura[lectura.id] || {};

            // Un punto por persona, con su edad y su tiempo.
            const puntos = Object.keys(porUsuario).map(uid => {
                const usuario = usuariosPorId[uid] || {};
                const edad = edadDeUsuario(usuario);
                return {
                    edad,
                    banda: bandaDeEdad(edad),
                    segundos: porUsuario[uid].segundos
                };
            });

            // Agrupado por banda de edad.
            const porBanda = BANDAS_EDAD.map(b => ({ banda: b, tiempos: [] }));
            const sinEdad = { etiqueta: "Sin dato", tiempos: [] };

            puntos.forEach(pt => {
                if (pt.banda) {
                    porBanda.find(x => x.banda === pt.banda).tiempos.push(pt.segundos);
                } else {
                    sinEdad.tiempos.push(pt.segundos);
                }
            });

            const filasBanda = porBanda
                .filter(x => x.tiempos.length > 0)
                .map(x => ({
                    etiqueta: x.banda.etiqueta,
                    personas: x.tiempos.length,
                    prom: promedio(x.tiempos),
                    min: Math.min(...x.tiempos),
                    max: Math.max(...x.tiempos)
                }));

            if (sinEdad.tiempos.length > 0) {
                filasBanda.push({
                    etiqueta: sinEdad.etiqueta,
                    personas: sinEdad.tiempos.length,
                    prom: promedio(sinEdad.tiempos),
                    min: Math.min(...sinEdad.tiempos),
                    max: Math.max(...sinEdad.tiempos)
                });
            }

            const todosLosTiempos = puntos.map(pt => pt.segundos);

            return {
                lectura,
                palabras: (typeof contarPalabrasLectura === "function") ? contarPalabrasLectura(lectura) : 0,
                personas: puntos.length,
                prom: promedio(todosLosTiempos),
                min: todosLosTiempos.length ? Math.min(...todosLosTiempos) : null,
                max: todosLosTiempos.length ? Math.max(...todosLosTiempos) : null,
                filasBanda
            };

        });

        renderResumen();
        renderLista();

    } catch (error) {
        console.error("No se pudieron cargar los tiempos de lectura:", error);
        cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar los datos.</p>";
    }

}


// ==========================================================
// RESUMEN (sobre TODO el dataset, sin filtrar)
// ==========================================================

function renderResumen() {

    const conDatos = DATOS_TIEMPOS.filter(d => d.personas > 0);
    const totalMediciones = conDatos.reduce((s, d) => s + d.personas, 0);

    // Promedio global ponderado por cantidad de mediciones.
    const sumaPonderada = conDatos.reduce((s, d) => s + d.prom * d.personas, 0);
    const promGlobal = totalMediciones > 0 ? sumaPonderada / totalMediciones : null;

    document.getElementById("resumenGeneral").innerHTML = `
        <div class="tarjetaResumen"><strong>${conDatos.length} / ${DATOS_TIEMPOS.length}</strong><span>Lecturas con tiempos registrados</span></div>
        <div class="tarjetaResumen"><strong>${totalMediciones}</strong><span>Personas medidas (persona × lectura)</span></div>
        <div class="tarjetaResumen"><strong>${promGlobal != null ? mmss(promGlobal) : "—"}</strong><span>Tiempo promedio global</span></div>
    `;

}


// ==========================================================
// LISTA FILTRADA
// ==========================================================

function leerFiltros() {
    return {
        texto: document.getElementById("filtroTexto").value.trim().toLowerCase(),
        nivel: document.getElementById("filtroNivel").value
    };
}

function datosFiltrados() {
    const f = leerFiltros();
    return DATOS_TIEMPOS.filter(d =>
        (!f.nivel || d.lectura.nivel === f.nivel) &&
        (!f.texto || (d.lectura.titulo || "").toLowerCase().includes(f.texto))
    );
}

function renderLista() {

    const cont = document.getElementById("listaTiempos");
    const grupos = datosFiltrados();

    if (grupos.length === 0) {
        cont.innerHTML = "<p style='text-align:center; color:var(--texto-suave); padding:20px 0;'>Ninguna lectura coincide con estos filtros.</p>";
        return;
    }

    // Con datos primero (más personas medidas arriba); luego las que
    // todavía no tienen ningún tiempo.
    const ordenadas = grupos.slice().sort((a, b) => b.personas - a.personas);

    cont.innerHTML = ordenadas.map(d => {

        const nivel = NOMBRE_NIVEL[d.lectura.nivel] || d.lectura.nivel;

        if (d.personas === 0) {
            return `
                <details class="grupoNivelAdmin">
                    <summary>
                        ${escaparHtml(d.lectura.titulo)}
                        <span style="font-weight:400; font-size:12px; color:var(--texto-suave);">
                            · ${nivel} · ${d.palabras} palabras · sin tiempos todavía
                        </span>
                    </summary>
                </details>
            `;
        }

        const filas = d.filasBanda.map(f => `
            <tr>
                <td>${escaparHtml(f.etiqueta)}</td>
                <td style="text-align:center;">${f.personas}</td>
                <td style="text-align:center;">${mmss(f.prom)}</td>
                <td style="text-align:center;">${mmss(f.min)}</td>
                <td style="text-align:center;">${mmss(f.max)}</td>
            </tr>
        `).join("");

        return `
            <details class="grupoNivelAdmin" open>
                <summary>
                    ${escaparHtml(d.lectura.titulo)}
                    <span style="font-weight:400; font-size:12px; color:var(--texto-suave);">
                        · ${nivel} · ${d.palabras} palabras · ${d.personas} ${d.personas === 1 ? "persona" : "personas"} · prom ${mmss(d.prom)}
                    </span>
                </summary>
                <div style="padding:10px 0 4px; overflow-x:auto;">
                    <table class="tablaEstadisticas">
                        <thead>
                            <tr>
                                <th>Edad</th>
                                <th style="text-align:center;">Personas</th>
                                <th style="text-align:center;">Promedio</th>
                                <th style="text-align:center;">Más rápido</th>
                                <th style="text-align:center;">Más lento</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filas}
                            <tr style="font-weight:700;">
                                <td>Total lectura</td>
                                <td style="text-align:center;">${d.personas}</td>
                                <td style="text-align:center;">${mmss(d.prom)}</td>
                                <td style="text-align:center;">${mmss(d.min)}</td>
                                <td style="text-align:center;">${mmss(d.max)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </details>
        `;

    }).join("");

}


// ==========================================================
// DESCARGA CSV (de lo que se está viendo, con filtros aplicados)
// ==========================================================

function descargarCsv() {

    const grupos = datosFiltrados().filter(d => d.personas > 0);

    if (grupos.length === 0) {
        alert("No hay filas que exportar con los filtros actuales.");
        return;
    }

    const encabezados = [
        "Lectura", "Nivel", "Palabras", "Banda de edad",
        "Personas", "Promedio (s)", "Mas rapido (s)", "Mas lento (s)", "Promedio (mm:ss)"
    ];

    const escaparCsv = (v) => {
        const s = (v == null ? "" : String(v));
        return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lineas = [encabezados.join(",")];

    grupos.forEach(d => {
        const nivel = NOMBRE_NIVEL[d.lectura.nivel] || d.lectura.nivel;
        const filas = d.filasBanda.concat([{
            etiqueta: "TOTAL", personas: d.personas, prom: d.prom, min: d.min, max: d.max
        }]);
        filas.forEach(f => {
            lineas.push([
                d.lectura.titulo,
                nivel,
                d.palabras,
                f.etiqueta,
                f.personas,
                Math.round(f.prom),
                Math.round(f.min),
                Math.round(f.max),
                mmss(f.prom)
            ].map(escaparCsv).join(","));
        });
    });

    const blob = new Blob(["﻿" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiempos-de-lectura-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

}


document.getElementById("filtroTexto").addEventListener("input", renderLista);
document.getElementById("filtroNivel").addEventListener("change", renderLista);
document.getElementById("btnDescargarCsv").addEventListener("click", descargarCsv);
