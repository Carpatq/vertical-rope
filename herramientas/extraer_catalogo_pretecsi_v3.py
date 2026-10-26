"""
Extractor de catálogo Pretecsi - v3
Genera: catalogo_pretecsi.xlsx, catalogo_pretecsi.json y la carpeta imagenes/

Estrategia (de más fiable a menos fiable):
  1) API pública de WooCommerce (Store API): devuelve todo en JSON, sin HTML.
  2) Si la API está desactivada: lee las fichas individuales usando los
     URLs del sitemap, con varios métodos de respaldo (HTML, JSON-LD, og:meta).

Instalación:
    py -m pip install requests beautifulsoup4 pandas openpyxl

Ejecución (desde la carpeta herramientas/ del proyecto):
    py extraer_catalogo_pretecsi_v3.py
"""

import json
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from xml.etree import ElementTree

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://pretecsi.com/"
OUTPUT_XLSX = "../datos/catalogo_pretecsi.xlsx"
OUTPUT_JSON = "../datos/catalogo_pretecsi.json"
IMG_DIR = Path("imagenes_temporal")
DEBUG_DIR = Path("debug")
DOWNLOAD_IMAGES = False     # las imágenes se descargan después con descargar_imagenes.py
PAUSE = 0.6                 # segundos entre peticiones (sé amable con el servidor)
LINE_MARK = "/lineas-de-productos/"

session = requests.Session()
session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "es-CO,es;q=0.9,en;q=0.5",
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
})


# ----------------------------------------------------------------- utilidades
def get(url, params=None, tries=3):
    """GET con reintentos. Muestra el código HTTP para poder diagnosticar."""
    for attempt in range(1, tries + 1):
        try:
            r = session.get(url, params=params, timeout=30)
        except requests.RequestException as exc:
            print(f"  ! Error de red en {url}: {exc}")
            time.sleep(2 * attempt)
            continue
        if r.status_code == 200:
            return r
        print(f"  ! HTTP {r.status_code} en {url} (intento {attempt}/{tries})")
        if r.status_code in (403, 429, 503):   # bloqueo / límite de velocidad
            time.sleep(5 * attempt)
        else:
            break
    return None


