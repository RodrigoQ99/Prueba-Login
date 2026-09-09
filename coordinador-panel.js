// ==========================================================
// PANEL DE COORDINADOR
// ==========================================================
// El coordinador administra la estructura académica de su
// colegio: crea grados, define secciones dentro de cada grado,
// y asigna un maestro encargado (por correo) a cada sección.
//
// El correo del coordinador está guardado en el documento del
// colegio (colegios/{colegioId}.correoCoordinador). Al iniciar
// sesión se busca qué colegio lo tiene asignado.
// ==========================================================

const pantallaLoginCoord = document.getElementById("pantallaLoginCoord");
const pantallaSinPermisoCoord = document.getElementById("pantallaSinPermisoCoord");
const contenedorCoordinador = document.getElementById("contenedorCoordinador");

let _colegioCoord = null; // { id, ...data }

// Login con Google
document.getElementById("btnLoginGoogleCoord").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
    });
});

// Login con email
document.getElementById("btnLoginEmailCoord").addEventListener("click", async () => {
    const email = (document.getElementById("inputEmailCoord").value || "").trim();
    const password = document.getElementById("inputPasswordCoord").value || "";
    const errorEl = document.getElementById("errorLoginCoord");
    errorEl.textContent = "";

    if (!email || !password) {
        errorEl.textContent = "Escribe tu correo y contraseña.";
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        errorEl.textContent = "Correo o contraseña incorrectos.";
    }
});

// Cerrar sesión
document.getElementById("btnCerrarSesionCoord").addEventListener("click", () => auth.signOut());
if (document.getElementById("btnCerrarSesionCoordSinPermiso")) {
    document.getElementById("btnCerrarSesionCoordSinPermiso").addEventListener("click", () => auth.signOut());
}


// ==========================================================
// AUTH: verificar que es coordinador
// ==========================================================

auth.onAuthStateChanged(async (user) => {

    pantallaLoginCoord.style.display = "none";
    pantallaSinPermisoCoord.style.display = "none";
    contenedorCoordinador.style.display = "none";

    if (!user) {
        pantallaLoginCoord.style.display = "flex";
        return;
    }

    // Buscar si este correo es coordinador de algún colegio
    try {
        const snapshot = await db.collection("colegios")
            .where("correoCoordinador", "==", user.email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            pantallaSinPermisoCoord.style.display = "flex";
            return;
        }

        const doc = snapshot.docs[0];
        _colegioCoord = { id: doc.id, ...doc.data() };

        document.getElementById("nombreColegioCoord").textContent = _colegioCoord.nombre || "Mi colegio";
        contenedorCoordinador.style.display = "block";

        // Asegurar que el usuario tenga rolEscolar: "coordinador" en su documento
        await db.collection("usuarios").doc(user.uid).update({
            rolEscolar: "coordinador",
            colegioId: _colegioCoord.id
        }).catch(() => {
            // Si el documento no existe todavía (primera vez), no pasa nada
        });

        cargarEstructura();

    } catch (error) {
        console.error("Error al verificar coordinador:", error);
        pantallaSinPermisoCoord.style.display = "flex";
    }

});


// ==========================================================
// GRADOS
// ==========================================================

const btnAgregarGrado = document.getElementById("btnAgregarGrado");
const formularioGrado = document.getElementById("formularioNuevoGrado");
const btnGuardarGrado = document.getElementById("btnGuardarGrado");
const btnCancelarGrado = document.getElementById("btnCancelarGrado");
const errorGrado = document.getElementById("errorNuevoGrado");

btnAgregarGrado.addEventListener("click", () => {
    formularioGrado.style.display = "block";
    btnAgregarGrado.style.display = "none";
    errorGrado.textContent = "";
    // Llenar el <select> con la lista fija de grados (de grados.js)
    renderizarSelectorGrado(document.getElementById("selectGradoCoord"), "");
});

btnCancelarGrado.addEventListener("click", () => {
    formularioGrado.style.display = "none";
    btnAgregarGrado.style.display = "";
});

