import { urlCotizacion } from '../utils/contacto';

/** Botón "Cotizar". No se muestra si la empresa aún no configuró WhatsApp ni correo. */
export default function CotizarBoton({ producto, className = 'btn', children = 'Solicitar cotización' }) {
  const url = urlCotizacion(producto);
  if (!url) return null;
  return (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
