"""
Descarga las imágenes del catálogo de Pretecsi usando el Excel generado.

Nombre de cada archivo:  <ID>_<SKU si existe>_<nombre-del-producto>[_<n>].<ext>
Ejemplo:                 007_N5306_ascendedor-de-pecho-yoke.jpg
                         007_N5306_ascendedor-de-pecho-yoke_2.jpg   (galería)

Instalación:
    py -m pip install requests pandas openpyxl

Ejecución (desde la carpeta herramientas/ del proyecto):
    py descargar_imagenes.py
Si se interrumpe, vuelve a ejecutarlo: omite las imágenes ya descargadas.
"""

import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import requests

EXCEL_IN = "../datos/catalogo_pretecsi.xlsx"
EXCEL_OUT = "../datos/catalogo_pretecsi_con_imagenes.xlsx"   # copia con la columna "Imagen local"
HOJA = "Productos"
CARPETA = Path("../frontend/public/imagenes")   # aquí las lee el sitio web
INCLUIR_GALERIA = False     # False = solo la imagen principal
INCLUIR_SKU = True          # False = solo ID + nombre
PAUSA = 0.3

CONTENT_TYPES = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "image/gif": ".gif", "image/avif": ".avif", "image/svg+xml": ".svg",
}

session = requests.Session()
session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Referer": "https://pretecsi.com/",
})


def slugify(texto, max_len=70):
    texto = unicodedata.normalize("NFKD", str(texto)).encode("ascii", "ignore").decode()
    texto = re.sub(r"[^a-zA-Z0-9]+", "-", texto).strip("-").lower()
    return texto[:max_len].strip("-") or "producto"


def valor(row, col):
    v = row.get(col, "")
    return "" if pd.isna(v) else str(v).strip()


def extension(url, content_type):
    ext = Path(urlparse(url).path).suffix.lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"):
        return ".jpg" if ext == ".jpeg" else ext
    return CONTENT_TYPES.get((content_type or "").split(";")[0].strip(), ".jpg")


def descargar(url, base):
    """Descarga url y la guarda como base + extensión. Devuelve (ruta, error)."""
    for ext in (".jpg", ".png", ".webp", ".gif", ".avif", ".svg"):   # ya descargada
        existente = CARPETA / f"{base}{ext}"
        if existente.exists() and existente.stat().st_size > 0:
            return existente, ""

    ultimo_error = ""
    for intento in range(1, 4):
        try:
            r = session.get(url, timeout=30)
            if r.status_code == 200 and r.content:
                destino = CARPETA / f"{base}{extension(url, r.headers.get('Content-Type'))}"
                destino.write_bytes(r.content)
                return destino, ""
            ultimo_error = f"HTTP {r.status_code}"
        except requests.RequestException as exc:
            ultimo_error = str(exc)[:120]
        time.sleep(2 * intento)
    return None, ultimo_error


def main():
    df = pd.read_excel(EXCEL_IN, sheet_name=HOJA)
    CARPETA.mkdir(exist_ok=True)

    locales, errores = [], []
    total = len(df)
    ok = 0

    for pos, (_, row) in enumerate(df.iterrows(), start=1):
        codigo = valor(row, "ID") or str(pos)
        codigo = codigo.split(".")[0].zfill(3)
        sku = slugify(valor(row, "SKU"), 30) if INCLUIR_SKU and valor(row, "SKU") else ""
        nombre = slugify(valor(row, "Nombre"))
        base = "_".join(p for p in (codigo, sku, nombre) if p)

        urls = [valor(row, "Imagen principal")]
        if INCLUIR_GALERIA:
            urls += [u.strip() for u in valor(row, "Galería").split("|") if u.strip()]
        urls = [u for u in urls if u.startswith("http")]

        rutas = []
        for n, url in enumerate(urls, start=1):
            nombre_archivo = base if n == 1 else f"{base}_{n}"
            ruta, error = descargar(url, nombre_archivo)
            if ruta:
                rutas.append(ruta.name)
                ok += 1
            else:
                errores.append({"ID": codigo, "Nombre": valor(row, "Nombre"), "URL": url, "Error": error})
            time.sleep(PAUSA)

        if not urls:
            errores.append({"ID": codigo, "Nombre": valor(row, "Nombre"), "URL": "", "Error": "Sin URL de imagen"})

        locales.append(" | ".join(rutas))
        if pos % 10 == 0 or pos == total:
            print(f"[{pos}/{total}] imágenes descargadas: {ok}")

    df["Imagen local"] = locales
    df.to_excel(EXCEL_OUT, sheet_name=HOJA, index=False)

    print(f"\nListo. {ok} imágenes en la carpeta '{CARPETA}/'")
    print(f"Excel actualizado: {EXCEL_OUT}")
    if errores:
        pd.DataFrame(errores).to_csv("imagenes_con_error.csv", index=False, encoding="utf-8-sig")
        print(f"{len(errores)} imágenes con problemas -> imagenes_con_error.csv")


if __name__ == "__main__":
    main()
