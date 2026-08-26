// ==========================================================
// SUGERENCIAS (dentro de "Lecturas" — ver lecturas.html)
// ==========================================================
// Lecturas de otros usuarios ("Ser el protagonista de la historia",
// ver protagonista.js) que coinciden con los géneros de interés
// marcados en el perfil. A diferencia de "Lecturas premiadas", NO
// importa si el usuario tiene o no el código: se muestran TODAS las
// que coincidan con sus géneros favoritos (aunque también tenga
// código para alguna — en ese caso aparece en ambos apartados, cada
// uno con su propio comportamiento). Se abren en lectura-libre.html:
// sin cronómetro, sin puntos, a su propio ritmo.
//
// Se movió aquí desde inicio.js cuando index.html pasó a ser Inicio
// (ver Etapa 18) — mismo comportamiento de siempre (Etapa 15).
// ==========================================================

async function cargarSugerenciasGenero(user) {

    const contenedor = document.getElementById("listaSugerenciasGenero");
    if (!contenedor) return;

    let generosUsuario = [];

    try {
        const usuarioDoc = await db.collection("usuarios").doc(user.uid).get();
        generosUsuario = (usuarioDoc.exists && usuarioDoc.data().generosLectura) || [];
    } catch (error) {
        console.error("No se pudieron cargar tus géneros de interés:", error);
    }

    if (generosUsuario.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>Marca tus géneros favoritos " +
            "en \"Perfil\" para ver sugerencias aquí.</p>";
        return;
    }

    // Firestore solo permite hasta 10 valores en un "in" — si el usuario
    // marcó más géneros que eso, se usan los primeros 10.
    const generosConsulta = generosUsuario.slice(0, 10);

    let lecturasSugeridas = [];

    try {
        const snapshot = await db.collection("lecturas")
            .where("genero", "in", generosConsulta)
            .get();
        lecturasSugeridas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("No se pudieron cargar las sugerencias:", error);
        contenedor.innerHTML = "<p style='text-align:center; color:var(--texto-suave);'>No se pudieron cargar las sugerencias.</p>";
        return;
    }

    if (lecturasSugeridas.length === 0) {
        contenedor.innerHTML =
            "<p style='text-align:center; color:var(--texto-suave);'>Todavía no hay lecturas de tus géneros favoritos. ¡Vuelve pronto!</p>";
        return;
    }

    const porGenero = {};
    lecturasSugeridas.forEach(lectura => {
        if (!porGenero[lectura.genero]) porGenero[lectura.genero] = [];
        porGenero[lectura.genero].push(lectura);
    });

    contenedor.innerHTML = Object.keys(porGenero).sort().map(genero => `
        <details class="grupoNivelAdmin">
            <summary>${genero} (${porGenero[genero].length})</summary>
            <div class="listaAdminLecturasNivel">
                ${porGenero[genero].map(lectura => `
                    <a href="lectura-libre.html?id=${encodeURIComponent(lectura.id)}" class="tarjetaLectura">
                        <div class="tarjetaInfo">
                            <p class="tarjetaTitulo">${lectura.titulo}</p>
                            <p class="tarjetaNivel">Por ${lectura.autorNombre || "un usuario"}</p>
                        </div>
                        <span class="tarjetaEstado">Leer →</span>
                    </a>
                `).join("")}
            </div>
        </details>
    `).join("");

}

auth.onAuthStateChanged((user) => {

    if (!user) {
        document.getElementById("listaSugerenciasGenero").innerHTML =
            "<p style='text-align:center;'>Inicia sesión desde la página principal para ver sugerencias.</p>";
        return;
    }

    cargarSugerenciasGenero(user);

});
