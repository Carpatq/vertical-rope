import { useEffect, useState } from 'react';

/** Ejecuta fn(signal) cuando cambian las dependencias. Conserva los datos anteriores mientras recarga. */
export function useApi(fn, deps) {
  const [estado, setEstado] = useState({ data: null, error: null, loading: true });

  useEffect(() => {
    const ctrl = new AbortController();
    setEstado((s) => ({ ...s, loading: true, error: null }));
    fn(ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setEstado({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (ctrl.signal.aborted || error.name === 'AbortError') return;
        setEstado({ data: null, error, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return estado;
}
