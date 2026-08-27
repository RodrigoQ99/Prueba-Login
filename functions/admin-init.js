// ==========================================================
// INICIALIZACIÓN DEL ADMIN SDK (Firestore)
// ==========================================================
// Un solo lugar que inicializa firebase-admin y expone la instancia de
// Firestore — la usan verificarAdmin.js y cualquier función que
// necesite leer la base de datos con el Admin SDK (acceso total, no
// pasa por firestore.rules). Separado de index.js para que se pueda
// importar desde functions/lib/ sin depender del orden de carga de
// index.js.
// ==========================================================

const admin = require("firebase-admin");

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

module.exports = { admin, db };
