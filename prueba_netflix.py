from playwright.sync_api import sync_playwright
import time

def probar_netflix(busqueda, nombre_perfil):
    with sync_playwright() as p:
        contexto = p.chromium.launch_persistent_context(
            user_data_dir="./perfil_netflix",
            headless=False,
            slow_mo=400
        )
        pagina = contexto.pages[0] if contexto.pages else contexto.new_page()

        pagina.goto("https://www.netflix.com")
        time.sleep(3)

        # Elegir perfil
        try:
            pagina.click(f"text={nombre_perfil}", timeout=5000)
            print(f"Perfil '{nombre_perfil}' elegido.")
        except:
            print("Elegí el perfil a mano. Tenés 15 segundos...")
            time.sleep(15)

        time.sleep(6)

        # Hacer clic en la lupa (aria-label="Buscar")
        print("Clickeando la lupa...")
        pagina.click("button[aria-label='Buscar']", timeout=10000)
        time.sleep(2)

        # Escribir la búsqueda
        print(f"Escribiendo: {busqueda}")
        pagina.keyboard.type(busqueda, delay=150)
        time.sleep(5)

        # Leer los títulos de los resultados
        print("Leyendo resultados...")
        titulos = pagina.eval_on_selector_all(
            "a[aria-label]",
            "els => els.map(e => e.getAttribute('aria-label')).filter(t => t && t.trim())"
        )
        # Filtrar duplicados manteniendo orden
        vistos = []
        for t in titulos:
            if t not in vistos:
                vistos.append(t)

        print("\n=== PRIMERAS PELÍCULAS ENCONTRADAS ===")
        for t in vistos[:5]:
            print(" -", t)

        time.sleep(15)
        contexto.close()

probar_netflix("comedia", "ZANINI")