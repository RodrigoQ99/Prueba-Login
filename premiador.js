// ==========================================================
// PÁGINA "PREMIADOR"
// ==========================================================
// Página independiente (no comparte auth.js con el resto del sitio)
// para el personal del mostrador: inicia sesión con una cuenta de
// Google autorizada (ver configuracion/premiadores, editable desde el
// panel de administrador) y desde aquí puede canjear el código de
// 6 dígitos de un premio y ver cuántos se han canjeado en total.
// ==========================================================

const pantallaLoginPremiador = document.getElementById("pantallaLoginPremiador");
const pantallaSinPermiso = document.getElementById("pantallaSinPermiso");
const contenedorPremiador = document.getElementById("contenedorPremiador");

document.getElementById("btnLoginGooglePremiador").addEventListener("click", () => {
    const proveedor = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(proveedor).catch(error => {
        console.error("Error al iniciar sesión:", error);
        alert("No se pudo iniciar sesión. Intenta de nuevo.");
    });
});

document.getElementById("btnCerrarSesionPremiador").addEventListener("click", () => auth.signOut());
document.getElementById("btnCerrarSesionPremiadorActivo").addEventListener("click", () => auth.signOut());


// ==========================
// LOGIN Y VERIFICACIÓN DE PERMISO
// ==========================

auth.onAuthStateChanged(async (user) => {

    pantallaLoginPremiador.style.display = "none";
    pantallaSinPermiso.style.display = "none";
    contenedorPremiador.style.display = "none";

    if (!user) {
        pantallaLoginPremiador.style.display = "flex";
        return;
    }

    let autorizado = false;

    try {
        const doc = await db.collection("configuracion").doc("premiadores").get();
        const emails = (doc.exists && doc.data().emails) || [];
        autorizado = emails.includes(user.email);
    } catch (error) {
        console.error("No se pudo verificar el permiso:", error);
    }

    if (!autorizado) {
        pantallaSinPermiso.style.display = "flex";
        return;
    }

    contenedorPremiador.style.display = "block";
    cargarResumenPremiador();

});


// ==========================
// CANJEAR UN CÓDIGO
// ==========================

document.getElementById("formCanjear").addEventListener("submit", async (e) => {

    e.preventDefault();

    const campo = document.getElementById("inputCodigo");
    const codigo = campo.value.trim();
    const resultado = document.getElementById("resultadoCanje");

    resultado.className = "";
    resultado.style.color = "";
    resultado.style.fontWeight = "";

    if (!/^\d{6}$/.test(codigo)) {
        resultado.textContent = "El código debe tener 6 dígitos.";
        resultado.className = "errorTexto";
        resultado.style.display = "block";
        return;
    }

    try {

        const snapshot = await db.collection("premios")
            .where("codigo", "==", codigo)
            .limit(1)
            .get();

        if (snapshot.empty) {
            resultado.textContent = "No se encontró ningún premio con ese código.";
            resultado.className = "errorTexto";
            resultado.style.display = "block";
            return;
        }

        const doc = snapshot.docs[0];
        const premio = doc.data();

        if (premio.canjeado) {
            resultado.textContent = `Este código ya había sido canjeado (${premio.descripcionPremio}).`;
            resultado.className = "errorTexto";
            resultado.style.display = "block";
            return;
        }

        await doc.ref.update({
            canjeado: true,
            canjeadoPor: auth.currentUser.email,
            fechaCanjeado: firebase.firestore.FieldValue.serverTimestamp()
        });

        resultado.textContent = `✅ Canjeado: ${premio.descripcionPremio}`;
        resultado.style.color = "#2e9e5b";
        resultado.style.fontWeight = "700";
        resultado.style.display = "block";

        campo.value = "";
        cargarResumenPremiador();

    } catch (error) {
        console.error("No se pudo canjear el código:", error);
        resultado.textContent = "No se pudo canjear el código. Intenta de nuevo.";
        resultado.className = "errorTexto";
        resultado.style.display = "block";
    }

});


// ==========================
// RESUMEN: CUÁNTOS SE HAN CANJEADO POR PREMIO
// ==========================

async function cargarResumenPremiador() {

    const contenedor = document.getElementById("resumenPremiador");
    contenedor.innerHTML = "<p style='text-align:center;'>Cargando...</p>";

    try {

        const snapshot = await db.collection("premios")
            .where("canjeado", "==", true)
            .get();

        const conteos = {};

        snapshot.forEach(doc => {
            const descripcion = doc.data().descripcionPremio || "Premio";
            conteos[descripcion] = (conteos[descripcion] || 0) + 1;
        });

        const entradas = Object.entries(conteos).sort((a, b) => b[1] - a[1]);

        if (entradas.length === 0) {
            contenedor.innerHTML = "<p style='text-align:center;'>Todavía no se ha canjeado ningún premio.</p>";
            return;
        }

        contenedor.innerHTML = entradas.map(([nombre, total]) => `
            <div class="menuStat">
                <span>${nombre}</span>
                <strong>${total} canjeados</strong>
            </div>
        `).join("");

    } catch (error) {
        console.error("No se pudo cargar el resumen:", error);
        contenedor.innerHTML = "<p style='text-align:center;'>No se pudo cargar el resumen.</p>";
    }

}
