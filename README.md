# Vertical Rope – Catálogo web

Catálogo de equipos para trabajo en alturas y elementos de protección personal.
**No muestra precios**: las cotizaciones se piden por WhatsApp.

Es un **sitio 100 % estático** (React + Vite): no necesita servidor ni base de datos.
Los productos salen de un Excel y se convierten en un archivo JSON al compilar.

```
datos/catalogo_pretecsi_con_imagenes.xlsx ──▶ (npm run dev / build) ──▶ catalogo.json ──▶ sitio web
frontend/public/imagenes/*.jpg ────────────────────────────────────────────────────────▶ sitio web
```

## Estructura

```
vertical-rope/
├─ datos/                    Excel del catálogo (fuente de los datos)
├─ frontend/
│  ├─ src/                   componentes, páginas y estilos
│  ├─ public/imagenes/       imágenes de los productos
│  ├─ public/logos/          logos de la marca
│  ├─ scripts/               genera el catálogo desde el Excel
│  └─ .env.example           datos de contacto (WhatsApp, etc.)
├─ .github/workflows/        publicación automática en GitHub Pages
├─ herramientas/             scripts Python (extraer datos, descargar y convertir imágenes)
├─ backend/                  OPCIONAL: API + MySQL para una futura versión dinámica
└─ package.json              comandos del proyecto
```

## Requisitos

- Node.js 18 o superior
- Git

## Uso en tu computador

```
npm run instalar        (una sola vez)
npm run dev             abre http://localhost:5173
```

1. Copia `frontend/.env.example` como `frontend/.env` y escribe el WhatsApp
   (solo dígitos con indicativo, por ejemplo `573001234567`).
2. Reinicia `npm run dev` cada vez que cambies el `.env`.

## Cómo actualizar el catálogo

1. Edita el Excel en `datos/` (agrega, quita o corrige productos).
2. Si agregas productos nuevos, pon sus imágenes en `frontend/public/imagenes/`
   y escribe el nombre del archivo en la columna **Imagen local**.
3. Ejecuta `npm run dev` para verlo. El catálogo se regenera solo, no hay nada más que importar.
4. Sube los cambios a GitHub (ver abajo) y el sitio se actualiza.

## Publicar el sitio

El comando `npm run build` genera la carpeta `frontend/dist/`: es el sitio completo.
Hay dos formas gratuitas de publicarlo sin usar tu computador:

### Opción A – GitHub Pages (todo dentro de GitHub)

> ⚠ **Con el plan gratuito de GitHub, el repositorio debe ser PÚBLICO**: cualquiera podrá ver el código,
> el Excel y las imágenes. Además, las condiciones de GitHub Pages no permiten usarlo como hosting
> gratuito para "ejecutar un negocio en línea" o sitios dirigidos principalmente a transacciones comerciales;
> un catálogo de empresa es una zona gris. Léelas antes:
> https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

1. Crea el repositorio en GitHub como **público** y sube el proyecto.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. En **Settings → Secrets and variables → Actions → pestaña Variables → New repository variable**, crea:
   - `VITE_WHATSAPP` = tu número (ej. `573001234567`)
   - opcionales: `VITE_EMAIL`, `VITE_TELEFONO`, `VITE_DIRECCION`
4. Cada `git push` a la rama `main` ejecuta el workflow (pestaña **Actions**) y publica el sitio en
   `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`
5. Si usas un dominio propio, crea también la variable `VITE_BASE` con el valor `/`.

### Opción B – Cloudflare Pages o Netlify, conectados a GitHub (permite repositorio PRIVADO)

Se publica igual de gratis y se actualiza solo con cada `git push`, pero el sitio vive en el hosting
y el repositorio puede seguir siendo privado. Configuración típica (los nombres de los menús pueden variar):

| Campo | Valor |
|---|---|
| Directorio raíz | `frontend` |
| Comando de compilación | `npm run build` |
| Directorio de salida | `dist` |
| Variables de entorno | `VITE_WHATSAPP`, `VITE_EMAIL`, … y `NODE_VERSION` = `20` |

## Subir cambios a GitHub

```
git add .
git status        ← revisa que NO aparezca ningún .env
git commit -m "Describe el cambio"
git push
```

## Seguridad

- Los archivos `.env` **nunca** se suben a Git; solo las plantillas `.env.example`.
- En un sitio estático **todo lo que está en el repositorio y en el sitio es público**: no pongas
  contraseñas ni datos privados en ningún archivo.

## Backend opcional (MySQL)

La carpeta `backend/` conserva la API y el importador a MySQL de la versión anterior.
**El sitio publicado no los usa.** Quedan por si más adelante se quiere una versión dinámica
(por ejemplo, con un panel para editar productos). Para usarlos: copiar `backend/.env.example` como
`backend/.env`, ejecutar `backend/schema.sql` en MySQL y luego `npm run instalar:api`,
`npm --prefix backend run importar` y `npm run api`.
