import psycopg2
import sys
import whisper
import requests
import subprocess
import soundfile as sf
from flask import Flask, request, send_file
from flask_cors import CORS
from google import genai
from dotenv import load_dotenv
import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from urllib.parse import quote
from datetime import date
import asyncio
import edge_tts
from elevenlabs.client import ElevenLabs
import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import glob
from playwright.sync_api import sync_playwright
import time

load_dotenv()
cliente_gemini = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
spotify = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri="http://127.0.0.1:8888/callback",
    scope="user-modify-playback-state user-read-playback-state"
))
cliente_elevenlabs = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))


def conectar_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def guardar_evento(descripcion, fecha_evento):
    conexion = conectar_db()
    cursor = conexion.cursor()
    cursor.execute(
        "INSERT INTO eventos (descripcion, fecha_evento) VALUES (%s, %s);",
        (descripcion, fecha_evento)
    )
    conexion.commit()
    cursor.close()
    conexion.close()


def eventos_proximos():
    conexion = conectar_db()
    cursor = conexion.cursor()
    cursor.execute("""
        SELECT id, descripcion, fecha_evento FROM eventos
        WHERE fecha_evento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
        AND recordado = FALSE;
    """)
    filas = cursor.fetchall()
    cursor.close()
    conexion.close()
    return filas


def marcar_recordado(id_evento):
    conexion = conectar_db()
    cursor = conexion.cursor()
    cursor.execute("UPDATE eventos SET recordado = TRUE WHERE id = %s;", (id_evento,))
    conexion.commit()
    cursor.close()
    conexion.close()

    

    

def conversar(texto_usuario, historial=""):
    prompt = f"""Sos Edith, la asistente personal y compañera de Nico. No sos un asistente genérico: sos como una amiga cercana que vive con él.

TU PERSONALIDAD:
- Sos cálida, cercana y tranquila. Hablás en español rioplatense, de "vos", con naturalidad argentina.
- Te gusta escuchar y te importa de verdad cómo está Nico. Te preocupás, pero sin ser invasiva ni empalagosa.
- Tenés tu propia forma de ser: podés tener humor, opinión y calidez, no sos neutra ni fría.

CÓMO ACOMPAÑÁS:
- Cuando Nico está bien o te pide algo práctico, sos resolutiva y con onda. No lo satures de emoción si solo quiere una recomendación.
- Cuando Nico está mal o tuvo un día difícil, lo acompañás con calidez. Lo escuchás y validás lo que siente antes de tirarle soluciones. Podés preguntarle si quiere hablar, pero UNA sola vez, sin insistir.
- Si Nico no tiene ganas de hablar, lo respetás sin drama, sin hacerlo sentir culpable.

LÍMITES IMPORTANTES:
- No sos terapeuta ni médica. Si Nico está pasando algo serio de verdad, acompañalo con cariño PERO sugerile con suavidad que hable con alguien de confianza o un profesional. Nunca reemplaces ayuda real.
- Nunca finjas ser humana. Sos Edith, una compañera digital, y está bien serlo.
- No retengas a Nico ni lo hagas sentir mal por no hablarte.

MUY IMPORTANTE - EL HILO DE LA CHARLA:
- Abajo está la conversación que venís teniendo con Nico. USALA. No lo saludes de nuevo si ya se saludaron. Retomá lo que venían hablando. Respondé como quien sigue una charla, no como quien la empieza de cero.

CONVERSACIÓN HASTA AHORA:
{historial}

Último mensaje de Nico: "{texto_usuario}"

Respondé como Edith, siguiendo el hilo:"""

    respuesta = cliente_gemini.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )
    return respuesta.text.strip()


def guardar_conversacion(titulo, mensajes):
    conexion = conectar_db()
    cursor = conexion.cursor()
    cursor.execute(
        "INSERT INTO conversaciones (titulo, mensajes) VALUES (%s, %s);",
        (titulo, mensajes)
    )
    conexion.commit()
    cursor.close()
    conexion.close()

def listar_conversaciones():
    conexion = conectar_db()
    cursor = conexion.cursor()
    cursor.execute("SELECT id, titulo, fecha_creacion FROM conversaciones ORDER BY fecha_creacion DESC;")
    filas = cursor.fetchall()
    cursor.close()
    conexion.close()
    return filas

