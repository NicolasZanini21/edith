let grabando = false;
let mediaRecorder;
let chunks = [];
let muteado = false;
let conversacionIniciada = false;
let historial = [];
let intervaloPasos = null;
let burbujaCargando = null;

const escenario = document.getElementById("escenario");
const conversacion = document.getElementById("conversacion");
const botonMic = document.getElementById("boton-mic");
const estado = document.getElementById("estado");
const campoTexto = document.getElementById("campo-texto");
const botonMute = document.getElementById("boton-mute");
const menu = document.getElementById("menu-lateral");
const overlay = document.getElementById("overlay");
const SERVIDOR = window.location.origin;

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
        burbujaCargando.innerHTML = '<span class="cargando"><span class="spinner"></span><span class="texto-paso">' + pasos[idx % pasos.length] + '</span></span>';
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
async function enviarTexto() {
    const texto = campoTexto.value.trim();
    if (texto === "") return;
    campoTexto.value = "";
    campoTexto.style.height = "auto";
    agregarMensajeNico(texto);
    iniciarPasos(texto);
    

    const formData = new FormData();
    formData.append("texto", texto);
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

// ---------- RESPUESTA (voz + texto) ----------
async function procesarRespuesta(res) {
    const textoRespuesta = decodeURIComponent(res.headers.get("X-Respuesta-Texto") || "");
    detenerPasos();
    agregarMensajeEdith(textoRespuesta);

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
