// ==========================================================
// ADMINISTRADORES
// ==========================================================
// Antes había un solo correo hardcodeado (EMAIL_ADMIN) repetido en el
// código y en firestore.rules. Ahora los administradores viven en la
// colección "administradores" de Firestore (un documento por correo,
// usando el correo mismo como ID), así se pueden agregar o quitar
// desde la app sin tocar código ni volver a desplegar nada.
//
// El administrador PRINCIPAL (campo esPrincipal: true) no se puede
// eliminar ni degradar desde la app — ni por otro administrador ni
// por sí mismo — ni desde la interfaz (ver abrirFormularioAdministradores
// en admin.js, que no le muestra el botón de eliminar) ni desde
// Firestore (ver firestore.rules).
//
// Este archivo se incluye en TODAS las páginas que necesitan saber si
// el usuario actual es administrador: antes eso lo resolvían admin.js
// y, por separado, menu.js con su propia copia duplicada de la
// constante — ahora ambos (y cualquier otro archivo) reusan esAdmin()
// de aquí.
// ==========================================================

let ADMINISTRADORES = [];
let _promesaAdministradores = null;

/**
 * Trae la lista completa de administradores desde Firestore y la
 * guarda en ADMINISTRADORES. Solo hace la consulta una vez (la
 * cachea, igual que cargarCatalogoLecturas en lecturas.js); pasa
 * "true" para forzar traerla de nuevo (por ejemplo, después de
 * agregar o quitar un administrador desde el panel).
 */
function cargarAdministradores(forzarRecarga) {

    if (_promesaAdministradores && !forzarRecarga) {
        return _promesaAdministradores;
    }

    _promesaAdministradores = db.collection("administradores")
        .get()
        .then(snapshot => {
            ADMINISTRADORES = snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));
            return ADMINISTRADORES;
        })
        .catch(error => {
            console.error("No se pudo cargar la lista de administradores:", error);
            ADMINISTRADORES = [];
            return ADMINISTRADORES;
        });

    return _promesaAdministradores;

}

// Se dispara sola apenas carga este script, para que la lista ya esté
// lista (o casi) para cuando algo la necesite, sin bloquear ni
// retrasar el resto de la página. Los lugares donde el resultado SÍ
// importa para decidir qué mostrar (inicio.js, motor.js, mejora.js,
// motor-mejorar.js, menu.js) además hacen su propio
// "await cargarAdministradores()" antes de revisar esAdmin(), así
// nunca hay una carrera de datos con este disparo automático.
cargarAdministradores();

/**
 * ¿El usuario que inició sesión es administrador? Se basa en la copia
 * en memoria de ADMINISTRADORES — si se llama antes de que
 * cargarAdministradores() haya terminado, devuelve false aunque la
 * cuenta sí sea admin (por eso los puntos de entrada de cada página
 * esperan esa promesa antes de decidir qué pintar).
 */
function esAdmin() {
    const correo = auth.currentUser && auth.currentUser.email;
    return !!(correo && ADMINISTRADORES.some(admin => admin.email === correo));
}
