---
name: nextjs
description: >-
  Guidelines, architectural standards, and conventions for developing the DonaKit frontend
  with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4. Use this skill
  when creating or updating pages, components, client/server components, API clients, and UI design system elements.
---

# Next.js Frontend Development Guide (DonaKit)

Directrices, arquitectura y estándares de desarrollo para el frontend de **DonaKit**, basado en **Next.js 16 (App Router)**, **React 19**, **TypeScript** y **Tailwind CSS v4**.

---

## 📌 Entorno y Versiones Oficiales

| Herramienta / Paquete | Versión Exacta |
| :--- | :--- |
| **Node.js** | `v24.21.0` (definida en `.nvmrc`) |
| **npm** | `v11.19.0` |
| **Next.js** | `16.4.0` (App Router) |
| **React / React DOM** | `19.3.0` |
| **Tailwind CSS** | `^4.0.0` (con `@tailwindcss/turbopack`) |
| **TypeScript** | `^5.0.0` |
| **ESLint** | `^9.0.0` |

---

## 🏗️ Arquitectura y Estructura del Frontend

```text
donakit-frontend/
├── app/                        # Capa de Enrutamiento (App Router)
│   ├── (auth)/                 # Route Group: Páginas de autenticación
│   ├── (dashboard)/            # Route Group: Vistas del panel principal
│   ├── api/                    # Route Handlers internos (route.ts)
│   ├── favicon.ico
│   ├── globals.css             # Tokens globales y estilos Tailwind v4
│   ├── layout.tsx              # Root Layout
│   ├── not-found.tsx           # Página 404
│   ├── error.tsx               # Error Boundary
│   ├── loading.tsx             # Skeleton de carga con Suspense
│   └── page.tsx                # Landing / Home
│
├── components/                 # Componentes de interfaz
│   ├── ui/                     # Componentes primitivos reutilizables (Button, Input, Card, Modal)
│   ├── layout/                 # Estructuras comunes (Navbar, Sidebar, Footer)
│   └── features/               # Componentes ligados a dominios (DonationForm, CampaignList)
│
├── services/                   # Capa de consumo de API (Backend NestJS)
│   ├── api-client.ts           # Fetch centralizado con tipado, headers y manejo de errores
│   └── ...service.ts           # Servicios por dominio (campaign.service.ts, auth.service.ts)
│
├── hooks/                      # Custom React Hooks (useAuth, useDebounce, useMediaQuery)
├── context/                    # React Context para estado global de cliente
├── types/                      # Interfaces y tipos TypeScript
├── lib/                        # Utilidades puras (cn helper, formateadores de fecha/moneda)
├── constants/                  # Constantes (endpoints, rutas, regex)
└── public/                     # Assets estáticos
```

---

## ⚡ Reglas Clave de Next.js 16 y React 19

1. **Server Components por Defecto**:
   - Todo componente dentro de `app/` es Server Component por defecto para optimizar SEO, reducir bundle y acelerar el render inicial.
2. **Uso Restringido de `'use client'`**:
   - Agregar `'use client'` **únicamente** en componentes que requieran interactividad (`useState`, `useEffect`, event listeners del navegador como `onClick`, o custom hooks del cliente).
   - Mantener los Client Components lo más pequeños y al fondo del árbol de componentes posible (*push state down*).
3. **APIs Asíncronas en Next.js 16**:
   - `params` y `searchParams` en páginas y layout son `Promise`:
     ```typescript
     interface PageProps {
       params: Promise<{ id: string }>;
       searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
     }
     export default async function Page({ params, searchParams }: PageProps) {
       const { id } = await params;
       const query = await searchParams;
       // ...
     }
     ```
   - `cookies()` y `headers()` de `next/headers` también deben llamarse con `await`:
     ```typescript
     import { cookies } from 'next/headers';
     const cookieStore = await cookies();
     ```
4. **Tailwind CSS v4**:
   - Se importa con `@import "tailwindcss";` en `globals.css`.
   - No usar directivas deprecadas de v3 (`@tailwind base`, `@tailwind components`, `@tailwind utilities`).
   - Respetar los tokens de color y contraste accesibles definidos en `DESIGN_SYSTEM.md`.
5. **Consumo de API Centralizado**:
   - **Nunca** hacer llamadas `fetch` dispersas dentro de componentes de UI. Usar siempre las funciones del directorio `services/`.
   - Conectar al backend respetando la URL base (`http://localhost:3000` por defecto en desarrollo).

---

## 🧪 Comandos de Ejecución y Calidad

```bash
# Servidor de desarrollo en puerto 3001 (para evitar colisión con el backend en 3000)
npm run dev -- -p 3001

# Linter de código
npm run lint

# Build de producción
npm run build

# Servidor de producción
npm run start
```

---

## 🌿 Convención Git y Ramas

1. `US-XXX/ST-XX` (Subtarea) ➔ PR hacia `ft/US-XXX`.
2. `ft/US-XXX` (User Story) ➔ PR hacia `development`.
3. `development` (Integración) ➔ PR hacia `main`.
