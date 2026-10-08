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

## Acceso admin con Supabase Auth

En Supabase, crea y confirma tu usuario desde **Authentication → Users**. Desactiva el registro público de usuarios para que nadie más pueda crear una cuenta. El panel valida el correo y la contraseña con Supabase Auth y solo permite el correo indicado en `SUPABASE_ADMIN_EMAIL`.

En Render → **Environment**, configura `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ADMIN_EMAIL` y `SESSION_SECRET`. `SESSION_SECRET` debe ser un valor aleatorio largo. Nunca agregues contraseñas al repositorio.

## Funcionalidades

- Catálogo público con productos, precio, stock y estado.
- Panel administrador autenticado.
- Añadir, editar y eliminar equipos.
- Estado configurable: Disponible, En revisión, Sin stock, Vendido.
