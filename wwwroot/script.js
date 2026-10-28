let grabando = false;
let mediaRecorder;
let chunks = [];
let muteado = false;
let conversacionIniciada = false;
let historial = [];
let intervaloPasos = null;
let burbujaCargando = null;
let modoDemo = false;

const escenario = document.getElementById("escenario");
const conversacion = document.getElementById("conversacion");
const botonMic = document.getElementById("boton-mic");
const botonEnviar = document.getElementById("boton-enviar");
const estado = document.getElementById("estado");
const campoTexto = document.getElementById("campo-texto");
const botonMute = document.getElementById("boton-mute");
const menu = document.getElementById("menu-lateral");
const overlay = document.getElementById("overlay");
const menuOpciones = document.getElementById("menu-opciones");
const SERVIDOR = window.location.origin;

// ---------- SESIÓN DEL VISITANTE (demo pública) ----------
// Id propio por visitante para que, en la demo pública, cada uno vea sus
// propios gastos y su propio gráfico sin mezclarse con los de otra
// persona ni con los datos personales de Nico. En localStorage para que
// sobreviva a un refresh; si el navegador lo bloquea (modo privado,
// etc.) se usa uno en memoria que dura mientras esté la pestaña abierta.
function obtenerSesionVisitante() {
    try {
        let id = localStorage.getItem("edith_sesion");
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem("edith_sesion", id);
        }
        return id;
    } catch (err) {
        if (!window._edithSesionMemoria) {
            window._edithSesionMemoria = crypto.randomUUID();
        }
        return window._edithSesionMemoria;
    }
}
const SESION_VISITANTE = obtenerSesionVisitante();

// ---------- MENÚ ----------
function abrirMenu() {
    menu.classList.add("abierto");
    overlay.classList.add("visible");
    cargarConversaciones()
}
function cerrarMenu() {
    menu.classList.remove("abierto");
    overlay.classList.remove("visible");
}

async function nuevaConversacion() {
    if (historial.length > 0) {
        const titulo = historial[0].texto.slice(0, 40);
        const mensajes = JSON.stringify(historial);
        const formData = new FormData();
        formData.append("titulo", titulo);
        formData.append("mensajes", mensajes);
        try {
            await fetch(SERVIDOR + "/guardar_conversacion", {
                method: "POST",
                body: formData
            });
        } catch (err) {
            console.log("No se pudo guardar la conversación:", err);
        }
    }

    conversacion.innerHTML = "";
    historial = [];
    conversacionIniciada = false;
    escenario.classList.remove("conversando");
    escenario.classList.add("inicio");
    estado.textContent = "Escribí o tocá el micrófono para empezar";
    ocultarMenuOpciones();
    cerrarMenu();
}

async function cargarConversaciones() {
    try {
        const res = await fetch(SERVIDOR + "/conversaciones");
        const data = await res.json();
        const contenedor = document.getElementById("lista-conversaciones");
        contenedor.innerHTML = "";

        if (data.conversaciones.length === 0) {
            contenedor.innerHTML = '<div class="menu-vacio">Todavía no hay charlas guardadas</div>';
            return;
        }

        data.conversaciones.forEach(conv => {
            const item = document.createElement("button");
            item.className = "conv-item";
            item.textContent = conv.titulo;
            item.onclick = () => abrirConversacion(conv.id);
            contenedor.appendChild(item);
        });
    } catch (err) {
        console.log("No se pudieron cargar las conversaciones:", err);
    }
}

async function abrirConversacion(id) {
    try {
        const res = await fetch(SERVIDOR + "/conversacion/" + id);
        const data = await res.json();
        if (!data.mensajes) return;

        const mensajes = JSON.parse(data.mensajes);

        // Limpiar la pantalla actual y cargar la charla
        conversacion.innerHTML = "";
        historial = [];
        conversacionIniciada = false;
        ocultarMenuOpciones();

        mensajes.forEach(msg => {
            if (msg.rol === "Nico") {
                agregarMensajeNicoSinTypewriter(msg.texto);
            } else {
                agregarMensajeEdithSinTypewriter(msg.texto);
            }
        });

        cerrarMenu();
    } catch (err) {
        console.log("No se pudo abrir la conversación:", err);
    }
}

// ---------- MUTE ----------
function toggleMute() {
    muteado = !muteado;
    botonMute.classList.toggle("muteado", muteado);
}