def html_to_text(html):
    """Convierte HTML a texto plano conservando saltos de línea y viñetas."""
    if not html:
        return ""
    soup = BeautifulSoup(html, "html.parser")
    for br in soup.find_all("br"):
        br.replace_with("\n")
    for li in soup.find_all("li"):
        li.insert(0, "• ")
    for tag in soup.find_all(["p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "div", "ul", "ol"]):
        tag.append("\n")
    text = soup.get_text().replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def clean(node):
    return re.sub(r"\s+", " ", node.get_text(" ", strip=True)).strip() if node else ""


def full_size(url):
    """Quita el sufijo -630x630 de WordPress para obtener la imagen original."""
    return re.sub(r"-\d+x\d+(?=\.(?:jpe?g|png|webp|gif)(?:\?.*)?$)", "", url, flags=re.I)


def split_categories(items):
    """items = [(nombre, url)] -> (líneas de producto, categorías)."""
    lines, cats = [], []
    for name, link in items:
        if "/lineas-de-productos/" in link and not link.rstrip("/").endswith("lineas-de-productos"):
            lines.append(name)
        elif not link.rstrip("/").endswith("lineas-de-productos"):
            cats.append(name)
    return " | ".join(dict.fromkeys(lines)), " | ".join(dict.fromkeys(cats))


# ----------------------------------------------------- estrategia 1: Store API
def fetch_store_api():
    api = urljoin(BASE_URL, "wp-json/wc/store/v1/products")
    products, page = [], 1
    while True:
        r = get(api, params={"per_page": 100, "page": page})
        if not r:
            break
        try:
            data = r.json()
        except ValueError:
            break
        if not isinstance(data, list) or not data:
            break
        products.extend(data)
        total_pages = int(r.headers.get("X-WP-TotalPages", page))
        print(f"  API página {page}/{total_pages}: {len(data)} productos")
        if page >= total_pages:
            break
        page += 1
        time.sleep(PAUSE)
    return products


def row_from_api(p):
    lines, cats = split_categories(
        [(c.get("name", ""), c.get("link", "")) for c in p.get("categories", [])]
    )
    images = [full_size(i["src"]) for i in p.get("images", []) if i.get("src")]
    return {
        "Nombre": html_to_text(p.get("name", "")),
        "SKU": p.get("sku", ""),
        "Líneas de producto": lines,
        "Categorías": cats,
        "Descripción corta": html_to_text(p.get("short_description", "")),
        "Descripción": html_to_text(p.get("description", "")),
        "Imagen principal": images[0] if images else "",
        "Galería": " | ".join(images[1:]),
        "URL del producto": p.get("permalink", ""),
    }


# ------------------------------------------- estrategia 2: fichas individuales
def sitemap_product_urls():
    candidates = ["wp-sitemap.xml", "sitemap_index.xml", "product-sitemap.xml", "producto-sitemap.xml"]
    found, visited = set(), set()

    def walk(url, depth=0):
        if url in visited or depth > 2:
            return
        visited.add(url)
        r = get(url, tries=1)
        if not r:
            return
        try:
            root = ElementTree.fromstring(r.content)
        except ElementTree.ParseError:
            return
        for node in root.iter():
            if node.tag.endswith("}loc") and node.text:
                loc = node.text.strip()
                if urlparse(loc).netloc.endswith("pretecsi.com"):
                    if loc.lower().endswith(".xml"):
                        walk(loc, depth + 1)
                    elif "/producto/" in loc.lower():
                        found.add(loc)

    for c in candidates:
        walk(urljoin(BASE_URL, c))
    return sorted(found)


def product_jsonld(soup):
    for s in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(s.string or s.get_text() or "")
        except ValueError:
            continue
        nodes = data.get("@graph", [data]) if isinstance(data, dict) else data
        for n in nodes:
            if isinstance(n, dict):
                t = n.get("@type")
                if "Product" in (t if isinstance(t, list) else [t]):
                    return n
    return {}


def meta(soup, prop):
    tag = soup.find("meta", attrs={"property": prop}) or soup.find("meta", attrs={"name": prop})
    return (tag.get("content") or "").strip() if tag else ""


def extract_page(url, debug_counter):
    r = get(url)
    if not r:
        return None
    soup = BeautifulSoup(r.text, "html.parser")
    ld = product_jsonld(soup)

    title = (
        clean(soup.select_one("h1.product_title, .product_title, .summary h1, h1.entry-title"))
        or ld.get("name", "")
        or re.sub(r"\s*[-–|]\s*Pretecsi\s*$", "", meta(soup, "og:title"))
    )
    if not title or title.lower() in ("productos", "tienda"):
        if debug_counter[0] < 3:           # guarda el HTML para ver qué llegó realmente
            DEBUG_DIR.mkdir(exist_ok=True)
            path = DEBUG_DIR / f"fallo_{debug_counter[0] + 1}.html"
            path.write_text(r.text, encoding="utf-8")
            print(f"  ! Sin título. HTML guardado en {path} (revísalo en el navegador)")
            debug_counter[0] += 1
        return None

    short = soup.select_one(".woocommerce-product-details__short-description")
    long_ = soup.select_one(
        "#tab-description, .woocommerce-Tabs-panel--description, "
        ".wd-accordion-content, .woocommerce-product-details__description"
    )
    description = html_to_text(str(long_)) if long_ else ""
    short_txt = html_to_text(str(short)) if short else ""
    if not description and not short_txt:
        description = ld.get("description", "") or meta(soup, "og:description")

    # Imágenes: enlaces de la galería (tamaño completo) -> data-large_image -> og:image
    images = []
    for a in soup.select(".woocommerce-product-gallery__image a[href], .woocommerce-product-gallery a[href]"):
        href = a.get("href", "")
        if re.search(r"\.(jpe?g|png|webp|gif)(\?|$)", href, re.I):
            images.append(urljoin(url, href))
    if not images:
        for img in soup.select(".woocommerce-product-gallery img, img.wp-post-image"):
            src = img.get("data-large_image") or img.get("data-src") or img.get("src") or ""
            if src and not src.startswith("data:"):
                images.append(urljoin(url, full_size(src)))
    if not images and meta(soup, "og:image"):
        images.append(meta(soup, "og:image"))
    images = list(dict.fromkeys(images))

    links = [
        (clean(a), a.get("href", ""))
        for a in soup.select(".product_meta .posted_in a, .posted_in a")
    ]
    lines, cats = split_categories(links)

    return {
        "Nombre": title,
        "SKU": clean(soup.select_one(".sku")) or ld.get("sku", ""),
        "Líneas de producto": lines,
        "Categorías": cats,
        "Descripción corta": short_txt,
        "Descripción": description,
        "Imagen principal": images[0] if images else "",
        "Galería": " | ".join(images[1:]),
        "URL del producto": url,
    }


# ------------------------------------------------------------------ imágenes
def download_images(df):
    IMG_DIR.mkdir(exist_ok=True)
    local = []
    for i, (src, page_url) in enumerate(zip(df["Imagen principal"], df["URL del producto"]), start=1):
        if not src:
            local.append("")
            continue
        slug = urlparse(page_url).path.strip("/").split("/")[-1] or f"producto-{i}"
        ext = Path(urlparse(src).path).suffix or ".jpg"
        dest = IMG_DIR / f"{slug[:80]}{ext}"
        if not dest.exists():
            r = get(src, tries=2)
            if r:
                dest.write_bytes(r.content)
                time.sleep(0.2)
        local.append(str(dest).replace("\\", "/") if dest.exists() else "")
        if i % 25 == 0:
            print(f"  imágenes: {i}/{len(df)}")
    df["Imagen local"] = local
    return df


# ---------------------------------------------------------------------- main
def main():
    rows = []

    print("1) Intentando la API de WooCommerce...")
    api_products = fetch_store_api()
    if api_products:
        rows = [row_from_api(p) for p in api_products]
        print(f"   OK: {len(rows)} productos desde la API.")
    else:
        print("   La API no respondió. Paso al método de fichas individuales.")
        urls = sitemap_product_urls()
        print(f"2) {len(urls)} URLs encontradas en el sitemap.")
        counter = [0]
        for n, url in enumerate(urls, start=1):
            print(f"  [{n}/{len(urls)}] {url}")
            row = extract_page(url, counter)
            if row:
                rows.append(row)
            time.sleep(PAUSE)

    if not rows:
        print("\nNo se obtuvo ningún producto. Revisa la carpeta debug/ y los códigos HTTP de arriba.")
        return

    df = pd.DataFrame(rows).drop_duplicates(subset=["URL del producto"]).reset_index(drop=True)
    df.insert(0, "ID", range(1, len(df) + 1))
    df["Revisar"] = df.apply(
        lambda r: "Sí" if not r["Nombre"] or not r["Imagen principal"] or not (r["Descripción"] or r["Descripción corta"]) else "",
        axis=1,
    )

    if DOWNLOAD_IMAGES:
        print("\nDescargando imágenes...")
        df = download_images(df)

    with pd.ExcelWriter(OUTPUT_XLSX, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Productos", index=False)
        ws = writer.sheets["Productos"]
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ws.dimensions
        for col in ws.columns:
            width = max((len(str(c.value or "")) for c in list(col)[:100]), default=12)
            ws.column_dimensions[col[0].column_letter].width = min(max(width + 2, 12), 55)

    df.to_json(OUTPUT_JSON, orient="records", force_ascii=False, indent=2)

    print(f"\nListo: {len(df)} productos -> {OUTPUT_XLSX} y {OUTPUT_JSON}")
    print(f"Sin imagen: {(df['Imagen principal'] == '').sum()} | Sin descripción: "
          f"{((df['Descripción'] == '') & (df['Descripción corta'] == '')).sum()} | "
          f"Marcados para revisar: {(df['Revisar'] == 'Sí').sum()}")
    if len(df) != 265:
        print("Nota: el sitio anuncia 265 productos; la diferencia puede deberse a cambios recientes.")


if __name__ == "__main__":
    main()
