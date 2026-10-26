/** Ruta de un archivo de /public respetando la carpeta base (necesario en GitHub Pages: /nombre-repo/). */
export const asset = (ruta) => `${import.meta.env.BASE_URL}${ruta.replace(/^\//, '')}`;