// ---------- CHAT ----------
function iniciarConversacionSiHaceFalta() {
    if (!conversacionIniciada) {
        conversacionIniciada = true;
        escenario.classList.remove("inicio");
        escenario.classList.add("conversando");
    }
}

function agregarMensajeNico(texto) {
    iniciarConversacionSiHaceFalta();
    historial.push({ rol: "Nico", texto: texto });
    const div = document.createElement("div");
    div.className = "msg nico";
    div.textContent = texto;
    conversacion.appendChild(div);
    scrollAbajo();
}

function agregarMensajeEdith(texto) {
    iniciarConversacionSiHaceFalta();
    historial.push({ rol: "Edith", texto: texto });
    const div = document.createElement("div");
    div.className = "msg edith";
    conversacion.appendChild(div);
    scrollAbajo();
    // efecto typewriter por palabra
    const palabras = texto.split(" ");
    let i = 0;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    div.appendChild(cursor);
    const intervalo = setInterval(() => {
        if (i < palabras.length) {
            cursor.insertAdjacentText("beforebegin", (i === 0 ? "" : " ") + palabras[i]);
            i++;
            scrollAbajo();
        } else {
            clearInterval(intervalo);
            cursor.remove();
        }
    }, 110);
}

function agregarMensajeNicoSinTypewriter(texto) {
    iniciarConversacionSiHaceFalta();
    historial.push({ rol: "Nico", texto: texto });
    const div = document.createElement("div");
    div.className = "msg nico";
    div.textContent = texto;
    conversacion.appendChild(div);
    scrollAbajo();
}

function agregarMensajeEdithSinTypewriter(texto) {
    iniciarConversacionSiHaceFalta();
    historial.push({ rol: "Edith", texto: texto });
    const div = document.createElement("div");
    div.className = "msg edith";
    div.textContent = texto;
    conversacion.appendChild(div);
    scrollAbajo();
}

function elegirPasos(texto) {
    const t = texto.toLowerCase();
    if (t.includes("excel") || t.includes("archivo") || t.includes("ordename") || t.includes("ordena")) {
        return ["Leyendo el archivo…", "Acomodando los datos…", "Dándole formato…", "Guardando en la carpeta…"];
    }
    if (t.includes("poné") || t.includes("pone") || t.includes("canción") || t.includes("cancion") || t.includes("música") || t.includes("musica") || t.includes("spotify") || t.includes("reproducí") || t.includes("escuchar")) {
        return ["Buscando la canción…", "Poniéndola en Spotify…"];
    }
    if (t.includes("recordá") || t.includes("recorda") || t.includes("acordar") || t.includes("turno") || t.includes("agendá") || t.includes("agenda")) {
        return ["Anotando el recordatorio…", "Guardando la fecha…"];
    }
    if (t.includes("netflix") || t.includes("película") || t.includes("pelicula") || t.includes("serie") || t.includes("ver algo")) {
        return ["Abriendo Netflix…", "Entrando a tu perfil…", "Buscando lo que pediste…", "Leyendo los resultados…"];
    }
    return ["Dejame pensar…"];
}

function iniciarPasos(texto) {
    iniciarConversacionSiHaceFalta();
    const pasos = elegirPasos(texto);
    let idx = 0;

    // Crear la burbuja de Edith con el spinner
    burbujaCargando = document.createElement("div");
    burbujaCargando.className = "msg edith";
    conversacion.appendChild(burbujaCargando);
    scrollAbajo();

    function mostrar() {
        burbujaCargando.innerHTML = '<span class="cargando"><span class="spinner-pensando"></span><span class="texto-paso">' + pasos[idx % pasos.length] + '</span></span>';
        idx++;
    }
    mostrar();
    intervaloPasos = setInterval(mostrar, 1400);
}

function detenerPasos() {
    if (intervaloPasos) {
        clearInterval(intervaloPasos);
        intervaloPasos = null;
    }
    // Sacar la burbuja de cargando (la respuesta real se agrega aparte)
    if (burbujaCargando) {
        burbujaCargando.remove();
        burbujaCargando = null;
    }
}


function scrollAbajo() {
    escenario.scrollTop = escenario.scrollHeight;
}

