// ==========================================================
// ADMIN — CENTROS EDUCATIVOS
// ==========================================================
// CRUD de colegios: el administrador general crea centros
// educativos y asigna un correo de coordinador a cada uno.
// Al crear el colegio, si el coordinador ya tiene cuenta en
// "usuarios", se le asigna rolEscolar: "coordinador".
// ==========================================================

// Login admin (mismo patrón que admin-panel.js)
const pantallaLoginAdmin = document.getElementById("pantallaLoginAdmin");
const pantallaSinPermiso = document.getElementById("pantallaSinPermiso");
const contenedorPrincipal = document.getElementById("contenedorAdminColegios");

document.getElementById("btnLoginGoogleAdmin").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
    });
});

document.getElementById("btnCerrarSesionAdmin").addEventListener("click", () => auth.signOut());
if (document.getElementById("btnCerrarSesionAdminSinPermiso")) {
    document.getElementById("btnCerrarSesionAdminSinPermiso").addEventListener("click", () => auth.signOut());
}

auth.onAuthStateChanged(async (user) => {

    pantallaLoginAdmin.style.display = "none";
    pantallaSinPermiso.style.display = "none";
    contenedorPrincipal.style.display = "none";

    if (!user) {
        pantallaLoginAdmin.style.display = "flex";
        return;
    }

    await cargarAdministradores();

    if (!esAdmin()) {
        pantallaSinPermiso.style.display = "flex";
        return;
    }

    contenedorPrincipal.style.display = "block";
    cargarColegios();

});


// ==========================================================
// CRUD DE COLEGIOS
// ==========================================================

const formulario = document.getElementById("formularioNuevoColegio");
const btnAgregar = document.getElementById("btnAgregarColegio");
const btnGuardar = document.getElementById("btnGuardarColegio");
const btnCancelar = document.getElementById("btnCancelarColegio");
const errorEl = document.getElementById("errorNuevoColegio");
const listaEl = document.getElementById("listaColegios");

let _colegioEditando = null; // null = creando, string = editando (ID del colegio)

btnAgregar.addEventListener("click", () => {
    _colegioEditando = null;
    document.getElementById("inputNombreColegio").value = "";
    document.getElementById("inputCorreoCoordinador").value = "";
    errorEl.textContent = "";
    formulario.style.display = "block";
    btnAgregar.style.display = "none";
});

btnCancelar.addEventListener("click", () => {
    formulario.style.display = "none";
    btnAgregar.style.display = "";
    _colegioEditando = null;
});

btnGuardar.addEventListener("click", async () => {

    const nombre = document.getElementById("inputNombreColegio").value.trim();
    const correoCoordinador = document.getElementById("inputCorreoCoordinador").value.trim().toLowerCase();

    errorEl.textContent = "";

    if (!nombre) {
        errorEl.textContent = "Escribe el nombre del colegio.";
        return;
    }

    if (!correoCoordinador || !correoCoordinador.includes("@")) {
        errorEl.textContent = "Escribe un correo válido para el coordinador.";
        return;
    }

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando…";

    try {

        // Verificar que este correo no sea ya coordinador de otro colegio
        if (!_colegioEditando) {
            const yaExiste = await db.collection("colegios")
                .where("correoCoordinador", "==", correoCoordinador)
                .limit(1)
                .get();

            if (!yaExiste.empty) {
                errorEl.textContent = "Este correo ya es coordinador de otro colegio.";
                btnGuardar.disabled = false;
                btnGuardar.textContent = "Guardar";
                return;
            }
        }

        const datos = {
            nombre: nombre,
            correoCoordinador: correoCoordinador
        };

        if (_colegioEditando) {
            // Editando
            await db.collection("colegios").doc(_colegioEditando).update(datos);
        } else {
            // Creando
            datos.creadoPor = auth.currentUser.uid;
            datos.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("colegios").add(datos);

            // Intentar asignar rol al coordinador si ya tiene cuenta
            await asignarRolCoordinador(correoCoordinador, docRef.id);
        }

        formulario.style.display = "none";
        btnAgregar.style.display = "";
        _colegioEditando = null;
        cargarColegios();

    } catch (error) {
        console.error("Error al guardar colegio:", error);
        errorEl.textContent = "No se pudo guardar. Intenta de nuevo.";
    }

    btnGuardar.disabled = false;
    btnGuardar.textContent = "Guardar";

});


