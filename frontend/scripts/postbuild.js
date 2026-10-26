// GitHub Pages no sabe de rutas de React: si alguien abre /productos directo, sirve 404.html.
// Copiamos index.html como 404.html para que la aplicación cargue igual.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'));
console.log('✔ dist/404.html creado');
