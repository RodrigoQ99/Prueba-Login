// ==========================================================
// SALUDO DEL AJOLOTE — burbuja tipo Minecraft splash text
// ==========================================================
// Muestra un ajolote (imagen) en la esquina inferior izquierda con un
// globo de texto aleatorio. El saludo cambia solo al recargar la página.
//
// ANTES de iniciar sesión: saludos genéricos, divertidos, y empujones
// sarcásticos para que inicies sesión.
//
// DESPUÉS de iniciar sesión: saludos personalizados con el nombre o
// alias del usuario, más saludos contextuales (racha, puntos, etc.).
// ==========================================================

(function () {

    // ==============================================================
    //  SALUDOS — SIN SESIÓN (divertidos + sarcásticos + "inicia ya")
    // ==============================================================
    const SALUDOS_SIN_SESION = [
        // Saludos normales
        "¡Hola! 🌊",
        "¡Hey, qué onda! 👋",
        "¡Holi! ✨",
        "¡Buenas buenas!",
        "¡Hola, humano! 🐟",
        "¡Bienvenido! 🫧",
        "¡Aloha! 🌺",
        "¡Yooo! 😄",

        // Empujones divertidos para iniciar sesión
        "Psst... ¿no vas a iniciar sesión? 🤨",
        "¿Y tu sesión? ¿Se la comió el gato? 🐱",
        "Estoy aquí solito... inicia sesión 😢",
        "¿Vas a entrar o solo a mirar? 👀",
        "Dale click al botón, no muerde 😏",
        "Inicia sesión, prometo no juzgarte 🤞",
        "¿Sesión? ¿Alguien? ¿Hola? 📢",
        "Sin sesión no hay diversión 🎭",
        "Te estoy esperando... ⏳",
        "¡Entra ya! Los libros no se leen solos 📖",
        "¿Te da miedo el botón de Google? 😂",
        "Soy un ajolote paciente... pero no tanto 🙃",
        "¿Todavía pensándolo? Yo ya leí 3 libros 📚",
        "Click. Sesión. Leer. Así de fácil 💅",
        "¡No seas tímido! Inicia sesión 🫣",
        "El botón de Google te espera con ansias 💙",
        "Un ajolote nunca inicia sesión... pero tú sí puedes 🦎",
        "Sin cuenta no hay cuento 📕",
        "¿Y si inicias sesión? Solo digo... 🤷",
        "Error 404: sesión no encontrada 🤖",
        "Aquí esperando como ajolote en pecera... 🫧",
        "¡Toc toc! ¿Hay alguien? ¡Inicia sesión! 🚪",
        "Los libros me dijeron que te esperara aquí 📖",
    ];

    // ==============================================================
    //  SALUDOS — CON SESIÓN: GENÉRICOS (sin nombre)
    // ==============================================================
    const SALUDOS_GENERICOS = [
        "¡Hola! 🌊",
        "¡Hey, qué onda! 👋",
        "¡Holi! ✨",
        "¡Buenas buenas! 🐟",
        "¡Quihúbo! 😄",
        "¡Yooo! 🫧",
        "¡Hellou! 💜",
        "¡Buen día! 🌺",
        "¡Blup blup! 🫧",
        "¡Splash! 🌊",
        "¡Leer es un superpoder! 💪",
        "¡Los libros son tesoros! 💎",
        "¡Qué bonito día para leer! ☀️",
        "¡Cada página cuenta! 📄",
        "¡Sigue nadando! 🐟",
        "¡Lee y sé libre! 🦋",
        "¡La aventura te espera! 🗺️",
        "¡Bubujeo de la emoción! 🫧",
        "¡Glub glub! 🩷",
        "¡Ñam ñam, libros! 📚",
        "¿Ya desayunaste? 🥞",
        "¿Dormiste bien? 😴",
        "¿Traes buena vibra? ✌️",
        "¿Qué tal tu día? 😊",
        "¿Todo bien por ahí? 🐠",
    ];

    // ==============================================================
    //  SALUDOS — CON SESIÓN: PERSONALIZADOS (usan NOMBRE)
    // ==============================================================
    const SALUDOS_CON_NOMBRE = [
        "¡Hola, NOMBRE! 🌊",
        "¡Bienvenido, NOMBRE! ✨",
        "¡Hey, NOMBRE! 👋",
        "¡Qué onda, NOMBRE! 😄",
        "¡NOMBRE, qué gusto verte!",
        "¡Holi, NOMBRE! 💜",
        "¡Buenas, NOMBRE! 🐟",
        "¡NOMBRE! ¡Hola! 🫧",
        "¡Aloha, NOMBRE! 🌺",
        "¡Buen día, NOMBRE!",
        "¡NOMBRE, bienvenido de vuelta!",
        "¡Yooo, NOMBRE! 🎉",
        "¡Hellou, NOMBRE! 🫧",
        "¿Cómo estás, NOMBRE? 😊",
        "¿Qué tal tu día, NOMBRE?",
        "¿Todo bien, NOMBRE? 🐠",
        "¿Ya leíste hoy, NOMBRE? 📖",
        "¿Listo para leer, NOMBRE? 📚",
        "¿Cómo va todo, NOMBRE?",
        "¿Qué cuentas, NOMBRE? 🤔",
        "¿Ya desayunaste, NOMBRE? 🥞",
        "¿Dormiste bien, NOMBRE? 😴",
        "¿Traes buena vibra, NOMBRE? ✌️",
        "¡NOMBRE, tú puedes con todo! 💪",
        "¡Hoy es tu día, NOMBRE! ☀️",
        "¡NOMBRE, leer es un superpoder!",
        "¡Los ajolotes te apoyamos, NOMBRE! 🩷",
        "¡NOMBRE, eres increíble! ⭐",
        "¡No te rindas nunca, NOMBRE!",
        "¡Eres mi humano favorito, NOMBRE! 🩷",
        "¡Pssst... hola, NOMBRE! 🤫",
        "¡Me alegra verte, NOMBRE! 🥰",
        "¡NOMBRE, eres genial!",
        "¡Feliz lectura, NOMBRE! 🎉",
        "¡Glub glub, NOMBRE! 🩷",
        "¡Vamos a leer juntos, NOMBRE!",
        "¡La aventura te espera, NOMBRE! 🗺️",
        "¡NOMBRE, hoy leemos con ganas! 💥",
        "¡NOMBRE, bubujeo de la emoción! 🫧",
    ];

    // ==============================================================
    //  SALUDOS — CON SESIÓN: CONTEXTUALES (racha, actividad, etc.)
    //  Se generan dinámicamente según los datos del usuario.
    // ==============================================================
    function saludosContextuales(nombre, datos) {
        const ctx = [];
        if (!datos) return ctx;

        // ── Racha ──────────────────────────────────────────────
        const racha = typeof calcularRachaVigente === "function"
            ? calcularRachaVigente(datos)
            : (datos.rachaActual || 0);

        if (racha === 0) {
            // No tiene racha activa → motivar
            ctx.push(
                nombre ? `¡${nombre}, empieza tu racha hoy! 🔥` : "¡Empieza tu racha hoy! 🔥",
                nombre ? `¡${nombre}, lee algo y prende la llama! 🔥` : "¡Lee algo y prende la llama! 🔥",
                nombre ? `${nombre}, ¡tu racha te extraña! 🥺🔥` : "¡Tu racha te extraña! 🥺🔥",
                "¡No dejes que la racha se apague! 🔥",
                "Un ajolote sin racha es un ajolote triste 😢🔥",
            );
        } else if (racha >= 1 && racha <= 3) {
            ctx.push(
                nombre ? `¡${nombre}, racha de ${racha}! ¡No la pierdas! 🔥` : `¡Racha de ${racha}! ¡No la pierdas! 🔥`,
                nombre ? `¡Vas bien, ${nombre}! ${racha} días seguidos 🔥` : `¡Vas bien! ${racha} días seguidos 🔥`,
                "¡La racha apenas empieza! No pares 🔥",
            );
        } else if (racha > 3) {
            ctx.push(
                nombre ? `¡WOW ${nombre}! Racha de ${racha} 🔥🔥🔥` : `¡WOW! Racha de ${racha} 🔥🔥🔥`,
                nombre ? `${nombre}, ¡eres imparable! ${racha} días 🔥` : `¡Eres imparable! ${racha} días 🔥`,
                `¡${racha} días de racha! Eso es dedicación 💪🔥`,
                nombre ? `¡${nombre}, ni un ajolote es tan constante! 🦎🔥` : "¡Ni un ajolote es tan constante! 🦎🔥",
            );
        }

        // ── Lectura del día (hoy no ha leído) ─────────────────
        const ultimaAct = datos.rachaUltimaActividad;
        if (ultimaAct) {
            const msDesdeUltima = Date.now() - ultimaAct.toMillis();
            const horasDesdeUltima = msDesdeUltima / (60 * 60 * 1000);
            if (horasDesdeUltima > 12) {
                // Lleva más de 12h sin actividad → recordar
                ctx.push(
                    nombre ? `¡${nombre}, hoy no has leído! 📖` : "¡Hoy no has leído! 📖",
                    nombre ? `¡${nombre}, los libros te esperan! 📚` : "¡Los libros te esperan! 📚",
                    "¡No pierdas tu racha! Lee algo hoy 🔥📖",
                    "Los libros se sienten abandonados 😢📚",
                );
            }
        }

        // ── Puntos ─────────────────────────────────────────────
        const puntos = datos.puntosTotales || 0;
        if (puntos === 0) {
            ctx.push(
                nombre ? `¡${nombre}, gana tus primeros puntos! ⭐` : "¡Gana tus primeros puntos! ⭐",
                "¡Cero puntos! Hora de cambiar eso 💪",
            );
        } else if (puntos > 0 && puntos < 100) {
            ctx.push(
                nombre ? `¡${nombre}, ya llevas ${puntos} puntos! ⭐` : `¡Ya llevas ${puntos} puntos! ⭐`,
            );
        } else if (puntos >= 100) {
            ctx.push(
                nombre ? `¡${nombre}, ${puntos} puntos! ¡Eres crack! 🏆` : `¡${puntos} puntos! ¡Eres crack! 🏆`,
                `¡${puntos} puntos y sumando! 🚀`,
            );
        }

        return ctx;
    }

    // ==============================================================
    //  UTILIDADES
    // ==============================================================

    /** Elige un elemento aleatorio de un array */
    function aleatorio(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /** Genera el saludo para ANTES de iniciar sesión */
    function generarSaludoSinSesion() {
        return aleatorio(SALUDOS_SIN_SESION);
    }

    /** Genera el saludo para DESPUÉS de iniciar sesión */
    function generarSaludoConSesion(nombre, datos) {
        // Armar pool: 40% con nombre, 25% genéricos, 35% contextuales
        const pool = [];

        // Con nombre (si hay)
        if (nombre) {
            const conNombre = SALUDOS_CON_NOMBRE.map(s => s.replaceAll("NOMBRE", nombre));
            pool.push(...conNombre);
        }

        // Genéricos siempre
        pool.push(...SALUDOS_GENERICOS);

        // Contextuales (según datos del usuario)
        const ctx = saludosContextuales(nombre, datos);
        // Dar más peso a los contextuales duplicándolos
        pool.push(...ctx, ...ctx, ...ctx);

        return aleatorio(pool);
    }

    // ==============================================================
    //  CREAR / ACTUALIZAR EL WIDGET
    // ==============================================================

    function crearWidget(texto) {
        // Eliminar widget anterior si existe
        const anterior = document.getElementById("saludoAjolote");
        if (anterior) anterior.remove();

        const widget = document.createElement("div");
        widget.id = "saludoAjolote";
        widget.setAttribute("aria-label", "Saludo del ajolote");

        widget.innerHTML = `
            <img class="ajolote-img" src="ajolote.png" alt="Ajolote lector" draggable="false">
            <div class="ajolote-burbuja">${texto}</div>
        `;

        document.body.appendChild(widget);
    }

    // ==============================================================
    //  INYECTAR ESTILOS (una sola vez)
    // ==============================================================
    if (!document.getElementById("estilosAjolote")) {
        const estilos = document.createElement("style");
        estilos.id = "estilosAjolote";
        estilos.textContent = `

            #saludoAjolote {
                position: fixed;
                bottom: -30px;
                left: -10px;
                z-index: 900;
                pointer-events: none;
                animation: ajoloteEntrar 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }

            /* ── Imagen del ajolote ── */
            .ajolote-img {
                width: 240px;
                height: 240px;
                object-fit: contain;
                filter: drop-shadow(0 2px 6px rgba(0,0,0,0.12));
                animation: ajoloteRebote 2.5s ease-in-out infinite;
                pointer-events: none;
                cursor: default;
                display: block;
            }

            /* ── Burbuja de texto ── */
            .ajolote-burbuja {
                position: absolute;
                top: 20px;
                left: 150px;
                background: #fff;
                color: #1c1f26;
                font-size: 13px;
                font-weight: 600;
                padding: 8px 14px;
                border-radius: 16px 16px 16px 4px;
                box-shadow: 0 3px 12px rgba(0,0,0,0.10);
                max-width: 200px;
                width: max-content;
                line-height: 1.35;
                pointer-events: none;
                cursor: default;
                animation: ajoloteBurbujaFloat 3s ease-in-out infinite;
            }

            /* ── Animación de entrada ── */
            @keyframes ajoloteEntrar {
                0% {
                    opacity: 0;
                    transform: translateY(40px) scale(0.7);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            /* ── Rebote suave del ajolote ── */
            @keyframes ajoloteRebote {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }

            /* ── Flotación suave de la burbuja ── */
            @keyframes ajoloteBurbujaFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
            }

            /* ── Responsivo: pantallas pequeñas ── */
            @media (max-width: 420px) {
                .ajolote-burbuja {
                    font-size: 12px;
                    padding: 6px 10px;
                    max-width: 155px;
                    left: 110px;
                    top: -5px;
                }
                .ajolote-img {
                    width: 140px;
                    height: 140px;
                }
                #saludoAjolote {
                    bottom: -20px;
                    left: -10px;
                }
            }
        `;
        document.head.appendChild(estilos);
    }

    // ==============================================================
    //  FUNCIONES GLOBALES (llamadas desde auth.js / inicio.js)
    // ==============================================================

    /**
     * Muestra el ajolote SIN sesión (pantalla de login).
     * Llamada desde auth.js cuando no hay usuario.
     */
    window.mostrarSaludoAjoloteSinSesion = function () {
        crearWidget(generarSaludoSinSesion());
    };

    /**
     * Muestra el ajolote CON sesión (usuario autenticado).
     * Recibe los datos de Firestore del usuario para saludos contextuales.
     * Llamada desde inicio.js → iniciarLectura().
     */
    window.mostrarSaludoAjoloteConSesion = function (datos) {
        const user = (typeof auth !== "undefined" && auth.currentUser) || null;
        let nombre = "";

        if (datos) {
            // Prioridad: alias (si eligió mostrarlo) > nombre de perfil > displayName de Google
            if (datos.mostrarAlias && datos.alias) {
                nombre = datos.alias.trim();
            } else if (datos.nombre) {
                nombre = datos.nombre.trim().split(/\s+/)[0]; // primer nombre
            }
        }

        if (!nombre && user && user.displayName) {
            nombre = user.displayName.trim().split(/\s+/)[0];
        }

        crearWidget(generarSaludoConSesion(nombre, datos));
    };

})();
