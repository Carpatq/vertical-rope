function ventana(actual, total) {
  const paginas = new Set([1, total, actual - 1, actual, actual + 1]);
  const orden = [...paginas].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const salida = [];
  orden.forEach((n, i) => {
    if (i > 0 && n - orden[i - 1] > 1) salida.push('…');
    salida.push(n);
  });
  return salida;
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Página anterior">‹</button>
      {ventana(page, totalPages).map((n, i) =>
        n === '…' ? (
          <span key={`e${i}`} className="paginacion__puntos">…</span>
        ) : (
          <button
            key={n}
            className={n === page ? 'activo' : ''}
            aria-current={n === page ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        )
      )}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Página siguiente">›</button>
    </nav>
  );
}
