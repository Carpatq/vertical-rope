import { EMPRESA } from '../config';

/** Enlace para pedir cotización por WhatsApp (o por correo si no hay WhatsApp). null si no hay ninguno. */
export function urlCotizacion(producto) {
  const mensaje = producto
    ? `Hola, quisiera cotizar el producto: ${producto.nombre}${producto.sku ? ` (Ref. ${producto.sku})` : ''}.`
    : 'Hola, quisiera recibir asesoría y cotización de equipos para trabajo en alturas.';

  if (EMPRESA.whatsapp) return `https://wa.me/${EMPRESA.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  if (EMPRESA.email) {
    const asunto = producto ? `Cotización: ${producto.nombre}` : 'Solicitud de cotización';
    return `mailto:${EMPRESA.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;
  }
  return null;
}
