// ==========================================================
// NIVELES DE LECTURA (Etapa 37)
// ==========================================================
// Los cinco niveles con los que se clasifica a un lector, según su
// velocidad (palabras por minuto) y su comprensión (% de aciertos en
// el cuestionario). Los usa el registro (para que el usuario declare su
// nivel si lo sabe) y el test de ubicación (para calcularlo, ver
// test-nivel.js).
//
// OJO — este nivel del LECTOR no tiene nada que ver con el nivel de una
// LECTURA (fácil/intermedio/dificil, ver lecturas.js) ni con la edad de
// "Mejorar la lectura": por ahora es solo informativo, se muestra en el
// perfil y en las estadísticas, y NO decide qué contenido ve nadie.
//
// CUANDO VELOCIDAD Y COMPRENSIÓN NO COINCIDEN se toma SIEMPRE EL MÁS
// BAJO de los dos: alguien que lee muy rápido pero entendió poco no es
// un lector avanzado, es alguien que necesita bajar el ritmo. Ver
// calcularNivelLectura().
// ==========================================================

const NIVELES_LECTURA = [
    {
        nivel: 1,
        nombre: "Inicial",
        ppmMin: 60,  ppmMax: 99,
        compMin: 0,  compMax: 59,
        descripcion: "Lee lentamente y presenta dificultades para comprender las ideas principales."
    },
    {
        nivel: 2,
        nombre: "Básico",
        ppmMin: 100, ppmMax: 139,
        compMin: 60, compMax: 69,
        descripcion: "Comprende información explícita, pero puede perder detalles o relaciones entre ideas."
    },
    {
        nivel: 3,
        nombre: "Intermedio",
        ppmMin: 140, ppmMax: 179,
        compMin: 70, compMax: 79,
        descripcion: "Mantiene una velocidad adecuada y comprende las ideas principales y buena parte de los detalles."
    },
    {
        nivel: 4,
        nombre: "Avanzado",
        ppmMin: 180, ppmMax: 219,
        compMin: 80, compMax: 89,
        descripcion: "Lee con fluidez y comprende tanto información explícita como algunas inferencias."
    },
    {
        nivel: 5,
        nombre: "Superior",
        ppmMin: 220, ppmMax: Infinity,
        compMin: 90, compMax: 100,
        descripcion: "Lee con alta fluidez, comprende profundamente y puede realizar inferencias y relacionar ideas."
    }
];

function nivelPorPpm(ppm) {
    if (typeof ppm !== "number" || !isFinite(ppm)) return 1;
    const encontrado = NIVELES_LECTURA.find(n => ppm >= n.ppmMin && ppm <= n.ppmMax);
    // Por debajo del mínimo de la tabla (menos de 60 ppm) también es nivel 1.
    return encontrado ? encontrado.nivel : (ppm < NIVELES_LECTURA[0].ppmMin ? 1 : 5);
}

function nivelPorComprension(porcentaje) {
    if (typeof porcentaje !== "number" || !isFinite(porcentaje)) return 1;
    const encontrado = NIVELES_LECTURA.find(n => porcentaje >= n.compMin && porcentaje <= n.compMax);
    return encontrado ? encontrado.nivel : 1;
}

/**
 * Nivel final del lector: el MÁS BAJO entre el que le da su velocidad y
 * el que le da su comprensión (ver la nota de arriba).
 * Devuelve el objeto completo del nivel, más el desglose de cómo salió.
 */
function calcularNivelLectura(ppm, porcentajeComprension) {

    const porVelocidad = nivelPorPpm(ppm);
    const porComprension = nivelPorComprension(porcentajeComprension);
    const nivelFinal = Math.min(porVelocidad, porComprension);

    return {
        ...obtenerNivelLectura(nivelFinal),
        ppm: Math.round(ppm),
        comprension: Math.round(porcentajeComprension),
        nivelPorVelocidad: porVelocidad,
        nivelPorComprension: porComprension
    };

}

function obtenerNivelLectura(nivel) {
    return NIVELES_LECTURA.find(n => n.nivel === nivel) || NIVELES_LECTURA[0];
}
