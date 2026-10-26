import { Link } from 'react-router-dom';
import { EMPRESA } from '../config';
import { urlCotizacion } from '../utils/contacto';
import { asset } from '../utils/assets';

export default function Footer() {
  const contacto = urlCotizacion(null);
  return (
    <footer className="footer" id="contacto">
      <div className="contenedor footer__grid">
        <div>
          <img src={asset('logos/logo-completo-oscuro.png')} alt="Vertical Rope" className="footer__logo" width="150" height="150" />
        </div>
        <div>
          <h3>Vertical Rope</h3>
          <p>{EMPRESA.descripcionCorta}</p>
        </div>
        <div>
          <h3>Enlaces</h3>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/productos">Catálogo de productos</Link></li>
          </ul>
        </div>
        <div>
          <h3>Contacto</h3>
          <ul>
            {EMPRESA.telefono && <li>{EMPRESA.telefono}</li>}
            {EMPRESA.email && <li><a href={`mailto:${EMPRESA.email}`}>{EMPRESA.email}</a></li>}
            {EMPRESA.direccion && <li>{EMPRESA.direccion}</li>}
            {contacto && (
              <li>
                <a href={contacto} target="_blank" rel="noopener noreferrer">Escríbenos para cotizar</a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="footer__legal">
        © {new Date().getFullYear()} Vertical Rope. Todos los derechos reservados.
      </div>
    </footer>
  );
}
