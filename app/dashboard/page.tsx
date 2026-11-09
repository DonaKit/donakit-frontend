import { Suspense } from "react";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { PanelCampanias } from "@/components/dashboard/panel-campanias";
import { INSTITUCION } from "@/lib/institucion";

export const metadata = {
  title: "Dashboard de Campañas y Métricas · DonaKit",
  description: "Monitoreo de solicitudes, donantes asistidos y métricas de visitas.",
  robots: { index: false, follow: false },
};

async function CabeceraDashboard() {
  const session = await auth();

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-40 shadow-2xs">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo y contexto institucional */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-700 text-white font-display font-bold text-sm">
                DK
              </span>
              <span className="font-display font-bold text-lg text-navy-800 tracking-tight group-hover:text-navy-600 transition-colors">
                DonaKit
              </span>
            </Link>
            <span className="hidden sm:inline-block h-4 w-px bg-border" />
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-700">
              {INSTITUCION.nombre}
            </span>
          </div>

          {/* Información de usuario y acciones */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-text-primary">
                {session?.user?.name ?? "Administrador"}
              </span>
              <span className="text-[11px] text-text-muted">
                {session?.user?.email ?? ""}
              </span>
            </div>

            <Link
              href="/nuevo"
              className="hidden sm:inline-flex items-center rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-ink-50 transition-colors"
            >
              Nuevo Pedido
            </Link>

            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-ink-50 flex flex-col">
      <Suspense
        fallback={
          <header className="h-16 border-b border-border bg-surface animate-pulse" />
        }
      >
        <CabeceraDashboard />
      </Suspense>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 tracking-tight">
            Dashboard de Campañas y Métricas
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Seguimiento en tiempo real de visitas a landings, avance de donantes y gestión institucional de solicitudes.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-surface border border-border animate-pulse" />
                ))}
              </div>
              <div className="h-96 rounded-xl bg-surface border border-border animate-pulse" />
            </div>
          }
        >
          <PanelCampanias />
        </Suspense>
      </main>
    </div>
  );
}

