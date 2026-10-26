// Capa de datos 100 % estática: lee data/catalogo.json (generado desde el Excel) y
// filtra, busca y pagina en el navegador. No hay servidor ni base de datos.
// Devuelve las mismas formas de datos que tenía la API, por eso las páginas no cambian.

const BASE = import.meta.env.BASE_URL;

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const comparar = (a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' });
const entero = (v, def, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || def));
const lista = (v) => String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

let promesa = null;

function preparar(raw) {
  return raw.productos.map((p, i) => ({
    ...p,
    orden: i,
    imagen_url: p.imagen ? `${BASE}imagenes/${encodeURIComponent(p.imagen)}` : null,
    resumen: p.descripcion_corta || (p.descripcion || '').slice(0, 220),
    _texto: sinTildes(`${p.nombre} ${p.sku || ''} ${p.descripcion_corta || ''} ${p.descripcion || ''}`),
  }));
}

function cargar() {
  if (!promesa) {
    promesa = fetch(`${BASE}data/catalogo.json`)
      .then((r) => {
        if (!r.ok) {
          const err = new Error(`No se pudo cargar el catálogo (${r.status})`);
          err.status = r.status;
          throw err;
        }
        return r.json();
      })
      .then(preparar)
      .catch((e) => { promesa = null; throw e; });   // permite reintentar
  }
  return promesa;
}

const tarjeta = ({ id, sku, nombre, slug, imagen, imagen_url, resumen, lineas, categorias }) =>
  ({ id, sku, nombre, slug, imagen, imagen_url, resumen, lineas, categorias });

function contar(productos, campo) {
  const mapa = new Map();
  for (const p of productos) {
    for (const x of p[campo]) {
      const e = mapa.get(x.slug) || { nombre: x.nombre, slug: x.slug, total: 0 };
      e.total += 1;
      mapa.set(x.slug, e);
    }
  }
  return [...mapa.values()].sort((a, b) => comparar(a.nombre, b.nombre));
}

const ORDENES = {
  nombre: (a, b) => comparar(a.nombre, b.nombre),
  nombre_desc: (a, b) => comparar(b.nombre, a.nombre),
  recientes: (a, b) => b.orden - a.orden,
};

export const api = {
  async productos(params = {}) {
    const todos = await cargar();
    const page = entero(params.page, 1, 1, 100000);
    const limit = entero(params.limit, 12, 1, 48);
    const lineas = lista(params.linea);
    const categorias = lista(params.categoria);
    const palabras = sinTildes(params.q).trim().split(/\s+/).filter(Boolean).slice(0, 5);

    let r = todos;
    if (lineas.length) r = r.filter((p) => p.lineas.some((l) => lineas.includes(l.slug)));
    if (categorias.length) r = r.filter((p) => p.categorias.some((c) => categorias.includes(c.slug)));
    if (palabras.length) r = r.filter((p) => palabras.every((w) => p._texto.includes(w)));
    r = [...r].sort(ORDENES[params.orden] || ORDENES.nombre);

    const total = r.length;
    return {
      data: r.slice((page - 1) * limit, page * limit).map(tarjeta),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  },

  async producto(slug) {
    const todos = await cargar();
    const p = todos.find((x) => x.slug === slug);
    if (!p) {
      const err = new Error('Producto no encontrado');
      err.status = 404;
      throw err;
    }
    const cats = new Set(p.categorias.map((c) => c.slug));
    const relacionados = todos
      .filter((x) => x.id !== p.id && x.categorias.some((c) => cats.has(c.slug)))
      .sort(ORDENES.nombre)
      .slice(0, 4)
      .map(tarjeta);
    const { _texto, orden, ...completo } = p;
    return { ...completo, relacionados };
  },

  async lineas() { return contar(await cargar(), 'lineas'); },
  async categorias() { return contar(await cargar(), 'categorias'); },
};
