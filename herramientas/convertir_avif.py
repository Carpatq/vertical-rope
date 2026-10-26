"""
Convierte las imágenes .avif de la carpeta imagenes_productos a .jpg
(los originales se mueven a imagenes_productos/avif_originales por seguridad).

Instalación:
    py -m pip install pillow pillow-heif

Ejecución (desde la carpeta herramientas/ del proyecto):
    py convertir_avif.py

Después, en MySQL Workbench, ejecuta:
    USE vertical_rope;
    UPDATE productos SET imagen = REPLACE(imagen, '.avif', '.jpg') WHERE imagen LIKE '%.avif';
"""

import shutil
from pathlib import Path

from PIL import Image
from pillow_heif import register_heif_opener

register_heif_opener()          # permite a Pillow leer AVIF

CARPETA = Path("../frontend/public/imagenes")
RESPALDO = CARPETA / "avif_originales"
CALIDAD = 90                    # 1-100; 90 = muy buena calidad


def main():
    archivos = sorted(CARPETA.glob("*.avif"))
    if not archivos:
        print("No hay archivos .avif para convertir.")
        return

    RESPALDO.mkdir(exist_ok=True)
    convertidos, errores = 0, []

    for ruta in archivos:
        destino = ruta.with_suffix(".jpg")
        try:
            with Image.open(ruta) as img:
                if img.mode in ("RGBA", "LA", "P"):          # transparencia -> fondo blanco
                    img = img.convert("RGBA")
                    fondo = Image.new("RGB", img.size, (255, 255, 255))
                    fondo.paste(img, mask=img.split()[-1])
                    img = fondo
                else:
                    img = img.convert("RGB")
                img.save(destino, "JPEG", quality=CALIDAD, optimize=True)
            shutil.move(str(ruta), str(RESPALDO / ruta.name))
            convertidos += 1
            print(f"OK  {ruta.name} -> {destino.name}")
        except Exception as exc:                              # noqa: BLE001
            errores.append((ruta.name, str(exc)[:100]))
            print(f"ERROR {ruta.name}: {exc}")

    print(f"\nConvertidas: {convertidos} de {len(archivos)}")
    if errores:
        print("Con error (se dejaron sin tocar):")
        for nombre, motivo in errores:
            print(f"  - {nombre}: {motivo}")


if __name__ == "__main__":
    main()
