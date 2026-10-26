import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE = carpeta donde se publica el sitio.
//  - Dominio propio o Cloudflare/Netlify:        "/"  (por defecto)
//  - GitHub Pages de un repositorio:             "/nombre-del-repo/"  (lo pone el workflow solo)
function normalizarBase(b) {
  if (!b) return '/';
  return `/${b.replace(/^\/+|\/+$/g, '')}/`.replace('//', '/');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: normalizarBase(env.VITE_BASE),
    plugins: [react()],
    server: { port: 5173 },
  };
});
