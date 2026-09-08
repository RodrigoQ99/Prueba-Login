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


// ==========================================================
// BANCO DE PREGUNTAS: ELEGIR AL AZAR
// ==========================================================
// Dado un banco de preguntas (ej. 10) y cuántas mostrar (ej. 3),
// devuelve esa cantidad elegida al azar. Cada usuario ve una
// combinación distinta, así que es más difícil copiarse entre ellos.
//
// Vive AQUÍ (y no en admin.js, donde estaba antes) porque no es
// exclusivo del panel de administrador: motor.js y motor-mejorar.js
// también la necesitan para armar el cuestionario de cada participante,
// y esas páginas nunca cargan admin.js. Tenerla solo en admin.js hacía
// que, apenas alguien abría una lectura real, "elegirPreguntasAlAzar"
// no existiera ahí — la función tronaba en silencio (Firefox/Chrome
// solo lo muestran en la consola) y por eso nunca corría el cronómetro,
// nunca aparecía el cuestionario, y como el texto tampoco alcanzaba a
// engancharse al scroll bloqueado, quedaba con navegación libre.
//
// BALANCE POR TIPO (Etapa 36): el banco ahora es multitipo (N preguntas
// de cada uno de los cinco tipos, ver cantidadPreguntas.js), así que
// elegir "4 al azar" a secas podía darle a alguien las 4 del mismo
// tipo. Se reparte por rondas: en cada ronda se toma como máximo UNA
// pregunta de cada tipo (en orden de tipos revuelto), y solo cuando ya
// tocó a todos los tipos se empieza otra ronda. Así, con 4 preguntas
// salen 4 tipos distintos, con 8 salen los 5 tipos + 3 repetidos.
function barajar(arreglo) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function elegirPreguntasAlAzar(banco, cantidad) {

    const todas = barajar(banco || []);
    const n = Math.min(cantidad || todas.length, todas.length);
    if (n === 0) return [];

    // Agrupar por tipo (una pregunta sin "tipo" es de opción múltiple,
    // igual que en el resto del proyecto).
    const porTipo = {};
    todas.forEach(pregunta => {
        const tipo = pregunta.tipo || "opcionMultiple";
        if (!porTipo[tipo]) porTipo[tipo] = [];
        porTipo[tipo].push(pregunta);
    });

    const elegidas = [];

    // Rondas: en cada una se recorre cada tipo (en orden distinto cada
    // vez) tomando una pregunta suya, hasta llegar a la cantidad pedida.
    while (elegidas.length < n) {

        const tiposConStock = barajar(Object.keys(porTipo).filter(t => porTipo[t].length > 0));
        if (tiposConStock.length === 0) break;

        for (const tipo of tiposConStock) {
            if (elegidas.length >= n) break;
            elegidas.push(porTipo[tipo].shift());
        }

    }

    // Se vuelven a revolver para que el cuestionario no salga siempre
    // en el mismo orden de tipos (opción múltiple, luego V/F, etc.).
    return barajar(elegidas);

}


// ==========================================================
// OPCIÓN MÚLTIPLE: ARMAR LAS OPCIONES DEL MOMENTO (Etapa 36)
// ==========================================================
// Las preguntas nuevas guardan la respuesta correcta y un BANCO de
// distractores; las opciones que ve el usuario se arman al vuelo:
// la correcta + unos distractores al azar, todo revuelto. Así dos
// usuarios con la misma pregunta pueden ver opciones distintas.
//
// Las preguntas VIEJAS (con "opciones" fijas y "correcta" como valor)
// se siguen respetando tal cual — no hay migración de datos.
//
// Devuelve siempre { opciones: [{ texto, valor }], correcta } con la
// misma forma que ya usaban motor.js y compañía.
const OPCIONES_A_MOSTRAR_CUESTIONARIO = 4;

function armarOpcionesOpcionMultiple(pregunta) {

    // Formato viejo: ya trae sus opciones fijas.
    if (Array.isArray(pregunta.opciones) && pregunta.opciones.length > 0) {
        return { opciones: pregunta.opciones, correcta: pregunta.correcta };
    }

    const distractores = Array.isArray(pregunta.distractores) ? pregunta.distractores : [];
    const cuantosDistractores = Math.max(0, OPCIONES_A_MOSTRAR_CUESTIONARIO - 1);

    const textos = barajar([
        pregunta.respuestaCorrecta,
        ...barajar(distractores).slice(0, cuantosDistractores)
    ].filter(t => typeof t === "string" && t.trim().length > 0));

    const letras = "abcdefghij";
    const opciones = textos.map((texto, i) => ({ texto, valor: letras[i] || `x${i}` }));
    const correcta = (opciones.find(o => o.texto === pregunta.respuestaCorrecta) || {}).valor || "";

    return { opciones, correcta };

}
