// ==========================================================
// INFORMACIÓN (dentro de Perfil — ver perfil.html)
// ==========================================================
// Permite cambiar el nombre y elegir un alias, y decidir cuál de
// los dos se muestra en el ranking. El alias no se puede repetir
// entre cuentas (comparación exacta, con tildes y mayúsculas).
//
// La edad ya NO se edita aquí una vez guardada: se calculó sola a
// partir de la fecha de nacimiento que dio al registrarse (ver
// auth.js) — solo se muestra. "edadPerfil" es un dato informativo, sin
// relación con "edadActual" (la edad que navega Mejorar la lectura).
//
// "Completar una sola vez" (edad, género y país): cuentas viejas pueden
// no tener alguno de esos campos guardado. Si falta, esta pantalla deja
// completarlo — pero SOLO mientras falte: en cuanto se guarda, la caja
// de "completar" se esconde para siempre y pasa a mostrarse como texto
// fijo, igual que cualquier cuenta que ya lo tenía desde el registro.
// La protección es solo en el frontend (no se ofrece editarlo; no hay
// una regla de Firestore que lo bloquee) — mismo criterio ya aceptado
// para la edad.
//
// La LENGUA MATERNA es la excepción: siempre se puede editar (alguien
// puede hablar un dialecto que el autocompletado por país no acierta).
// Solo aparece una vez que hay país, y se guarda con la primera letra
// en mayúscula (ver capitalizarLengua en paises.js) para que "español"
// y "Español" no cuenten como idiomas distintos en Estadísticas.