btnGuardarGrado.addEventListener("click", async () => {

    const gradoNombre = document.getElementById("selectGradoCoord").value;
    errorGrado.textContent = "";

    if (!gradoNombre) {
        errorGrado.textContent = "Selecciona un grado.";
        return;
    }

    btnGuardarGrado.disabled = true;

    try {

        // Verificar que no exista ya este grado en el colegio
        const yaExiste = await db.collection("colegios").doc(_colegioCoord.id)
            .collection("grados")
            .where("nombre", "==", gradoNombre)
            .limit(1)
            .get();

        if (!yaExiste.empty) {
            errorGrado.textContent = "Este grado ya existe en tu colegio.";
            btnGuardarGrado.disabled = false;
            return;
        }

        await db.collection("colegios").doc(_colegioCoord.id)
            .collection("grados").add({
                nombre: gradoNombre,
                creadoEn: firebase.firestore.FieldValue.serverTimestamp()
            });

        formularioGrado.style.display = "none";
        btnAgregarGrado.style.display = "";
        cargarEstructura();

    } catch (error) {
        console.error("Error al crear grado:", error);
        errorGrado.textContent = "No se pudo crear. Intenta de nuevo.";
    }

    btnGuardarGrado.disabled = false;

});


// ==========================================================
// SECCIONES
// ==========================================================

let _gradoParaSeccion = null; // ID del grado al que se le agrega la sección

const formularioSeccion = document.getElementById("formularioNuevaSeccion");
const btnGuardarSeccion = document.getElementById("btnGuardarSeccion");
const btnCancelarSeccion = document.getElementById("btnCancelarSeccion");
const errorSeccion = document.getElementById("errorNuevaSeccion");

btnCancelarSeccion.addEventListener("click", () => {
    formularioSeccion.style.display = "none";
    _gradoParaSeccion = null;
});

