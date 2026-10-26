import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { EMPRESA } from '../config';
import { urlCotizacion } from '../utils/contacto';
import { asset } from '../utils/assets';

export default function Header() {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const contacto = urlCotizacion(null);

  const buscar = (e) => {
    e.preventDefault();
    const texto = q.trim();
    navigate(texto ? `/productos?q=${encodeURIComponent(texto)}` : '/productos');
    setAbierto(false);
  };

  const cerrar = () => setAbierto(false);

  return (
    <header className="header">
      <div className="header__franja">{EMPRESA.eslogan}</div>
      <div className="contenedor header__barra">
        <Link to="/" className="marca" onClick={cerrar} aria-label="Vertical Rope - Inicio">
          <img src={asset('logos/logo-vr.png')} alt="" className="marca__logo" width="52" height="52" />
          <span className="marca__texto">
            VERTICAL <strong>ROPE</strong>
          </span>
        </Link>

        <button
          className="header__menu-btn"
          aria-label="Abrir menú"
          aria-expanded={abierto}
          onClick={() => setAbierto((a) => !a)}
        >
          <span /><span /><span />
        </button>

        <nav className={`nav ${abierto ? 'nav--abierto' : ''}`}>
          <NavLink to="/" end onClick={cerrar}>Inicio</NavLink>
          <NavLink to="/productos" onClick={cerrar}>Productos</NavLink>
          {contacto && (
            <a href={contacto} target="_blank" rel="noopener noreferrer" onClick={cerrar}>Contáctanos</a>
          )}
          <form className="nav__buscar" role="search" onSubmit={buscar}>
            <input
              type="search"
              placeholder="Buscar productos…"
              aria-label="Buscar productos"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" aria-label="Buscar">⌕</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
