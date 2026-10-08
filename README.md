# iPhone Stock Web

Pequeña web para mostrar stock y estado de iPhones, con un panel administrativo para gestionar el inventario.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Ejecutar la aplicación

```bash
npm start
```

La web quedará disponible en:

- Catálogo público: http://localhost:3000/
- Panel admin: http://localhost:3000/admin

## Deploy en Vercel

Importa el repositorio en Vercel y configura estas variables en **Project → Settings → Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_ADMIN_EMAIL`
- `SESSION_SECRET` — genera un valor aleatorio largo.

En Supabase, crea y confirma tu usuario desde **Authentication → Users**. Desactiva el registro público para que nadie más pueda crear una cuenta. El panel valida el correo y la contraseña con Supabase Auth y solo permite el correo indicado en `SUPABASE_ADMIN_EMAIL`. La sesión se guarda en una cookie firmada para funcionar con las funciones serverless de Vercel.

No agregues la contraseña al repositorio ni a las variables de Vercel; Supabase Auth la verifica durante el inicio de sesión.

## Funcionalidades

- Catálogo público con productos, precio, stock y estado.
- Panel administrador autenticado.
- Añadir, editar y eliminar equipos.
- Estado configurable: Disponible, En revisión, Sin stock, Vendido.
