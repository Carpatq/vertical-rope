export const EMPRESA = {
  nombre: 'Vertical Rope',
  eslogan: 'Soluciones seguras, confiables y certificadas',
  descripcion:
    'Somos una empresa especializada en la venta y comercialización de equipos para trabajo en alturas y elementos de protección personal, ofreciendo soluciones seguras, confiables y certificadas para la protección de los trabajadores en diversos sectores industriales.',
  descripcionCorta:
    'Equipos certificados para trabajo en alturas y elementos de protección personal, diseñados para garantizar la seguridad y protección de los trabajadores en cualquier entorno laboral.',
  whatsapp: (import.meta.env.VITE_WHATSAPP || '').replace(/\D/g, ''),
  email: (import.meta.env.VITE_EMAIL || '').trim(),
  telefono: (import.meta.env.VITE_TELEFONO || '').trim(),
  direccion: (import.meta.env.VITE_DIRECCION || '').trim(),
};