// auth.js no se carga en esta página — se copia esta única función
// (ya existe igual en auth.js) porque aquí también hace falta calcular
// la edad a partir de la fecha de nacimiento.
function calcularEdadDesdeFecha(fechaTexto) {

    const nacimiento = new Date(fechaTexto + "T00:00:00");
    const hoy = new Date();

    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const noHaCumplidoAunEsteAnio =
        hoy.getMonth() < nacimiento.getMonth() ||
        (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

    if (noHaCumplidoAunEsteAnio) edad--;

    return edad;

}

// Guardada en cargarPerfil() para que el botón "Guardar cambios" (más
// abajo, otra función) sepa si la edad/género YA estaban guardados
// antes de este visita — así nunca reenvía ni pisa un valor que ya
// existía, y solo los incluye en el guardado si de verdad faltaban.
let _datosPerfilActual = {};

async function cargarPerfil() {

    const user = auth.currentUser;
    if (!user) return;

    let datos = {};

    try {
        const doc = await db.collection("usuarios").doc(user.uid).get();
        datos = doc.exists ? doc.data() : {};
    } catch (error) {
        console.error("No se pudo cargar tu perfil:", error);
    }

    _datosPerfilActual = datos;

    document.getElementById("campoNombrePerfil").value = datos.nombre || user.displayName || "";
    document.getElementById("campoAliasPerfil").value = datos.alias || "";

    const valorMostrar = (datos.mostrarAlias && datos.alias) ? "alias" : "nombre";
    const radio = document.querySelector(`input[name="mostrarComo"][value="${valorMostrar}"]`);
    if (radio) radio.checked = true;

    // Edad: si ya la tiene, se muestra fija (como siempre). Si NO la
    // tiene (cuenta de antes de la Etapa 11), se muestra la caja para
    // completarla una sola vez.
    const campoEdadTexto = document.getElementById("campoEdadPerfilTexto");
    const notaEdad = document.getElementById("notaEdadPerfil");
    const cajaCompletarEdad = document.getElementById("cajaCompletarEdad");

    if (typeof datos.edadPerfil === "number") {
        campoEdadTexto.textContent = `${datos.edadPerfil} años`;
        campoEdadTexto.style.display = "block";
        notaEdad.style.display = "block";
        cajaCompletarEdad.style.display = "none";
    } else {
        campoEdadTexto.style.display = "none";
        notaEdad.style.display = "none";
        cajaCompletarEdad.style.display = "block";
        const campoFecha = document.getElementById("campoFechaNacimientoPerfil");
        campoFecha.max = new Date().toISOString().split("T")[0]; // no fechas futuras
    }

    // Género: mismo criterio que la edad.
    const campoGeneroTexto = document.getElementById("campoGeneroPerfilTexto");
    const cajaCompletarGenero = document.getElementById("cajaCompletarGenero");

    if (datos.genero) {
        campoGeneroTexto.textContent = datos.genero === "hombre" ? "Hombre" : "Mujer";
        campoGeneroTexto.style.display = "block";
        cajaCompletarGenero.style.display = "none";
    } else {
        campoGeneroTexto.style.display = "none";
        cajaCompletarGenero.style.display = "block";
    }

    // País: mismo criterio que edad/género. Si ya está guardado (todas
    // las cuentas nuevas lo tienen desde el registro), se muestra fijo y
    // no se puede editar. Solo las cuentas viejas a las que les falte
    // pueden completarlo UNA vez. (La lengua materna, más abajo, SÍ es
    // siempre editable.)
    const campoPaisTexto = document.getElementById("campoPaisPerfilTexto");
    const cajaCompletarPais = document.getElementById("cajaCompletarPais");

    if (datos.pais) {
        campoPaisTexto.textContent = datos.pais;
        campoPaisTexto.style.display = "block";
        cajaCompletarPais.style.display = "none";
    } else {
        campoPaisTexto.style.display = "none";
        cajaCompletarPais.style.display = "block";
        // <select> restringido a LISTA_PAISES (ver paises.js) — nunca texto libre.
        if (typeof renderizarSelectorPais === "function") {
            renderizarSelectorPais(document.getElementById("campoPaisPerfil"), "");
        }
    }

    // Lengua materna: SIEMPRE editable (por si alguien habla un
    // dialecto). Solo se muestra cuando ya hay país (guardado o recién
    // elegido); si el país todavía falta, aparece al elegirlo.
    const grupoLengua = document.getElementById("grupoLenguaMaternaPerfil");
    document.getElementById("campoLenguaMaternaPerfil").value = datos.lenguaMaterna || "";
    grupoLengua.style.display = datos.pais ? "" : "none";

    // Si todavía falta elegir país, al elegirlo aparece la lengua
    // materna y se pre-llena con el idioma de ese país (capitalizado).
    if (!datos.pais && typeof activarAutocompletadoIdioma === "function") {
        activarAutocompletadoIdioma(
            document.getElementById("campoPaisPerfil"),
            document.getElementById("campoLenguaMaternaPerfil"),
            grupoLengua
        );
    }

    // "Datos de perfil" viene colapsado; si a esta cuenta le falta
    // algún dato de una sola vez por completar (edad/género/país), se
    // abre solo para que lo vea.
    const detallesDatos = document.getElementById("detallesDatosPerfil");
    if (detallesDatos) {
        const faltaAlgo = typeof datos.edadPerfil !== "number" || !datos.genero || !datos.pais;
        detallesDatos.open = faltaAlgo;
    }

    // Géneros: se cargan aparte (con "Cargando…") para no dejar el resto
    // del formulario esperando a que termine esta consulta.
    const contGeneros = document.getElementById("contenedorGenerosPerfil");
    if (contGeneros) {
        contGeneros.innerHTML = "<p style='color:#888; font-size:13px; margin:0;'>Cargando géneros…</p>";
        cargarGenerosLectura()
            .then(() => renderizarCheckboxesGeneros(contGeneros, datos.generosLectura || []))
            .catch(error => {
                console.error("No se pudieron cargar los géneros de lectura:", error);
                contGeneros.innerHTML = "<p style='color:#c0392b; font-size:13px; margin:0;'>No se pudieron cargar los géneros ahora. Recarga la página para intentarlo de nuevo.</p>";
            });
    }

}

document.getElementById("btnGuardarPerfil").addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return;

    const nombre = document.getElementById("campoNombrePerfil").value.trim();
    const alias = document.getElementById("campoAliasPerfil").value.trim();
    const mostrarAlias = document.querySelector('input[name="mostrarComo"]:checked').value === "alias";

    const errorEl = document.getElementById("errorPerfil");
    const mensajeEl = document.getElementById("mensajePerfil");
    const btn = document.getElementById("btnGuardarPerfil");

    errorEl.style.display = "none";
    mensajeEl.textContent = "";

    if (!nombre) {
        errorEl.textContent = "El nombre no puede quedar vacío.";
        errorEl.style.display = "block";
        return;
    }

    if (mostrarAlias && !alias) {
        errorEl.textContent = "Escribe un alias, o elige mostrar tu nombre en su lugar.";
        errorEl.style.display = "block";
        return;
    }

    btn.disabled = true;

    try {

        // El alias no se puede repetir entre cuentas (comparación exacta,
        // caracter por caracter, incluyendo tildes y mayúsculas).
        if (alias) {

            const choque = await db.collection("usuarios")
                .where("alias", "==", alias)
                .get();

            const ocupadoPorOtro = choque.docs.some(doc => doc.id !== user.uid);

            if (ocupadoPorOtro) {
                errorEl.textContent = "Ese alias ya está ocupado, intenta con otro.";
                errorEl.style.display = "block";
                btn.disabled = false;
                return;
            }

        }

        // La edad, el género y el país NO se reenvían si YA estaban
        // guardados — esta pantalla no los deja editar una vez que
        // existen (ver la nota al inicio del archivo). La lengua materna
        // SÍ se puede editar siempre (dialectos). Solo se incluyen en
        // "cambios" los datos de una sola vez si de verdad faltaban Y el
        // usuario los completó ahora.
        const cambios = {
            nombre: nombre,
            mostrarAlias: mostrarAlias,
            generosLectura: leerGenerosSeleccionados(document.getElementById("contenedorGenerosPerfil"))
        };

        if (!_datosPerfilActual.pais) {
            const paisElegido = document.getElementById("campoPaisPerfil").value.trim();
            if (paisElegido) cambios.pais = paisElegido;
        }

        // Lengua materna: siempre editable, se guarda con la primera
        // letra en mayúscula ("español" -> "Español").
        const lengua = (typeof capitalizarLengua === "function")
            ? capitalizarLengua(document.getElementById("campoLenguaMaternaPerfil").value)
            : document.getElementById("campoLenguaMaternaPerfil").value.trim();
        if (lengua) cambios.lenguaMaterna = lengua;

        if (typeof _datosPerfilActual.edadPerfil !== "number") {
            const fechaNacimiento = document.getElementById("campoFechaNacimientoPerfil").value;
            if (fechaNacimiento) {
                cambios.fechaNacimiento = fechaNacimiento;
                cambios.edadPerfil = calcularEdadDesdeFecha(fechaNacimiento);
            }
        }

        if (!_datosPerfilActual.genero) {
            const generoElegido = document.querySelector('input[name="generoPerfilNuevo"]:checked');
            if (generoElegido) {
                cambios.genero = generoElegido.value;
            }
        }

        cambios.alias = alias ? alias : firebase.firestore.FieldValue.delete();

        await db.collection("usuarios").doc(user.uid).update(cambios);

        // Refleja el cambio de inmediato en el ranking personal.
        if (typeof actualizarRankingPersonal === "function") {
            await actualizarRankingPersonal();
        }

        mensajeEl.textContent = "¡Perfil actualizado!";

    } catch (error) {
        console.error("No se pudo guardar tu perfil:", error);
        mensajeEl.textContent = "Ocurrió un error al guardar. Intenta de nuevo.";
    }

    btn.disabled = false;

});

