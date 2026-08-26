import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def conectar():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def guardar_evento(descripcion, fecha_evento):
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute(
        "INSERT INTO eventos (descripcion, fecha_evento) VALUES (%s, %s);",
        (descripcion, fecha_evento)
    )
    conexion.commit()
    cursor.close()
    conexion.close()
    print(f"Guardado: {descripcion} para el {fecha_evento}")

def ver_eventos():
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("SELECT id, descripcion, fecha_evento FROM eventos;")
    filas = cursor.fetchall()
    cursor.close()
    conexion.close()
    return filas

# Prueba: guardamos un evento y después los leemos
guardar_evento("Turno con el médico", "2026-08-25")
print("Eventos en la base:", ver_eventos())