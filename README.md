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


Después de agregar o cambiar estas variables, crea un nuevo deployment de Production para que queden activas.
El ingreso usa una única credencial privada configurada en Vercel y no requiere crear usuarios de Supabase Auth. Supabase sigue usándose para el inventario. La sesión se guarda en una cookie firmada para funcionar con las funciones serverless de Vercel.

No agregues la contraseña al repositorio. Vercel la compara al iniciar sesión.

## Funcionalidades

- Catálogo público con productos, precio, stock y estado.
- Panel administrador autenticado.
- Añadir, editar y eliminar equipos.
- Estado configurable: Disponible, En revisión, Sin stock, Vendido.