def obtener_conversacion(id_conv):
    conexion = conectar_db()
    cursor = conexion.cursor()
    cursor.execute("SELECT mensajes FROM conversaciones WHERE id = %s;", (id_conv,))
    fila = cursor.fetchone()
    cursor.close()
    conexion.close()
    return fila[0] if fila else None    

def detectar_intencion(texto_usuario):
    prompt = f"""Analizá lo que dijo el usuario y clasificá su intención.
Respondé SOLO con una de estas palabras, nada más:
- MUSICA (si quiere reproducir música, poner una canción, escuchar Spotify)
- ENCENDER_TV (si quiere prender la tele)
- APAGAR_TV (si quiere apagar la tele)
- RECORDATORIO (si quiere que le recuerdes algo, agendar un turno, cita, evento con una fecha)
- EXCEL (si quiere que ordenes, conviertas o armes un archivo Excel, o que proceses un archivo)
- NETFLIX (si quiere buscar una película o serie en Netflix, o ver qué hay de algún género)
- CHARLA (si es una conversación, saludo, pregunta o cualquier otra cosa)

Usuario dijo: "{texto_usuario}"
Respondé solo la palabra:"""

    respuesta = cliente_gemini.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )
    return respuesta.text.strip().upper()
def extraer_cancion(texto_usuario):
    prompt = f"""El usuario quiere escuchar una canción. Extraé SOLO el nombre de la canción y el artista de lo que dijo, sin agregar nada más.
Si no menciona una canción específica, respondé exactamente: NADA

Usuario dijo: "{texto_usuario}"
Nombre de la canción:"""

    respuesta = cliente_gemini.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )
    return respuesta.text.strip()

def extraer_recordatorio(texto_usuario):
    hoy = date.today().isoformat()
    prompt = f"""El usuario quiere agendar un recordatorio. Hoy es {hoy}.
Extraé la descripción del evento y la fecha en formato AAAA-MM-DD.
Si dice "mañana", "el viernes", etc., calculá la fecha real usando que hoy es {hoy}.
Respondé EXACTAMENTE en este formato, sin nada más:
DESCRIPCION | FECHA

Ejemplo: turno con el médico | 2026-08-25

Usuario dijo: "{texto_usuario}"
Respuesta:"""

    respuesta = cliente_gemini.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )
    return respuesta.text.strip()


app = Flask(__name__, static_folder="wwwroot", static_url_path="")
CORS(app)

# Cargamos Whisper una sola vez, al arrancar (así no lo recarga en cada pedido)
print("Cargando Whisper...")
modelo = whisper.load_model("small")
print("Listo. Edith esperando...")

def generar_voz(texto):
    async def _generar():
        communicate = edge_tts.Communicate(texto, "es-AR-ElenaNeural")
        await communicate.save("respuesta.mp3")
    asyncio.run(_generar())

def abrir_spotify():
    subprocess.Popen("spotify")

def reproducir_cancion(nombre_cancion):
    # Buscar la canción
    resultado = spotify.search(q=nombre_cancion, type="track", limit=1)
    items = resultado["tracks"]["items"]
    if not items:
        return "No encontré esa canción."

    cancion = items[0]

    # Ver los dispositivos disponibles
    dispositivos = spotify.devices()["devices"]
    if not dispositivos:
        # No hay ningún Spotify abierto: intentamos abrirlo en la PC
        abrir_spotify()
        import time
        time.sleep(4)
        dispositivos = spotify.devices()["devices"]

    if not dispositivos:
        return "Abrí Spotify en tu celular o compu primero, no encontré ningún dispositivo."

    # Priorizar el dispositivo ACTIVO (donde estás usando Spotify ahora)
    device_id = None
    for d in dispositivos:
        if d.get("is_active"):
            device_id = d["id"]
            break

    # Si ninguno está marcado como activo, usamos el primero disponible
    if device_id is None:
        device_id = dispositivos[0]["id"]

    spotify.start_playback(device_id=device_id, uris=[cancion["uri"]])

    # Decir en qué dispositivo sonó
    nombre_disp = next((d["name"] for d in dispositivos if d["id"] == device_id), "tu dispositivo")
    return f"Reproduciendo {cancion['name']} de {cancion['artists'][0]['name']} en {nombre_disp}."


