import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
import os

load_dotenv()

sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("SPOTIFY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIFY_CLIENT_SECRET"),
    redirect_uri="http://127.0.0.1:8888/callback",
    scope="user-modify-playback-state user-read-playback-state"
))

# Buscar una canción
resultado = sp.search(q="Pensamientos Airbag", type="track", limit=1)
cancion = resultado["tracks"]["items"][0]
uri = cancion["uri"]
print("Encontré:", cancion["name"], "-", cancion["artists"][0]["name"])

# Reproducirla
sp.start_playback(uris=[uri])
print("¡Reproduciendo!")