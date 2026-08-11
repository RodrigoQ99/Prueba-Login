// ==========================================================
// CATÁLOGO DE LECTURAS
// ==========================================================
// Lista central de TODAS las lecturas que existen en la plataforma.
// Se usa para calcular "lecturas completadas / pendientes" en el menú.
//
// Cuando agregues una nueva lectura (ej. nivel intermedio o difícil),
// agrégala aquí también con su mismo LECTURA_ID que uses en su script.js.
// ==========================================================

const CATALOGO_LECTURAS = [
    {
        id: "importancia-de-la-lectura",
        titulo: "La importancia de la lectura",
        nivel: "facil",
        archivo: "index.html"
    }
    // Ejemplo de cómo se vería al agregar más:
    // {
    //     id: "otra-lectura-id",
    //     titulo: "Nombre de la lectura",
    //     nivel: "intermedio",
    //     archivo: "lectura-intermedia-1.html"
    // }
];
