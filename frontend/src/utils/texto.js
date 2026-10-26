// Frases que se colaron al copiar el texto de otra página (botones, enlaces, etc.)
const RUIDO = [/DESCARGA\s+FICHAS?\s+T[ÉE]CNICAS?/gi];

export function limpiar(texto) {
  let s = String(texto || '');
  RUIDO.forEach((r) => { s = s.replace(r, ''); });
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Texto plano de una línea para las tarjetas. */
export function resumenPlano(texto, max = 150) {
  const s = limpiar(texto).replace(/•/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/** Convierte el texto de la descripción en bloques: títulos, párrafos y listas. */
export function aBloques(texto) {
  const lineas = limpiar(texto).split('\n').map((l) => l.trim());
  const bloques = [];
  let lista = null;

  const siguienteNoVacia = (i) => lineas.slice(i + 1).find((l) => l !== '');

  lineas.forEach((linea, i) => {
    if (!linea) { lista = null; return; }
    if (linea.startsWith('•')) {
      if (!lista) { lista = { tipo: 'ul', items: [] }; bloques.push(lista); }
      lista.items.push(linea.replace(/^•\s*/, ''));
      return;
    }
    lista = null;
    const sig = siguienteNoVacia(i);
    const esTitulo = linea.length <= 45 && !/[.:;,]$/.test(linea) && sig && sig.startsWith('•');
    bloques.push({ tipo: esTitulo ? 'h' : 'p', texto: linea });
  });
  return bloques;
}
