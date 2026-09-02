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

// Compartidas por agruparEdades() y construirTablaEdadGenero() (más
// abajo) — mismos rangos en los dos lados para que sea el mismo
// desglose de siempre, ahora también cruzado con género.
const BANDAS_EDAD_ESTADISTICAS = [
    { etiqueta: "Menos de 10", min: -Infinity, max: 9 },
    { etiqueta: "10 a 12", min: 10, max: 12 },
    { etiqueta: "13 a 15", min: 13, max: 15 },
    { etiqueta: "16 a 18", min: 16, max: 18 },
    { etiqueta: "19 a 25", min: 19, max: 25 },
    { etiqueta: "26 o más", min: 26, max: Infinity }
];

function agruparEdades(usuarios) {

    const conteos = BANDAS_EDAD_ESTADISTICAS.map(b => ({ etiqueta: b.etiqueta, valor: 0, banda: b }));
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

// Solo los géneros que la gente ESCRIBIÓ A MANO en el campo "Otro" (ver
// generos.js) — es decir, cualquier valor de generosLectura que NO esté
// en la lista oficial de checkboxes (GENEROS_LECTURA, cargada antes de
// llamar esta función — ver cargarEstadisticas). Se agrupan sin
// importar mayúsculas/espacios (mismo criterio que normalizarTexto en
// puntos.js, reescrito aquí porque esta página no carga puntos.js) para
// que "cine", "Cine" y "CINE " cuenten como el mismo género.
function contarGenerosOtros(usuarios) {

    const conteos = {}; // clave normalizada -> { etiqueta, valor }

    usuarios.forEach(u => {
        (u.generosLectura || []).forEach(genero => {

            const texto = (genero || "").trim();
            if (!texto) return;
            if (GENEROS_LECTURA.includes(texto)) return; // ya está en la lista oficial

            const clave = texto.toLowerCase();
            if (!conteos[clave]) {
                conteos[clave] = { etiqueta: texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase(), valor: 0 };
            }
            conteos[clave].valor++;

        });
    });

    return Object.values(conteos).sort((a, b) => b.valor - a.valor);

}

// Lenguas maternas: "español" y "Español" son EL MISMO idioma. Se
// agrupan sin importar mayúsculas, acentos ni espacios de sobra, y se
// muestran con la primera letra en mayúscula, usando la forma escrita
// más frecuente ("chino mandarín" -> "Chino mandarín"). Mismo espíritu
// que contarGenerosOtros, pero además plegando acentos.
function contarLenguasMaternas(usuarios) {

    const grupos = {}; // clave normalizada -> { formas: {texto: n}, total: n }

    usuarios.forEach(u => {
        const texto = (u.lenguaMaterna || "").trim().replace(/\s+/g, " ");
        if (!texto) return;
        const clave = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        if (!grupos[clave]) grupos[clave] = { formas: {}, total: 0 };
        grupos[clave].formas[texto] = (grupos[clave].formas[texto] || 0) + 1;
        grupos[clave].total++;
    });

    return Object.values(grupos).map(g => {
        const formaComun = Object.entries(g.formas).sort((a, b) => b[1] - a[1])[0][0];
        return {
            etiqueta: formaComun.charAt(0).toUpperCase() + formaComun.slice(1),
            valor: g.total
        };
    }).sort((a, b) => b.valor - a.valor);

}

// Cruce edad × género — SIN NOMBRES, solo en qué rango de edad (mismas
// bandas que agruparEdades) cuánta gente eligió cada género (oficial O
// "Otro", los dos cuentan aquí — el objetivo es ver preferencias por
// edad, no separar por origen del dato como sí hace contarGenerosOtros).
function construirTablaEdadGenero(usuarios) {

    const porBanda = BANDAS_EDAD_ESTADISTICAS.map(b => ({ etiqueta: b.etiqueta, banda: b, generos: {} }));

    usuarios.forEach(u => {

        const edad = u.edadPerfil;
        if (typeof edad !== "number" || !isFinite(edad)) return; // sin edad no se puede ubicar en ninguna banda

        const fila = porBanda.find(f => edad >= f.banda.min && edad <= f.banda.max);
        if (!fila) return;

        (u.generosLectura || []).forEach(genero => {
            const texto = (genero || "").trim();
            if (!texto) return;
            fila.generos[texto] = (fila.generos[texto] || 0) + 1;
        });

    });

    return porBanda
        .filter(f => Object.keys(f.generos).length > 0)
        .map(f => ({
            etiqueta: f.etiqueta,
            listaGeneros: Object.entries(f.generos)
                .sort((a, b) => b[1] - a[1])
                .map(([genero, cantidad]) => `${genero} (${cantidad})`)
                .join(", ")
        }));

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
            cargarCatalogoLecturas(),
            // Necesaria ANTES de contarGenerosOtros() — decide qué
            // valores de generosLectura son "oficiales" (checkbox) y
            // cuáles son texto libre escrito en "Otro".
            cargarGenerosLectura()
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
        // Sin recortar a los primeros 10 (a diferencia de lenguas) — el
        // país ahora es un <select> restringido a LISTA_PAISES (ver
        // paises.js), así que cada barra es un país real y distinto; el
        // objetivo es ver la cantidad de usuarios en CADA país, no solo
        // los más comunes.
        renderizarBarras(document.getElementById("statsPaises"), contarPorCampo(usuarios, "pais"));
        renderizarBarras(document.getElementById("statsLenguas"), contarLenguasMaternas(usuarios).slice(0, 10));
        renderizarBarras(document.getElementById("statsGeneros"), contarGeneros(usuarios));
        renderizarBarras(document.getElementById("statsGenerosOtros"), contarGenerosOtros(usuarios));

        const tablaEdadGenero = construirTablaEdadGenero(usuarios);
        document.getElementById("statsEdadGenero").innerHTML = tablaEdadGenero.map(f => `
            <tr>
                <td style="white-space:nowrap;">${f.etiqueta}</td>
                <td>${f.listaGeneros}</td>
            </tr>
        `).join("") || `<tr><td colspan="2" style="text-align:center; color:var(--texto-suave);">Todavía no hay datos suficientes.</td></tr>`;

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