// ---------- ENVIAR TEXTO ----------
// Si se le pasa textoForzado (por ejemplo al tocar una opción del menú de
// bienvenida), se manda ese texto en vez de leer el campo de escritura.
async function enviarTexto(textoForzado) {
    const esForzado = typeof textoForzado === "string";
    const texto = (esForzado ? textoForzado : campoTexto.value).trim();
    if (texto === "") return;
    const eraPrimera = historial.length === 0;
    if (!esForzado) {
        campoTexto.value = "";
        campoTexto.style.height = "auto";
    }
    ocultarMenuOpciones();
    agregarMensajeNico(texto);
    iniciarPasos(texto);

    const formData = new FormData();
    formData.append("texto", texto);
    formData.append("primera", eraPrimera ? "true" : "false");
    formData.append("sesion", SESION_VISITANTE);
    try {
        const res = await fetch(SERVIDOR + "/texto", { method: "POST", body: formData });

        await procesarRespuesta(res);

    } catch (err) {
        estado.textContent = "No me pude conectar. ¿Está corriendo el servidor?";
    }
}

// Enter envía; Shift+Enter hace salto de línea
campoTexto.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        enviarTexto();
    }
});

// El campo crece con el texto y vuelve a su tamaño al enviar
function ajustarAltura() {
    campoTexto.style.height = "auto";
    campoTexto.style.height = campoTexto.scrollHeight + "px";
}
campoTexto.addEventListener("input", ajustarAltura);

// ---------- RESPUESTA (voz + texto + gráfico opcional) ----------
function agregarGraficoEdith() {
    const div = document.createElement("div");
    div.className = "msg edith";
    const img = document.createElement("img");
    img.className = "grafico-chat";
    img.alt = "Gráfico de gastos";
    img.src = SERVIDOR + "/grafico?sesion=" + encodeURIComponent(SESION_VISITANTE) + "&t=" + Date.now(); // evita servir una imagen vieja cacheada
    div.appendChild(img);
    conversacion.appendChild(div);
    scrollAbajo();
}

// ---------- MENÚ DE BIENVENIDA (opciones tipo encuesta) ----------
// Edith lo muestra cuando el primer mensaje de la charla es un saludo
// genérico ("hola", "qué tal"), para ofrecer opciones en vez de quedarse
// esperando que el usuario adivine qué puede pedirle. Si en cambio arranca
// con algo puntual ("cómo sale la selección"), el backend no manda el menú
// y esto nunca se llama. Va como panel fijo arriba del campo de texto, no
// como un mensaje más del chat.
function ocultarMenuOpciones() {
    if (!menuOpciones) return;
    menuOpciones.hidden = true;
    menuOpciones.innerHTML = "";
}

function mostrarMenuOpciones() {
    if (!menuOpciones) return;

    const grupos = [
        {
            titulo: "💼 Trabajo",
            opciones: [
                ["Organizame las tareas", "Ayudame a organizar mis tareas de laburo"],
                ["Ayuda con un Excel", "Ayudame a ordenar un archivo de Excel"],
            ],
        },
        {
            titulo: "🏠 Personal",
            opciones: modoDemo
                ? [["Mis finanzas", "Quiero ver cómo vienen mis finanzas personales"]]
                : [
                    ["Mis finanzas", "Quiero ver cómo vienen mis finanzas personales"],
                    ["Poné música", "Poneme música"],
                    ["Buscar en Netflix", "Buscá algo en Netflix"],
                ],
        },
    ];

    menuOpciones.innerHTML = "";

    grupos.forEach(grupo => {
        const contenedorGrupo = document.createElement("div");
        contenedorGrupo.className = "grupo-opciones";

        const titulo = document.createElement("div");
        titulo.className = "grupo-titulo";
        titulo.textContent = grupo.titulo;
        contenedorGrupo.appendChild(titulo);

        const fila = document.createElement("div");
        fila.className = "fila-chips";
        grupo.opciones.forEach(([etiqueta, mensaje]) => {
            const boton = document.createElement("button");
            boton.type = "button";
            boton.className = "chip-opcion";
            boton.textContent = etiqueta;
            boton.addEventListener("click", () => enviarTexto(mensaje));
            fila.appendChild(boton);
        });
        contenedorGrupo.appendChild(fila);
        menuOpciones.appendChild(contenedorGrupo);
    });

    const nota = document.createElement("div");
    nota.className = "menu-nota";
    nota.textContent = "O escribime directamente lo que necesites.";
    menuOpciones.appendChild(nota);

    menuOpciones.hidden = false;
}