auth.onAuthStateChanged((user) => {
    if (user) cargarPerfil();
});


// ==========================================================
// ELIMINAR MI CUENTA
// ==========================================================
// Llama a la Cloud Function eliminarMiCuenta (Admin SDK): borra los
// datos personales, anonimiza el progreso y deja las lecturas
// publicadas como "Usuario eliminado" (ver functions/lib/eliminarMiCuenta.js).
const btnEliminarCuenta = document.getElementById("btnEliminarCuenta");
if (btnEliminarCuenta) {
    btnEliminarCuenta.addEventListener("click", async () => {

        const mensaje = document.getElementById("mensajeEliminarCuenta");
        mensaje.textContent = "";
        mensaje.style.color = "#c0392b";

        if (!confirm(
            "¿Eliminar tu cuenta para siempre?\n\n" +
            "Se borrarán tu perfil, tus puntos, tu racha, tus premios y tus propuestas. " +
            "Esta acción NO se puede deshacer."
        )) return;

        const texto = prompt('Para confirmar, escribe: ELIMINAR');
        if ((texto || "").trim().toUpperCase() !== "ELIMINAR") {
            mensaje.textContent = "No se eliminó nada.";
            return;
        }

        btnEliminarCuenta.disabled = true;
        btnEliminarCuenta.textContent = "Eliminando…";

        try {
            const llamar = firebase.functions().httpsCallable("eliminarMiCuenta");
            await llamar({});
            alert("Tu cuenta fue eliminada. ¡Gracias por haber participado!");
            try { await auth.signOut(); } catch (e) { /* ignora */ }
            window.location.href = "index.html";
        } catch (error) {
            console.error("No se pudo eliminar la cuenta:", error);
            mensaje.textContent = "No se pudo eliminar la cuenta. Intenta de nuevo en un momento.";
            btnEliminarCuenta.disabled = false;
            btnEliminarCuenta.textContent = "Eliminar mi cuenta para siempre";
        }
    });
}