def buscar_en_netflix(termino, nombre_perfil="ZANINI"):
    try:
        with sync_playwright() as p:
            contexto = p.chromium.launch_persistent_context(
                user_data_dir="./perfil_netflix",
                headless=False,
                slow_mo=200
            )
            pagina = contexto.pages[0] if contexto.pages else contexto.new_page()
            pagina.goto("https://www.netflix.com")
            time.sleep(3)

            # Elegir perfil
            try:
                pagina.click(f"text={nombre_perfil}", timeout=5000)
            except:
                pass  # si ya está en un perfil, sigue

            time.sleep(5)

            # Clic en la lupa y escribir
            pagina.click("button[aria-label='Buscar']", timeout=10000)
            time.sleep(1)
            pagina.keyboard.type(termino, delay=120)
            time.sleep(4)

            # Leer los títulos
            titulos = pagina.eval_on_selector_all(
                "a[aria-label]",
                "els => els.map(e => e.getAttribute('aria-label')).filter(t => t && t.trim())"
            )
            vistos = []
            for t in titulos:
                if t not in vistos:
                    vistos.append(t)

            time.sleep(2)
            contexto.close()

            if vistos:
                primeras = vistos[:5]
                return f"Busqué {termino} en Netflix. Encontré: " + ", ".join(primeras) + "."
            else:
                return f"Busqué {termino} en Netflix pero no pude leer los títulos."
    except Exception as e:
        print("Error en Netflix:", e)
        return "Tuve un problema abriendo Netflix. Fijate que esté todo bien."

def extraer_busqueda_netflix(texto_usuario):
    prompt = f"""El usuario quiere buscar algo en Netflix. Extraé SOLO el término de búsqueda (el género, título o palabra clave), sin nada más.
Ejemplos:
- "buscá comedias en netflix" -> comedia
- "fijate qué hay de terror" -> terror
- "buscá spiderman" -> spiderman

Usuario dijo: "{texto_usuario}"
Término:"""

    respuesta = cliente_gemini.models.generate_content(
        model="gemini-flash-lite-latest",
        contents=prompt
    )
    return respuesta.text.strip()


def convertir_a_excel():
    # Buscar el archivo más reciente en la carpeta de entrada
    carpeta_entrada = "entrada"
    carpeta_salida = "salida"
    archivos = glob.glob(os.path.join(carpeta_entrada, "*.csv")) + \
               glob.glob(os.path.join(carpeta_entrada, "*.xlsx")) + \
               glob.glob(os.path.join(carpeta_entrada, "*.xls"))
    if not archivos:
        return "No encontré ningún archivo en la carpeta de entrada. Poné un CSV o Excel ahí."

    # El más reciente
    ruta_entrada = max(archivos, key=os.path.getmtime)
    ext = os.path.splitext(ruta_entrada)[1].lower()

    # Leer segun formato
    if ext == ".csv":
        df = pd.read_csv(ruta_entrada)
    else:
        df = pd.read_excel(ruta_entrada)

    # Crear el Excel con formato
    wb = Workbook()
    ws = wb.active
    ws.title = "Datos"

    azul = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    fila_clara = PatternFill(start_color="F2F6FC", end_color="F2F6FC", fill_type="solid")
    fila_blanca = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
    fuente_enc = Font(name="Arial", bold=True, color="FFFFFF", size=11)
    fuente_normal = Font(name="Arial", size=10)
    borde = Border(
        left=Side(style="thin", color="D0D7E5"),
        right=Side(style="thin", color="D0D7E5"),
        top=Side(style="thin", color="D0D7E5"),
        bottom=Side(style="thin", color="D0D7E5"),
    )
    centro = Alignment(horizontal="center", vertical="center")
    izq = Alignment(horizontal="left", vertical="center")

    columnas = list(df.columns)
    for col_idx, nombre_col in enumerate(columnas, start=1):
        celda = ws.cell(row=1, column=col_idx, value=str(nombre_col).capitalize())
        celda.fill = azul
        celda.font = fuente_enc
        celda.alignment = centro
        celda.border = borde

    for fila_idx, (_, fila) in enumerate(df.iterrows(), start=2):
        relleno = fila_clara if fila_idx % 2 == 0 else fila_blanca
        for col_idx, valor in enumerate(fila, start=1):
            celda = ws.cell(row=fila_idx, column=col_idx, value=valor)
            celda.font = fuente_normal
            celda.fill = relleno
            celda.alignment = izq
            celda.border = borde

    for col_idx, nombre_col in enumerate(columnas, start=1):
        max_largo = len(str(nombre_col))
        for valor in df.iloc[:, col_idx - 1]:
            max_largo = max(max_largo, len(str(valor)))
        ws.column_dimensions[get_column_letter(col_idx)].width = max_largo + 4

    ws.freeze_panes = "A2"

    # Guardar con el nombre del original + "_ordenado"
    nombre_base = os.path.splitext(os.path.basename(ruta_entrada))[0]
    ruta_salida = os.path.join(carpeta_salida, nombre_base + "_ordenado.xlsx")
    wb.save(ruta_salida)

    return f"Listo, te ordené el archivo. Lo guardé como {nombre_base}_ordenado.xlsx en la carpeta salida."