async function procesarRespuesta(res) {
    const textoRespuesta = decodeURIComponent(res.headers.get("X-Respuesta-Texto") || "");
    const hayGrafico = res.headers.get("X-Hay-Grafico") === "true";
    const hayMenu = res.headers.get("X-Mostrar-Menu") === "true";
    detenerPasos();
    agregarMensajeEdith(textoRespuesta);
    if (hayGrafico) agregarGraficoEdith();
    if (hayMenu) mostrarMenuOpciones();

    if (!muteado) {
        const audioBlob = await res.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play().catch(() => {});
    }
}

// ---------- VOZ ----------
async function toggleGrabar() {
    if (!grabando) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            chunks = [];
            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = enviarAudio;
            mediaRecorder.start();
            grabando = true;
            botonMic.className = "escuchando";
            estado.textContent = "Escuchando…";
        } catch (err) {
            estado.textContent = "No pude usar el micrófono.";
        }
    } else {
        mediaRecorder.stop();
        grabando = false;
        botonMic.className = "procesando";
        estado.textContent = "Pensando…";
    }
}

async function enviarAudio() {
    const blob = new Blob(chunks, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audio", blob, "grabacion.wav");
    try {
        const res = await fetch(SERVIDOR + "/escuchar", { method: "POST", body: formData });
        botonMic.className = "respondiendo";
        // El texto de lo que dijiste lo pone el servidor; acá mostramos la respuesta.
        await procesarRespuesta(res);
        setTimeout(() => { botonMic.className = ""; }, 2500);
    } catch (err) {
        estado.textContent = "No me pude conectar. ¿Está corriendo el servidor?";
        botonMic.className = "";
    }
}

// ---------- PWA: registrar el service worker ----------
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(err => {
            console.log("No se pudo registrar el service worker:", err);
        });
    });
}

// ---------- DESPERTAR AL PUENTE (cold start de Render) ----------
// El puente Flask puede estar dormido por inactividad y tardar hasta ~1
// minuto en responder. En vez de dejar que el usuario le escriba a ciegas
// a una pantalla que no reacciona, deshabilitamos el chat hasta confirmar
// que /salud responde, mostrando por qué está tardando.
const MENSAJE_INICIO = "Escribí o tocá el micrófono para empezar";
const MENSAJE_DESPERTANDO = "Despertando a Edith… puede tardar hasta un minuto la primera vez.";
const MENSAJE_SIN_RESPUESTA = "No pudimos despertar a Edith. Probá refrescar la página en un minuto.";
const INTERVALO_REINTENTO_MS = 4000;
const TIEMPO_MAXIMO_MS = 90000;

function fijarChatHabilitado(habilitado) {
    campoTexto.disabled = !habilitado;
    botonMic.disabled = !habilitado;
}

async function consultarSalud() {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 5000);
    try {
        const res = await fetch(SERVIDOR + "/salud", { signal: controlador.signal });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

// ---------- PRESENTACIÓN DE CAPACIDADES ----------
const capacidades = document.getElementById("capacidades");

function mostrarCapacidades(esDemo) {
    modoDemo = !!esDemo;
    if (!capacidades) return;
    capacidades.textContent = esDemo
        ? "Puedo recordarte eventos, llevarte un registro de gastos e ingresos con gráfico, o simplemente charlar — Spotify y Netflix están desactivados en esta demo pública."
        : "Puedo poner música en Spotify, buscarte algo en Netflix, recordarte eventos o simplemente charlar.";
}

async function despertarEdith() {
    fijarChatHabilitado(false);
    estado.textContent = MENSAJE_DESPERTANDO;

    const desde = Date.now();
    while (Date.now() - desde < TIEMPO_MAXIMO_MS) {
        const salud = await consultarSalud();
        if (salud) {
            fijarChatHabilitado(true);
            estado.textContent = MENSAJE_INICIO;
            mostrarCapacidades(!!salud.demo);
            return;
        }
        await new Promise(r => setTimeout(r, INTERVALO_REINTENTO_MS));
    }

    estado.textContent = MENSAJE_SIN_RESPUESTA;
}

despertarEdith();
