import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NoEncontrado() {
  usePageTitle('Página no encontrada');
  return (
    <div className="contenedor seccion no-encontrado">
      <h1>404</h1>
      <p>La página o el producto que buscas no existe.</p>
      <Link to="/productos" className="btn">Ver el catálogo</Link>
    </div>
  );
}