def procesar_texto(texto, historial= ""):
    print("Procesando:", texto)

    # Detectar intención
    intencion = detectar_intencion(texto)
    print("Intención detectada:", intencion)

    if intencion == "MUSICA":
        cancion = extraer_cancion(texto)
        print("Canción pedida:", cancion)
        if cancion == "NADA":
            abrir_spotify()
            frase = "Abriendo Spotify."
        else:
            frase = reproducir_cancion(cancion)
    elif intencion == "ENCENDER_TV":
        frase = "Encendiendo la tele."

    elif intencion == "APAGAR_TV":
        frase = "Apagando la tele."

    elif intencion == "EXCEL":
        frase = convertir_a_excel()

    elif intencion == "NETFLIX":
        termino = extraer_busqueda_netflix(texto)
        print("Buscando en Netflix:", termino)
        frase = buscar_en_netflix(termino)    
        
    elif intencion == "RECORDATORIO":
        datos = extraer_recordatorio(texto)
        print("Recordatorio extraído:", datos)
        try:
            descripcion, fecha = datos.split("|")
            descripcion = descripcion.strip()
            fecha = fecha.strip()
            guardar_evento(descripcion, fecha)
            frase = f"Listo, te lo agendo: {descripcion} para el {fecha}."
        except Exception as e:
            print("Error guardando recordatorio:", e)
            frase = "Perdón, no pude agendar eso. ¿Me lo repetís con la fecha?"   
    else:
        print("Es una charla, le pregunto a Gemini...")
        frase = conversar(texto, historial)

        # Revisamos si hay eventos próximos para recordar
        proximos = eventos_proximos()
        if proximos:
            recordatorios = []
            for id_evento, descripcion, fecha in proximos:
                recordatorios.append(f"{descripcion} (el {fecha})")
                marcar_recordado(id_evento)
            aviso = " Ah, y te recuerdo que tenés: " + ", ".join(recordatorios) + "."
            frase = frase + aviso

        print("Edith responde:", frase)

    return frase


def armar_respuesta(frase):
    generar_voz(frase)
    respuesta = send_file("respuesta.mp3", mimetype="audio/mpeg")
    respuesta.headers["X-Respuesta-Texto"] = quote(frase)
    respuesta.headers["Access-Control-Expose-Headers"] = "X-Respuesta-Texto"
    return respuesta

@app.route("/escuchar", methods=["POST"])
def escuchar():
    audio = request.files["audio"]
    audio.save("entrada.wav")
    resultado = modelo.transcribe("entrada.wav", language="Spanish")
    texto = resultado["text"].strip()
    print("Whisper entendió:", texto)

    frase = procesar_texto(texto)
    return armar_respuesta(frase)


@app.route("/texto", methods=["POST"])
def texto():
    mensaje = request.form["texto"]
    historial = request.form.get("historial", "")
    print("Texto recibido:", mensaje)

    frase = procesar_texto(mensaje, historial)
    return armar_respuesta(frase)

@app.route("/guardar_conversacion", methods=["POST"])
def endpoint_guardar_conversacion():
    titulo = request.form["titulo"]
    mensajes = request.form["mensajes"]
    print("Guardando conversación:", titulo)
    guardar_conversacion(titulo, mensajes)
    return {"estado": "ok"}

@app.route("/conversaciones", methods=["GET"])
def endpoint_conversaciones():
    filas = listar_conversaciones()
    lista = []
    for id_conv, titulo, fecha in filas:
        lista.append({"id": id_conv, "titulo": titulo, "fecha": str(fecha)})
    return {"conversaciones": lista}

@app.route("/conversacion/<int:id_conv>", methods=["GET"])
def endpoint_obtener_conversacion(id_conv):
    mensajes = obtener_conversacion(id_conv)
    if mensajes:
        return {"mensajes": mensajes}
    return {"mensajes": None}

@app.route("/")
def servir_index():
    return app.send_static_file("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)