/**
 * Busca al usuario con ese correo en la colección "usuarios" y le
 * asigna rolEscolar: "coordinador" y colegioId. Si no existe
 * todavía (no se ha registrado), se asignará cuando inicie sesión
 * por primera vez (auth.js revisa su correo contra los colegios).
 */
async function asignarRolCoordinador(correo, colegioId) {

    try {
        const snapshot = await db.collection("usuarios")
            .where("email", "==", correo)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            await doc.ref.update({
                rolEscolar: "coordinador",
                colegioId: colegioId
            });
        }
    } catch (error) {
        console.error("No se pudo asignar rol de coordinador:", error);
    }

}


async function cargarColegios() {

    listaEl.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">Cargando…</p>';

    try {

        const snapshot = await db.collection("colegios").orderBy("creadoEn", "desc").get();

        if (snapshot.empty) {
            listaEl.innerHTML = '<p style="text-align:center; color:var(--texto-suave);">No hay centros educativos registrados.</p>';
            return;
        }

        let html = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <div class="tarjetaSeccion" data-colegio-id="${doc.id}">
                    <h3>🏫 ${data.nombre || "Sin nombre"}</h3>
                    <p class="metaSeccion">
                        <strong>Coordinador:</strong> ${data.correoCoordinador || "—"}
                    </p>
                    <div style="display:flex; gap:8px; margin-top:10px;">
                        <button type="button" class="botonAdminChico btnEditarColegio" data-id="${doc.id}"
                                data-nombre="${(data.nombre || '').replace(/"/g, '&quot;')}"
                                data-correo="${data.correoCoordinador || ''}">
                            ✏️ Editar
                        </button>
                        <button type="button" class="botonAdminContorno btnEliminarColegio" data-id="${doc.id}"
                                data-nombre="${(data.nombre || '').replace(/"/g, '&quot;')}">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            `;
        });

        listaEl.innerHTML = html;

        // Eventos de editar
        listaEl.querySelectorAll(".btnEditarColegio").forEach(btn => {
            btn.addEventListener("click", () => {
                _colegioEditando = btn.dataset.id;
                document.getElementById("inputNombreColegio").value = btn.dataset.nombre;
                document.getElementById("inputCorreoCoordinador").value = btn.dataset.correo;
                errorEl.textContent = "";
                formulario.style.display = "block";
                btnAgregar.style.display = "none";
            });
        });

        // Eventos de eliminar
        listaEl.querySelectorAll(".btnEliminarColegio").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm(`¿Eliminar el colegio "${btn.dataset.nombre}"?\n\nEsto también eliminará sus grados, secciones y desvinculará a todos los usuarios asociados.`)) return;

                try {
                    // Eliminar subcolecciones (grados y secciones)
                    await eliminarSubcolecciones(btn.dataset.id);

                    // Desvincular usuarios asociados a este colegio
                    await desvincularUsuariosDeColegio(btn.dataset.id);

                    // Eliminar el colegio
                    await db.collection("colegios").doc(btn.dataset.id).delete();

                    cargarColegios();
                } catch (error) {
                    console.error("Error al eliminar colegio:", error);
                    alert("No se pudo eliminar el colegio. Intenta de nuevo.");
                }
            });
        });

    } catch (error) {
        console.error("Error al cargar colegios:", error);
        listaEl.innerHTML = '<p style="text-align:center; color:#c0392b;">Error al cargar. Recarga la página.</p>';
    }

}


async function eliminarSubcolecciones(colegioId) {

    // Eliminar grados
    const grados = await db.collection("colegios").doc(colegioId).collection("grados").get();
    const loteGrados = db.batch();
    grados.forEach(doc => loteGrados.delete(doc.ref));
    if (!grados.empty) await loteGrados.commit();

    // Eliminar secciones
    const secciones = await db.collection("colegios").doc(colegioId).collection("secciones").get();
    const loteSecciones = db.batch();
    secciones.forEach(doc => loteSecciones.delete(doc.ref));
    if (!secciones.empty) await loteSecciones.commit();

}


async function desvincularUsuariosDeColegio(colegioId) {

    const snapshot = await db.collection("usuarios")
        .where("colegioId", "==", colegioId)
        .get();

    if (snapshot.empty) return;

    const lote = db.batch();
    snapshot.forEach(doc => {
        lote.update(doc.ref, {
            colegioId: firebase.firestore.FieldValue.delete(),
            seccionId: firebase.firestore.FieldValue.delete(),
            rolEscolar: firebase.firestore.FieldValue.delete()
        });
    });
    await lote.commit();

}
