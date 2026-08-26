# Edith

Asistente virtual personal que entiende y responde en español rioplatense. Le hablás, te contesta con voz, y ejecuta acciones reales sobre el equipo: busca en Netflix, controla la reproducción de Spotify, procesa archivos y recuerda lo que hablaron antes.

Proyecto propio, en desarrollo. Corre íntegramente en la máquina local.

---

## Qué hace

- **Conversación por voz.** Transcribe lo que decís, genera la respuesta y la sintetiza en audio. La voz es en español argentino, no neutro.
- **Memoria persistente.** Cada intercambio se guarda en PostgreSQL, así que Edith mantiene el contexto entre sesiones y no arranca de cero cada vez.
- **Control de Spotify.** Reproduce, pausa y busca priorizando el dispositivo que esté activo en ese momento.
- **Búsqueda en Netflix.** Automatización de navegador con sesión persistente, sin tener que volver a loguearse en cada ejecución.
- **Procesamiento de archivos.** Convierte y ordena planillas, generando Excel con formato.
- **PWA instalable.** Se usa desde el celular como una app nativa, con service worker propio.

---

## Stack

**Backend principal:** ASP.NET Core (.NET 9) — sirve la aplicación y los archivos estáticos.

**Puente de servicios:** Python (Flask) — `puente.py` expone las integraciones que corren sobre librerías del ecosistema Python.

**Base de datos:** PostgreSQL, vía psycopg2.

**Modelo de lenguaje:** Gemini (flash).

**Voz:** ElevenLabs por API, y Piper con el modelo `es_AR-daniela-high` como alternativa local.

**Automatización:** Playwright con contexto persistente de Chromium.

**Frontend:** HTML, CSS y JavaScript sin framework, servido desde `wwwroot`. Manifest y service worker para funcionar como PWA.

---

## Estructura

```
Program.cs              Entrada de la aplicación ASP.NET Core
Edith.csproj            Proyecto .NET 9
appsettings.json        Configuración base
puente.py               Puente Flask hacia las integraciones en Python
wwwroot/
  index.html            Interfaz
  script.js             Lógica de cliente
  estilos.css           Estilos
  manifest.json         Manifiesto de la PWA
  sw.js                 Service worker (estrategia network-first)
prueba_db.py            Prueba aislada: conexión a PostgreSQL
prueba_gemini.py        Prueba aislada: generación de respuestas con Gemini
prueba_netflix.py       Prueba aislada: automatización de Netflix con Playwright
prueba_spotify.py       Prueba aislada: control de Spotify vía OAuth
```

Los `prueba_*.py` son scripts de validación independientes. Cada integración se probó por separado antes de incorporarla al puente, lo que permite diagnosticar un servicio sin levantar la aplicación completa.

---

## Puesta en marcha

**Requisitos:** .NET 9 SDK, Python 3.10 o superior, PostgreSQL.

**1. Clonar e instalar dependencias de Python**

```bash
git clone https://github.com/NicolasZanini21/edith.git
cd edith
python -m venv venv
venv\Scripts\activate
pip install psycopg2-binary python-dotenv google-genai spotipy playwright flask
playwright install chromium
```

**2. Configurar variables de entorno**

Copiar `.env.example` a `.env` y completar con las credenciales propias.

**3. Descargar el modelo de voz local**

El modelo de Piper (`es_AR-daniela-high.onnx`, 111 MB) no está incluido en el repositorio por su tamaño. Se descarga desde [el repositorio de voces de Piper](https://huggingface.co/rhasspy/piper-voices) y se ubica en la raíz del proyecto.

**4. Levantar**

```bash
python puente.py     # Puente Flask
dotnet run           # Aplicación ASP.NET Core
```

---

## Notas de implementación

Algunas decisiones que resolvieron problemas concretos:

- Las URLs del cliente se construyen con `window.location.origin` en lugar de apuntar a localhost, de modo que la aplicación funciona igual desde el navegador de escritorio que desde el celular a través de un túnel.
- El service worker usa estrategia network-first: prioriza la red y recurre al caché solo si falla, lo que evita quedar sirviendo una versión vieja tras cada despliegue.
- ASP.NET Core sirve los archivos estáticos directamente, sin un servidor de desarrollo intermedio, requisito para que la PWA se instale correctamente en dispositivos móviles.
- Playwright levanta Chromium con `launch_persistent_context`, manteniendo la sesión de Netflix entre ejecuciones.

---

## Estado

En desarrollo activo. Próximo paso: prototipo físico con ESP32, micrófono I2S y amplificador, para usar a Edith sin depender de la computadora.

---

Desarrollado por [Nicolás Zanini](https://www.linkedin.com/in/nicolaszanini) — Rosario, Argentina.
