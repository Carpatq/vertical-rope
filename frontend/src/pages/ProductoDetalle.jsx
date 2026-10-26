import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';
import { aBloques, limpiar } from '../utils/texto';
import ProductCard from '../components/ProductCard';
import CotizarBoton from '../components/CotizarBoton';
import NoEncontrado from './NoEncontrado';
import { asset } from '../utils/assets';

function Descripcion({ texto }) {
  return (
    <div className="descripcion">
      {aBloques(texto).map((b, i) => {
        if (b.tipo === 'h') return <h3 key={i}>{b.texto}</h3>;
        if (b.tipo === 'ul') return <ul key={i}>{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>;
        return <p key={i}>{b.texto}</p>;
      })}
    </div>
  );
}

export default function ProductoDetalle() {
  const { slug } = useParams();
  const { data: p, error, loading } = useApi((s) => api.producto(slug, s), [slug]);
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [slug]);
  usePageTitle(p?.nombre);

  if (error?.status === 404) return <NoEncontrado />;
  if (error) {
    return (
      <div className="contenedor aviso aviso--error seccion">
        <p>No pudimos cargar el producto. Recarga la página o inténtalo de nuevo en un momento.</p>
        <Link to="/productos" className="btn btn--sm">Volver al catálogo</Link>
      </div>
    );
  }
  if (loading || !p) return <div className="contenedor seccion"><div className="esqueleto esqueleto--detalle" /></div>;

  const corta = limpiar(p.descripcion_corta);
  const larga = limpiar(p.descripcion);
  const mostrarCorta = corta && !larga.includes(corta.slice(0, 40));
  const categoria = p.categorias[0];

  return (
    <div className="contenedor detalle">
      <nav className="migas" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link> / <Link to="/productos">Productos</Link>
        {categoria && <> / <Link to={`/productos?categoria=${categoria.slug}`}>{categoria.nombre}</Link></>}
        {' '}/ <span>{p.nombre}</span>
      </nav>

      <div className="detalle__principal">
        <div className="detalle__imagen">
          {p.imagen_url && !fallo
            ? <img src={p.imagen_url} alt={p.nombre} onError={() => setFallo(true)} />
            : <img src={asset('logos/logo-vr.png')} alt="" className="tarjeta__vacia" />}
        </div>

        <div className="detalle__info">
          <h1>{p.nombre}</h1>
          {p.sku && <p className="detalle__sku">Referencia: <strong>{p.sku}</strong></p>}

          <div className="detalle__tags">
            {p.lineas.map((l) => <Link key={l.slug} to={`/productos?linea=${l.slug}`} className="tag tag--verde">{l.nombre}</Link>)}
            {p.categorias.map((c) => <Link key={c.slug} to={`/productos?categoria=${c.slug}`} className="tag">{c.nombre}</Link>)}
          </div>

          {mostrarCorta && <Descripcion texto={corta} />}

          <div className="detalle__acciones">
            <CotizarBoton producto={p} />
            <Link to="/productos" className="btn btn--borde">Volver al catálogo</Link>
          </div>
        </div>
      </div>

      {larga && (
        <section className="detalle__descripcion">
          <h2>Descripción</h2>
          <Descripcion texto={larga} />
        </section>
      )}
      {!larga && !mostrarCorta && corta && (
        <section className="detalle__descripcion">
          <h2>Descripción</h2>
          <Descripcion texto={corta} />
        </section>
      )}

      {p.relacionados?.length > 0 && (
        <section className="detalle__relacionados">
          <h2>Productos relacionados</h2>
          <div className="grilla grilla--4">
            {p.relacionados.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
