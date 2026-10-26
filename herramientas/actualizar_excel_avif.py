"""
Actualiza la columna "Imagen local" del Excel: cambia .avif por .jpg
SOLO cuando el archivo .jpg existe de verdad en imagenes_productos.

- Hace antes una copia de seguridad del Excel.
- No toca las demás columnas (las URLs de origen se dejan como están).
- Conserva el formato del Excel (anchos, filtros, etc.).

Instalación:
    py -m pip install openpyxl

Ejecución (con el Excel CERRADO, desde la carpeta herramientas/ del proyecto):
    py actualizar_excel_avif.py
"""

import shutil
from pathlib import Path

from openpyxl import load_workbook

EXCEL = Path("../datos/catalogo_pretecsi_con_imagenes.xlsx")
RESPALDO = Path("../datos/catalogo_pretecsi_con_imagenes_respaldo.xlsx")
CARPETA = Path("../frontend/public/imagenes")
HOJA = "Productos"
COLUMNA = "Imagen local"


def main():
    if not EXCEL.exists():
        print(f"No encuentro {EXCEL}. Ejecuta el script desde la carpeta del backend.")
        return

    shutil.copy2(EXCEL, RESPALDO)
    print(f"Copia de seguridad: {RESPALDO}")

    wb = load_workbook(EXCEL)
    ws = wb[HOJA] if HOJA in wb.sheetnames else wb.worksheets[0]

    encabezados = {str(c.value).strip(): c.column for c in ws[1] if c.value}
    if COLUMNA not in encabezados:
        print(f'No existe la columna "{COLUMNA}" en el Excel.')
        return
    col = encabezados[COLUMNA]

    cambiadas, sin_jpg = 0, []
    for fila in range(2, ws.max_row + 1):
        celda = ws.cell(row=fila, column=col)
        valor = str(celda.value or "").strip()
        if ".avif" not in valor.lower():
            continue

        nuevos = []
        for nombre in (x.strip() for x in valor.split("|") if x.strip()):
            if nombre.lower().endswith(".avif"):
                jpg = nombre[:-5] + ".jpg"
                if (CARPETA / jpg).exists():
                    nombre = jpg
                    cambiadas += 1
                else:
                    sin_jpg.append(nombre)
            nuevos.append(nombre)
        celda.value = " | ".join(nuevos)

    try:
        wb.save(EXCEL)
    except PermissionError:
        print("No pude guardar: cierra el Excel (está abierto) y vuelve a ejecutar.")
        return

    print(f"\nImágenes actualizadas de .avif a .jpg: {cambiadas}")
    if sin_jpg:
        print(f"Quedaron {len(sin_jpg)} sin cambiar porque su .jpg no existe en {CARPETA}/:")
        for n in sin_jpg:
            print(f"  - {n}")
        print("Ejecuta primero convertir_avif.py, o revisa si alguna imagen falló.")


if __name__ == "__main__":
    main()
