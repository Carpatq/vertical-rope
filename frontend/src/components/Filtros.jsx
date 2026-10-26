import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../utils/assets';

function ListaFiltro({ titulo, items, activo, onElegir }) {
  const visibles = (items || []).filter((i) => i.total > 0);
  if (!visibles.length) return null;
  return (
    <section className="filtro">
      <h3 className="filtro__titulo">{titulo}</h3>
      <ul className="filtro__lista">
        {visibles.map((i) => (
          <li key={i.slug}>
            <button
              className={i.slug === activo ? 'activo' : ''}
              aria-pressed={i.slug === activo}
              onClick={() => onElegir(i.slug)}
            >
              <span>{i.nombre}</span>
              <span className="filtro__cuenta">{i.total}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Filtros({ lineas, categorias, nuevos, valores, onCambio, onLimpiar, hayFiltros }) {
  const [texto, setTexto] = useState(valores.q);
  useEffect(() => setTexto(valores.q), [valores.q]);

  return (
    <aside className="filtros">
      <form
        className="filtro"
        role="search"
        onSubmit={(e) => { e.preventDefault(); onCambio({ q: texto.trim() }); }}
      >
        <h3 className="filtro__titulo">Buscar</h3>
        <div className="buscador">
          <input
            type="search"
            placeholder="Nombre, referencia…"
            aria-label="Buscar productos"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="btn btn--sm">Buscar</button>
        </div>
      </form>

      <ListaFiltro
        titulo="Líneas de producto"
        items={lineas}
        activo={valores.linea}
        onElegir={(slug) => onCambio({ linea: slug === valores.linea ? '' : slug })}
      />
      <ListaFiltro
        titulo="Categorías"
        items={categorias}
        activo={valores.categoria}
        onElegir={(slug) => onCambio({ categoria: slug === valores.categoria ? '' : slug })}
      />

      {hayFiltros && (
        <button className="btn btn--borde btn--bloque" onClick={onLimpiar}>Limpiar filtros</button>
      )}

      {nuevos?.length > 0 && (
        <section className="filtro">
          <h3 className="filtro__titulo">Productos nuevos</h3>
          <ul className="nuevos">
            {nuevos.map((p) => (
              <li key={p.id}>
                <Link to={`/producto/${p.slug}`}>
                  {p.imagen_url
                    ? <img src={p.imagen_url} alt="" loading="lazy" />
                    : <img src={asset('logos/logo-vr.png')} alt="" className="tarjeta__vacia" />}
                  <span>{p.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