btnGuardarSeccion.addEventListener("click", async () => {

    const nombreSeccion = document.getElementById("inputNombreSeccion").value.trim();
    const correoMaestro = document.getElementById("inputCorreoMaestro").value.trim().toLowerCase();

    errorSeccion.textContent = "";

    if (!nombreSeccion) {
        errorSeccion.textContent = "Escribe el nombre de la sección.";
        return;
    }

    if (!correoMaestro || !correoMaestro.includes("@")) {
        errorSeccion.textContent = "Escribe un correo válido para el maestro.";
        return;
    }

    if (!_gradoParaSeccion) {
        errorSeccion.textContent = "Error interno: no se sabe a qué grado agregar.";
        return;
    }

    btnGuardarSeccion.disabled = true;

    try {

        // Obtener el nombre del grado para desnormalizar
        const gradoDoc = await db.collection("colegios").doc(_colegioCoord.id)
            .collection("grados").doc(_gradoParaSeccion).get();

        const gradoNombre = gradoDoc.exists ? gradoDoc.data().nombre : "";

        await db.collection("colegios").doc(_colegioCoord.id)
            .collection("secciones").add({
                gradoId: _gradoParaSeccion,
                nombre: nombreSeccion,
                gradoNombre: gradoNombre,
                correoMaestro: correoMaestro,
                alumnos: [],
                creadoEn: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Asignar rol de maestro al usuario con ese correo, si ya existe
        await asignarRolMaestro(correoMaestro);

        formularioSeccion.style.display = "none";
        _gradoParaSeccion = null;
        cargarEstructura();

    } catch (error) {
        console.error("Error al crear sección:", error);
        errorSeccion.textContent = "No se pudo crear. Intenta de nuevo.";
    }

    btnGuardarSeccion.disabled = false;

});


async function asignarRolMaestro(correo) {

    try {
        const snapshot = await db.collection("usuarios")
            .where("email", "==", correo)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await doc.ref.update({
                rolEscolar: "maestro",
                colegioId: _colegioCoord.id
            });
        }
    } catch (error) {
        console.error("No se pudo asignar rol de maestro:", error);
    }

}


// ==========================================================
// CARGAR ESTRUCTURA COMPLETA
// ==========================================================

async function cargarEstructura() {

    const listaEl = document.getElementById("listaGrados");
    listaEl.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">Cargando…</p>';

    try {

        const [gradosSnap, seccionesSnap] = await Promise.all([
            db.collection("colegios").doc(_colegioCoord.id).collection("grados").orderBy("nombre").get(),
            db.collection("colegios").doc(_colegioCoord.id).collection("secciones").orderBy("nombre").get()
        ]);

        if (gradosSnap.empty) {
            listaEl.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">No hay grados creados. Agrega uno para empezar.</p>';
            return;
        }

        // Agrupar secciones por gradoId
        const seccionesPorGrado = {};
        seccionesSnap.forEach(doc => {
            const data = doc.data();
            if (!seccionesPorGrado[data.gradoId]) seccionesPorGrado[data.gradoId] = [];
            seccionesPorGrado[data.gradoId].push({ id: doc.id, ...data });
        });

        let html = '';

        gradosSnap.forEach(gradoDoc => {
            const grado = gradoDoc.data();
            const secciones = seccionesPorGrado[gradoDoc.id] || [];

            html += `
                <div class="tarjetaSeccion" style="margin-bottom:18px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>📚 ${grado.nombre}</h3>
                        <div style="display:flex; gap:6px;">
                            <button type="button" class="botonAdminChico btnAgregarSeccion" data-grado-id="${gradoDoc.id}" style="font-size:13px; padding:6px 12px;">
                                + Sección
                            </button>
                            <button type="button" class="botonAdminContorno btnEliminarGrado" data-grado-id="${gradoDoc.id}" data-grado-nombre="${grado.nombre}" style="font-size:13px; padding:6px 12px;">
                                🗑️
                            </button>
                        </div>
                    </div>
            `;

            if (secciones.length === 0) {
                html += '<p style="font-size:13px; color:var(--texto-suave); margin-top:10px;">Sin secciones. Agrega una.</p>';
            } else {
                secciones.forEach(seccion => {
                    html += `
                        <div style="margin-top:12px; padding:12px; background:var(--fondo); border-radius:10px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong>${seccion.nombre}</strong>
                                    <p class="metaSeccion">👩🏫 ${seccion.correoMaestro || '—'}</p>
                                    <p class="metaSeccion">👥 ${(seccion.alumnos || []).length} alumno(s)</p>
                                </div>
                                <button type="button" class="botonAdminContorno btnEliminarSeccion" data-seccion-id="${seccion.id}" data-seccion-nombre="${seccion.nombre}" style="font-size:13px; padding:6px 12px;">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    `;
                });
            }

            html += '</div>';
        });

        listaEl.innerHTML = html;

        // Eventos: agregar sección
        listaEl.querySelectorAll(".btnAgregarSeccion").forEach(btn => {
            btn.addEventListener("click", () => {
                _gradoParaSeccion = btn.dataset.gradoId;
                document.getElementById("inputNombreSeccion").value = "";
                document.getElementById("inputCorreoMaestro").value = "";
                errorSeccion.textContent = "";
                formularioSeccion.style.display = "block";
                formularioSeccion.scrollIntoView({ behavior: "smooth" });
            });
        });

        // Eventos: eliminar grado
        listaEl.querySelectorAll(".btnEliminarGrado").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm(`¿Eliminar el grado "${btn.dataset.gradoNombre}" y todas sus secciones?`)) return;

                try {
                    // Eliminar secciones de este grado
                    const secciones = await db.collection("colegios").doc(_colegioCoord.id)
                        .collection("secciones")
                        .where("gradoId", "==", btn.dataset.gradoId)
                        .get();

                    const lote = db.batch();
                    secciones.forEach(doc => lote.delete(doc.ref));
                    if (!secciones.empty) await lote.commit();

                    // Eliminar el grado
                    await db.collection("colegios").doc(_colegioCoord.id)
                        .collection("grados").doc(btn.dataset.gradoId).delete();

                    cargarEstructura();
                } catch (error) {
                    console.error("Error al eliminar grado:", error);
                    alert("No se pudo eliminar. Intenta de nuevo.");
                }
            });
        });

        // Eventos: eliminar sección
        listaEl.querySelectorAll(".btnEliminarSeccion").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm(`¿Eliminar la sección "${btn.dataset.seccionNombre}"?`)) return;

                try {
                    await db.collection("colegios").doc(_colegioCoord.id)
                        .collection("secciones").doc(btn.dataset.seccionId).delete();
                    cargarEstructura();
                } catch (error) {
                    console.error("Error al eliminar sección:", error);
                    alert("No se pudo eliminar. Intenta de nuevo.");
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar estructura:", error);
        listaEl.innerHTML = '<p style="text-align:center; color:#c0392b;">Error al cargar. Recarga la página.</p>';
    }

}
