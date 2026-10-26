/**
 * API del catálogo de Vertical Rope (Express + MySQL/MariaDB)
 *
 *   npm install
 *   npm start          (o: npm run dev  -> se reinicia al guardar cambios)
 *
 * Endpoints:
 *   GET /api/salud
 *   GET /api/lineas                      líneas con cantidad de productos
 *   GET /api/categorias                  categorías con cantidad de productos
 *   GET /api/productos                   listado con filtros y paginación
 *       ?linea=arborismo,trabajo-en-altura   (slugs separados por coma)
 *       &categoria=arnes
 *       &q=ascendedor                        (busca en nombre, descripción y SKU)
 *       &orden=nombre | nombre_desc | recientes
 *       &page=1&limit=12
 *   GET /api/productos/:slug             detalle + productos relacionados
 *   GET /imagenes/<archivo>              imágenes de los productos
 *
 * Por decisión de la empresa, la API NO expone ningún precio.
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const PORT = Number(process.env.PORT || 4000);
const IMAGES_DIR = path.resolve(process.env.IMAGES_DIR || '../frontend/public/imagenes');
const ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',').map((s) => s.trim()).filter(Boolean);

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vertical_rope',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

const app = express();
app.use(cors({ origin: ORIGINS }));
app.use('/imagenes', express.static(IMAGES_DIR, { maxAge: '7d' }));

// ------------------------------------------------------------ utilidades
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;
const entero = (v, def, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || def));
const lista = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const ORDENES = {
  nombre: 'p.nombre ASC',
  nombre_desc: 'p.nombre DESC',
  recientes: 'p.id DESC',
};

const CAMPOS_TARJETA = `
  p.id, p.sku, p.nombre, p.slug, p.imagen,
  COALESCE(NULLIF(p.descripcion_corta, ''), LEFT(p.descripcion, 220)) AS resumen`;

// Adjunta líneas, categorías y URL de imagen a una lista de productos
async function enriquecer(req, productos) {
  if (!productos.length) return productos;
  const ids = productos.map((p) => p.id);
  const [lineas] = await pool.query(
    `SELECT pl.producto_id, l.nombre, l.slug FROM producto_linea pl
     JOIN lineas l ON l.id = pl.linea_id WHERE pl.producto_id IN (?) ORDER BY l.nombre`, [ids]);
  const [cats] = await pool.query(
    `SELECT pc.producto_id, c.nombre, c.slug FROM producto_categoria pc
     JOIN categorias c ON c.id = pc.categoria_id WHERE pc.producto_id IN (?) ORDER BY c.nombre`, [ids]);

  const agrupar = (filas) => {
    const m = new Map();
    for (const f of filas) {
      if (!m.has(f.producto_id)) m.set(f.producto_id, []);
      m.get(f.producto_id).push({ nombre: f.nombre, slug: f.slug });
    }
    return m;
  };
  const mL = agrupar(lineas);
  const mC = agrupar(cats);
  const base = baseUrl(req);

  return productos.map((p) => ({
    ...p,
    imagen_url: p.imagen ? `${base}/imagenes/${encodeURIComponent(p.imagen)}` : null,
    lineas: mL.get(p.id) || [],
    categorias: mC.get(p.id) || [],
  }));
}

// ------------------------------------------------------------------ rutas
app.get('/api/salud', wrap(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

app.get('/api/lineas', wrap(async (req, res) => {
  const [filas] = await pool.query(
    `SELECT l.nombre, l.slug, COUNT(p.id) AS total
     FROM lineas l
     LEFT JOIN producto_linea pl ON pl.linea_id = l.id
     LEFT JOIN productos p ON p.id = pl.producto_id AND p.activo = 1
     GROUP BY l.id ORDER BY l.nombre`);
  res.json(filas);
}));

app.get('/api/categorias', wrap(async (req, res) => {
  const [filas] = await pool.query(
    `SELECT c.nombre, c.slug, COUNT(p.id) AS total
     FROM categorias c
     LEFT JOIN producto_categoria pc ON pc.categoria_id = c.id
     LEFT JOIN productos p ON p.id = pc.producto_id AND p.activo = 1
     GROUP BY c.id ORDER BY c.nombre`);
  res.json(filas);
}));

app.get('/api/productos', wrap(async (req, res) => {
  const page = entero(req.query.page, 1, 1, 100000);
  const limit = entero(req.query.limit, 12, 1, 48);
  const orden = ORDENES[req.query.orden] || ORDENES.nombre;

  const where = ['p.activo = 1'];
  const params = [];

  const lineas = lista(req.query.linea);
  if (lineas.length) {
    where.push(`EXISTS (SELECT 1 FROM producto_linea pl JOIN lineas l ON l.id = pl.linea_id
                        WHERE pl.producto_id = p.id AND l.slug IN (?))`);
    params.push(lineas);
  }
  const categorias = lista(req.query.categoria);
  if (categorias.length) {
    where.push(`EXISTS (SELECT 1 FROM producto_categoria pc JOIN categorias c ON c.id = pc.categoria_id
                        WHERE pc.producto_id = p.id AND c.slug IN (?))`);
    params.push(categorias);
  }
  const palabras = String(req.query.q || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
  for (const palabra of palabras) {
    const like = `%${escapeLike(palabra)}%`;
    where.push('(p.nombre LIKE ? OR p.descripcion_corta LIKE ? OR p.descripcion LIKE ? OR p.sku LIKE ?)');
    params.push(like, like, like, like);
  }

  const condicion = where.join(' AND ');
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM productos p WHERE ${condicion}`, params);
  const [filas] = await pool.query(
    `SELECT ${CAMPOS_TARJETA} FROM productos p WHERE ${condicion}
     ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]);

  res.json({
    data: await enriquecer(req, filas),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}));

app.get('/api/productos/:slug', wrap(async (req, res) => {
  const [filas] = await pool.query(
    `SELECT p.id, p.sku, p.nombre, p.slug, p.imagen, p.descripcion_corta, p.descripcion
     FROM productos p WHERE p.slug = ? AND p.activo = 1`, [req.params.slug]);
  if (!filas.length) return res.status(404).json({ error: 'Producto no encontrado' });

  const [producto] = await enriquecer(req, filas);

  // Relacionados: comparten categoría con este producto
  const [rel] = await pool.query(
    `SELECT DISTINCT ${CAMPOS_TARJETA}
     FROM productos p
     JOIN producto_categoria pc ON pc.producto_id = p.id
     WHERE p.activo = 1 AND p.id <> ?
       AND pc.categoria_id IN (SELECT categoria_id FROM producto_categoria WHERE producto_id = ?)
     ORDER BY p.nombre LIMIT 4`, [producto.id, producto.id]);

  res.json({ ...producto, relacionados: await enriquecer(req, rel) });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => {
  console.log(`API de Vertical Rope en http://localhost:${PORT}`);
  console.log(`Imágenes servidas desde: ${IMAGES_DIR}`);
});
