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

## Configuración de acceso admin

Configura `ADMIN_USERNAME` y `ADMIN_PASSWORD` como variables privadas de entorno. En Render, agrégalas en **Environment**; no las guardes en el repositorio ni las compartas en el chat. El acceso admin queda deshabilitado hasta que ambas estén configuradas.

Configura también `SESSION_SECRET` con un valor aleatorio largo para mantener las sesiones seguras entre reinicios. En Render, estas tres variables deben cargarse como secretos.

## Funcionalidades

- Catálogo público con productos, precio, stock y estado.
- Panel administrador autenticado.
- Añadir, editar y eliminar equipos.
- Estado configurable: Disponible, En revisión, Sin stock, Vendido.
