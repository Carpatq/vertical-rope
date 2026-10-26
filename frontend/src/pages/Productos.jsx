import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import Filtros from '../components/Filtros';

const LIMITE = 12;
const ORDENES = [
  ['nombre', 'Nombre: A a Z'],
  ['nombre_desc', 'Nombre: Z a A'],
  ['recientes', 'Más recientes'],
];

export default function Productos() {
  const [params, setParams] = useSearchParams();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [reintento, setReintento] = useState(0);

  const linea = params.get('linea') || '';
  const categoria = params.get('categoria') || '';
  const q = params.get('q') || '';
  const orden = params.get('orden') || 'nombre';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  const lineas = useApi((s) => api.lineas(s), []);
  const categorias = useApi((s) => api.categorias(s), []);
  const nuevos = useApi((s) => api.productos({ orden: 'recientes', limit: 3 }, s), []);
  const lista = useApi(
    (s) => api.productos({ linea, categoria, q, orden, page, limit: LIMITE }, s),
    [linea, categoria, q, orden, page, reintento]
  );

  const actualizar = (cambios) => {
    const nuevo = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v === '' || v == null ? nuevo.delete(k) : nuevo.set(k, v)));
    if (!('page' in cambios)) nuevo.delete('page');
    setParams(nuevo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hayFiltros = Boolean(linea || categoria || q);
  const limpiar = () => { setParams({}); setFiltrosAbiertos(false); };

  const nombreDe = (items, slug) => (items || []).find((i) => i.slug === slug)?.nombre;
  const titulo = nombreDe(categorias.data, categoria) || nombreDe(lineas.data, linea) || 'Productos';
  usePageTitle(titulo);

  const datos = lista.data?.data || [];
  const pag = lista.data?.pagination;
  const desde = pag && pag.total ? (pag.page - 1) * pag.limit + 1 : 0;
  const hasta = pag ? Math.min(pag.page * pag.limit, pag.total) : 0;

  const etiquetas = [
    linea && { clave: 'linea', texto: nombreDe(lineas.data, linea) || linea },
    categoria && { clave: 'categoria', texto: nombreDe(categorias.data, categoria) || categoria },
    q && { clave: 'q', texto: `“${q}”` },
  ].filter(Boolean);

  return (
    <div className="contenedor catalogo">
      <div className="catalogo__titulo">
        <h1>{titulo}</h1>
        <button className="btn btn--borde btn--sm catalogo__filtros-btn" onClick={() => setFiltrosAbiertos((a) => !a)}>
          {filtrosAbiertos ? 'Ocultar filtros' : 'Filtros'}
        </button>
      </div>

      <div className="catalogo__cuerpo">
        <div className={`catalogo__lateral ${filtrosAbiertos ? 'catalogo__lateral--abierto' : ''}`}>
          <Filtros
            lineas={lineas.data}
            categorias={categorias.data}
            nuevos={nuevos.data?.data}
            valores={{ linea, categoria, q }}
            hayFiltros={hayFiltros}
            onCambio={(c) => { actualizar(c); setFiltrosAbiertos(false); }}
            onLimpiar={limpiar}
          />
        </div>

        <section className="catalogo__principal" aria-busy={lista.loading}>
          <div className="catalogo__barra">
            <p className="catalogo__resultados">
              {pag ? (pag.total ? `Mostrando ${desde}–${hasta} de ${pag.total} resultados` : 'Sin resultados') : 'Cargando…'}
            </p>
            <label className="orden">
              <span>Ordenar por</span>
              <select value={orden} onChange={(e) => actualizar({ orden: e.target.value === 'nombre' ? '' : e.target.value })}>
                {ORDENES.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </label>
          </div>

          {etiquetas.length > 0 && (
            <div className="etiquetas">
              {etiquetas.map((e) => (
                <button key={e.clave} className="etiqueta" onClick={() => actualizar({ [e.clave]: '' })}>
                  {e.texto} <span aria-hidden="true">×</span>
                  <span className="sr-only">quitar filtro</span>
                </button>
              ))}
            </div>
          )}

          {lista.error && (
            <div className="aviso aviso--error">
              <p>No pudimos cargar el catálogo. Recarga la página o inténtalo de nuevo en un momento.</p>
              <button className="btn btn--sm" onClick={() => setReintento((n) => n + 1)}>Reintentar</button>
            </div>
          )}

          {!lista.error && (
            <div className={`grilla grilla--3 ${lista.loading && datos.length ? 'grilla--cargando' : ''}`}>
              {datos.map((p) => <ProductCard key={p.id} p={p} />)}
              {lista.loading && !datos.length &&
                Array.from({ length: 6 }, (_, i) => <div key={i} className="esqueleto" />)}
            </div>
          )}

          {!lista.loading && !lista.error && pag?.total === 0 && (
            <div className="aviso">
              <p>No encontramos productos con esos filtros.</p>
              <button className="btn btn--sm" onClick={limpiar}>Ver todos los productos</button>
            </div>
          )}

          {pag && <Pagination page={pag.page} totalPages={pag.totalPages} onChange={(n) => actualizar({ page: n === 1 ? '' : String(n) })} />}
        </section>
      </div>
    </div>
  );
}
