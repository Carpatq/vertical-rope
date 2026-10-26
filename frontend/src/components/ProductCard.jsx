import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resumenPlano } from '../utils/texto';
import CotizarBoton from './CotizarBoton';
import { asset } from '../utils/assets';

export default function ProductCard({ p }) {
  const [fallo, setFallo] = useState(false);
  const categorias = p.categorias.slice(0, 2).map((c) => c.nombre).join(', ');
  const destino = `/producto/${p.slug}`;

  return (
    <article className="tarjeta">
      <Link to={destino} className="tarjeta__imagen" aria-label={p.nombre}>
        {p.imagen_url && !fallo ? (
          <img src={p.imagen_url} alt={p.nombre} loading="lazy" onError={() => setFallo(true)} />
        ) : (
          <img src={asset('logos/logo-vr.png')} alt="" className="tarjeta__vacia" />
        )}
      </Link>
      <div className="tarjeta__cuerpo">
        {categorias && <p className="tarjeta__cats">{categorias}</p>}
        <h3 className="tarjeta__titulo"><Link to={destino}>{p.nombre}</Link></h3>
        <p className="tarjeta__resumen">{resumenPlano(p.resumen)}</p>
        <div className="tarjeta__acciones">
          <Link to={destino} className="btn btn--borde btn--sm">Ver detalle</Link>
          <CotizarBoton producto={p} className="btn btn--sm">Cotizar</CotizarBoton>
        </div>
      </div>
    </article>
  );
}
