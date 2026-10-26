import { useEffect } from 'react';

export function usePageTitle(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | Vertical Rope` : 'Vertical Rope | Equipos para trabajo en alturas';
  }, [titulo]);
}
