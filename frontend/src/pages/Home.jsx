import { Link } from 'react-router-dom';
import { api } from '../api';
import { EMPRESA } from '../config';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';
import ProductCard from '../components/ProductCard';
import CotizarBoton from '../components/CotizarBoton';

export default function Home() {
  usePageTitle('');
  const lineas = useApi((s) => api.lineas(s), []);
  const nuevos = useApi((s) => api.productos({ orden: 'recientes', limit: 8 }, s), []);

  return (
    <>
      <section className="hero">
        <div className="contenedor hero__contenido">
          <p className="hero__etiqueta">Trabajo en alturas · Protección personal</p>
          <h1>Equipos certificados para trabajar en alturas con seguridad</h1>
          <p className="hero__texto">{EMPRESA.descripcionCorta}</p>
          <div className="hero__acciones">
            <Link to="/productos" className="btn btn--claro">Ver catálogo</Link>
            <CotizarBoton className="btn btn--contorno-claro">Solicitar asesoría</CotizarBoton>
          </div>
        </div>
      </section>

      <section className="seccion contenedor">
        <h2 className="seccion__titulo">Líneas de producto</h2>
        <div className="lineas">
          {(lineas.data || []).map((l) => (
            <Link key={l.slug} to={`/productos?linea=${l.slug}`} className="linea">
              <span className="linea__nombre">{l.nombre}</span>
              <span className="linea__cuenta">{l.total} productos</span>
            </Link>
          ))}
          {lineas.error && <p className="aviso">No pudimos cargar las líneas de producto.</p>}
        </div>
      </section>

      <section className="seccion seccion--gris">
        <div className="contenedor">
          <div className="seccion__cabecera">
            <h2 className="seccion__titulo">Productos nuevos</h2>
            <Link to="/productos" className="enlace-flecha">Ver todos →</Link>
          </div>
          <div className="grilla grilla--4">
            {(nuevos.data?.data || []).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          {nuevos.error && <p className="aviso">No pudimos cargar los productos.</p>}
        </div>
      </section>

      <section className="seccion contenedor">
        <div className="valores">
          <div><h3>Equipos certificados</h3><p>Productos diseñados para cumplir con los requisitos de seguridad del trabajo en alturas.</p></div>
          <div><h3>Soluciones confiables</h3><p>Protección para los trabajadores en diversos sectores industriales.</p></div>
          <div><h3>Asesoría personalizada</h3><p>Te ayudamos a elegir el equipo adecuado para tu labor.</p></div>
        </div>
      </section>
    </>
  );
}
