
from google import genai
from dotenv import load_dotenv
import os

load_dotenv()
cliente = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

respuesta = cliente.models.generate_content(
    model="gemini-flash-latest",
    contents="Hola, presentate en una frase corta como si fueras un asistente llamado Edith."
)

print("Gemini respondió:")
print(respuesta.text)