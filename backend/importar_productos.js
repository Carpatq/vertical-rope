/**
 * Importa el catálogo desde el Excel a MySQL/MariaDB.
 * Se puede ejecutar varias veces: actualiza lo existente (no duplica).
 *
 *   npm install
 *   npm run importar
 */
require('dotenv').config();
const ExcelJS = require('exceljs');
const mysql = require('mysql2/promise');

const EXCEL_PATH = process.env.EXCEL_PATH || '../datos/catalogo_pretecsi_con_imagenes.xlsx';
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

async function leerExcel() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.getWorksheet(HOJA) || wb.worksheets[0];

  const col = {};
  ws.getRow(1).eachCell((cell, n) => { col[texto(cell.value)] = n; });
  const faltan = ['Nombre', 'Descripción'].filter((c) => !col[c]);
  if (faltan.length) throw new Error(`Faltan columnas en el Excel: ${faltan.join(', ')}`);

  const get = (row, nombre) => (col[nombre] ? texto(row.getCell(col[nombre]).value) : '');
  const filas = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const nombre = get(row, 'Nombre');
    if (!nombre) return;
    filas.push({
      nombre,
      sku: get(row, 'SKU'),
      lineas: lista(get(row, 'Líneas de producto')),
      categorias: lista(get(row, 'Categorías')),
      descripcionCorta: get(row, 'Descripción corta'),
      descripcion: get(row, 'Descripción'),
      imagen: (get(row, 'Imagen local').split('|')[0] || '').trim(),
    });
  });
  return filas;
}

async function main() {
  console.log(`Leyendo ${EXCEL_PATH} ...`);
  const filas = await leerExcel();
  console.log(`${filas.length} productos en el Excel.`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vertical_rope',
    charset: 'utf8mb4',
  });

  const cache = { lineas: new Map(), categorias: new Map() };
  async function idDe(tabla, nombre) {           // tabla: 'lineas' | 'categorias'
    const slug = slugify(nombre, 120);
    if (!slug) return null;
    if (cache[tabla].has(slug)) return cache[tabla].get(slug);
    await conn.execute(
      `INSERT INTO ${tabla} (nombre, slug) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`,
      [nombre, slug]
    );
    const [[fila]] = await conn.execute(`SELECT id FROM ${tabla} WHERE slug = ?`, [slug]);
    cache[tabla].set(slug, fila.id);
    return fila.id;
  }

  await conn.beginTransaction();
  try {
    const usados = new Set();
    let sinImagen = 0;

    for (const p of filas) {
      // slug único y estable (si el nombre se repite, se añade SKU o contador)
      let slug = slugify(p.nombre) || 'producto';
      if (usados.has(slug) && p.sku) slug = `${slug}-${slugify(p.sku, 20)}`.slice(0, 190);
      for (let n = 2; usados.has(slug); n++) slug = `${slugify(p.nombre, 170)}-${n}`;
      usados.add(slug);

      if (!p.imagen) sinImagen++;

      await conn.execute(
        `INSERT INTO productos (sku, nombre, slug, descripcion_corta, descripcion, imagen)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sku = VALUES(sku), nombre = VALUES(nombre),
           descripcion_corta = VALUES(descripcion_corta),
           descripcion = VALUES(descripcion), imagen = VALUES(imagen)`,
        [p.sku || null, p.nombre, slug, p.descripcionCorta || null, p.descripcion || null, p.imagen || null]
      );
      const [[{ id }]] = await conn.execute('SELECT id FROM productos WHERE slug = ?', [slug]);

      await conn.execute('DELETE FROM producto_linea WHERE producto_id = ?', [id]);
      await conn.execute('DELETE FROM producto_categoria WHERE producto_id = ?', [id]);
      for (const nombre of p.lineas) {
        const lid = await idDe('lineas', nombre);
        if (lid) await conn.execute('INSERT IGNORE INTO producto_linea VALUES (?, ?)', [id, lid]);
      }
      for (const nombre of p.categorias) {
        const cid = await idDe('categorias', nombre);
        if (cid) await conn.execute('INSERT IGNORE INTO producto_categoria VALUES (?, ?)', [id, cid]);
      }
    }
    await conn.commit();

    const [[t]] = await conn.query(
      `SELECT (SELECT COUNT(*) FROM productos) AS productos,
              (SELECT COUNT(*) FROM lineas) AS lineas,
              (SELECT COUNT(*) FROM categorias) AS categorias`
    );
    console.log(`\nImportación completa: ${t.productos} productos, ${t.lineas} líneas, ${t.categorias} categorías.`);
    if (sinImagen) console.log(`Atención: ${sinImagen} productos sin imagen.`);
  } catch (err) {
    await conn.rollback();
    console.error('\nError, se revirtieron los cambios:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
