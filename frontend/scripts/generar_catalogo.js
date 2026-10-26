/**
 * Genera public/data/catalogo.json a partir del Excel.
 * Se ejecuta solo antes de "npm run dev" y "npm run build".
 *
 * Excel:    ../datos/catalogo_pretecsi_con_imagenes.xlsx   (o la ruta en EXCEL_PATH)
 * Imágenes: public/imagenes/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(aqui, '..');
const EXCEL = process.env.EXCEL_PATH
  ? path.resolve(process.env.EXCEL_PATH)
  : path.resolve(FRONTEND, '../datos/catalogo_pretecsi_con_imagenes.xlsx');
const IMAGENES = path.resolve(FRONTEND, 'public/imagenes');
const SALIDA = path.resolve(FRONTEND, 'public/data/catalogo.json');
const HOJA = 'Productos';

const slugify = (t, max = 180) =>
  String(t || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/, '');

// ExcelJS puede devolver objetos (texto enriquecido, fórmulas, hipervínculos)
function texto(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim();
    if (v.text !== undefined) return String(v.text).trim();
    if (v.result !== undefined) return String(v.result).trim();
    return '';
  }
  return String(v).trim();
}
const lista = (s) => [...new Set(String(s || '').split('|').map((x) => x.trim()).filter(Boolean))];
const aRef = (nombre) => ({ nombre, slug: slugify(nombre, 120) });

async function main() {
  if (!fs.existsSync(EXCEL)) {
    console.error(`\n✖ No encuentro el Excel del catálogo:\n  ${EXCEL}\n  Colócalo en la carpeta "datos/" con el nombre catalogo_pretecsi_con_imagenes.xlsx\n`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL);
  const ws = wb.getWorksheet(HOJA) || wb.worksheets[0];

  const col = {};
  ws.getRow(1).eachCell((cell, n) => { col[texto(cell.value)] = n; });
  if (!col['Nombre']) {
    console.error('✖ El Excel no tiene la columna "Nombre".');
    process.exit(1);
  }
  const get = (row, nombre) => (col[nombre] ? texto(row.getCell(col[nombre]).value) : '');

  const usados = new Set();
  const productos = [];
  const sinImagen = [];
  const imagenesFaltantes = [];

  ws.eachRow((row, n) => {
    if (n === 1) return;
    const nombre = get(row, 'Nombre');
    if (!nombre) return;
    const sku = get(row, 'SKU');

    // slug único y estable (si el nombre se repite, se añade SKU o contador)
    let slug = slugify(nombre) || 'producto';
    if (usados.has(slug) && sku) slug = `${slug}-${slugify(sku, 20)}`.slice(0, 190);
    for (let k = 2; usados.has(slug); k++) slug = `${slugify(nombre, 170)}-${k}`;
    usados.add(slug);

    let imagen = (get(row, 'Imagen local').split('|')[0] || '').trim();
    if (imagen && !fs.existsSync(path.join(IMAGENES, imagen))) {
      imagenesFaltantes.push(imagen);
      imagen = '';
    }
    if (!imagen) sinImagen.push(nombre);

    productos.push({
      id: productos.length + 1,
      sku: sku || null,
      nombre,
      slug,
      imagen: imagen || null,
      descripcion_corta: get(row, 'Descripción corta') || null,
      descripcion: get(row, 'Descripción') || null,
      lineas: lista(get(row, 'Líneas de producto')).map(aRef),
      categorias: lista(get(row, 'Categorías')).map(aRef),
    });
  });

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, JSON.stringify({ generado: new Date().toISOString(), productos }));

  const kb = Math.round(fs.statSync(SALIDA).size / 1024);
  console.log(`✔ Catálogo generado: ${productos.length} productos (${kb} KB) → public/data/catalogo.json`);
  if (imagenesFaltantes.length) {
    console.warn(`⚠ ${imagenesFaltantes.length} imágenes del Excel no existen en public/imagenes/ (ej.: ${imagenesFaltantes[0]})`);
  }
  if (sinImagen.length) console.warn(`⚠ ${sinImagen.length} productos quedarán sin imagen.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
