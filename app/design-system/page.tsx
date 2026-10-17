import type { Metadata } from "next";
import { Icon, iconNames } from "@/lib/icons";

export const metadata: Metadata = {
  title: "Design System",
  description: "Tokens, tipografía e íconos de DonaKit.",
};

/* ============================================================================
   Página de verificación del design system — US-006
   ----------------------------------------------------------------------------
   Sirve para dos cosas: comprobar que los tokens funcionan de verdad, y tener
   algo concreto que mostrar en la Sprint Review.

   Ruta: /design-system
   ========================================================================== */

const NAVY = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const RED = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const INK = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-10">
      <h2 className="text-2xl">{title}</h2>
      {subtitle && (
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Ramp({
  label,
  prefix,
  steps,
}: {
  label: string;
  prefix: string;
  steps: readonly number[];
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-text-secondary">{label}</p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {steps.map((s) => (
          <div key={s}>
            {/* Tailwind NO detecta clases armadas con plantillas (`bg-${x}`):
                escanea strings literales en el código. Acá leemos la variable
                CSS que @theme ya publicó en :root, que sí es dinámica. */}
            <div
              className="h-14 rounded-md border border-border"
              style={{ backgroundColor: `var(--color-${prefix}-${s})` }}
            />
            <p className="mt-1 text-center text-xs text-text-muted">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header>
        <p className="text-sm font-medium text-red-700">US-006 · Épica Arquitectura</p>
        <h1 className="mt-1 text-3xl">Design System de DonaKit</h1>
        <p className="mt-3 max-w-2xl text-lg text-text-secondary">
          Paquete de diseño estandarizado: paleta, tipografía e íconos. Todo lo
          que se construya de acá en adelante usa estos tokens y ningún valor suelto.
        </p>
      </header>

      {/* ------------------------------------------------------------ Colores */}
      <Section
        title="Paleta"
        subtitle="Las 25 combinaciones texto/fondo del sistema cumplen WCAG 2.1 AA. Los pasos 200 y 300 quedan solo para separadores decorativos."
      >
        <Ramp label="Navy — color institucional" prefix="navy" steps={NAVY} />
        <Ramp label="Red — urgencia y donación" prefix="red" steps={RED} />
        <Ramp label="Ink — texto, fondos y bordes" prefix="ink" steps={INK} />

        <p className="mb-2 mt-8 text-sm font-medium text-text-secondary">
          Semánticos
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-success-bg p-4">
            <p className="text-sm font-semibold text-success">Éxito</p>
            <p className="mt-1 text-xs text-success">Placa generada</p>
          </div>
          <div className="rounded-lg bg-warning-bg p-4">
            <p className="text-sm font-semibold text-warning">Atención</p>
            <p className="mt-1 text-xs text-warning">Vence en 2 días</p>
          </div>
          <div className="rounded-lg bg-danger-bg p-4">
            <p className="text-sm font-semibold text-danger">Error</p>
            <p className="mt-1 text-xs text-danger">Falta el grupo</p>
          </div>
          <div className="rounded-lg bg-info-bg p-4">
            <p className="text-sm font-semibold text-info">Dato</p>
            <p className="mt-1 text-xs text-info">Llevá tu DNI</p>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- Tipografía */}
      <Section
        title="Tipografía"
        subtitle="Outfit para títulos, Inter para texto. Dos familias y ninguna más: cada fuente extra suma peso, y la landing se abre desde WhatsApp con datos móviles."
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs text-text-muted">text-4xl · Outfit · dato protagonista</p>
            <p className="font-display text-4xl font-bold text-navy-800">0+ urgente</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">text-3xl · Outfit · título de página</p>
            <h3 className="text-3xl">Ayudá a Marina a conseguir donantes</h3>
          </div>
          <div>
            <p className="text-xs text-text-muted">text-2xl · Outfit · título de sección</p>
            <h4 className="text-2xl">Requisitos para donar</h4>
          </div>
          <div>
            <p className="text-xs text-text-muted">text-base · Inter · cuerpo</p>
            <p className="max-w-2xl text-base">
              Tenés que ser mayor de 18 años, pesar más de 50 kilos y no estar en
              ayunas. Llevá tu DNI. La extracción dura menos de diez minutos.
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">text-sm · Inter · texto auxiliar</p>
            <p className="text-sm text-text-secondary">
              La información es orientativa; la evaluación final la hace el
              profesional del centro de donación.
            </p>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------------- Íconos */}
      <Section
        title="Íconos"
        subtitle="Catálogo tipado sobre lucide-react. Los componentes piden el concepto del producto, no el nombre del dibujo."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
          {iconNames.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-3"
            >
              <Icon name={name} className="text-navy-700" />
              <span className="text-center text-xs text-text-muted">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------------- Aplicación */}
      <Section
        title="Tokens aplicados"
        subtitle="Tres ejemplos que prueban que el sistema funciona end to end. No son componentes definitivos: eso llega con sus propias historias."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-surface-brand px-5 py-3 text-base font-medium text-text-on-brand shadow-card transition-opacity hover:opacity-90"
          >
            <Icon name="placa" size={20} />
            Generar el kit
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-surface-accent px-5 py-3 text-base font-medium text-text-on-brand shadow-card transition-opacity hover:opacity-90"
          >
            <Icon name="compartir" size={20} />
            Compartir ahora
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-border-interactive px-5 py-3 text-base font-medium text-navy-700 transition-colors hover:bg-navy-50"
          >
            <Icon name="descargar" size={20} />
            Descargar placas
          </button>
        </div>

        <div className="mt-6 max-w-md rounded-lg border border-border bg-surface p-5 shadow-card">
          <div className="flex items-start gap-3">
            <Icon name="grupoSanguineo" className="shrink-0 text-red-700" />
            <div>
              <p className="font-display text-xl font-semibold text-navy-800">
                Se necesita sangre 0+
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Hospital Garrahan · hasta el 28 de octubre
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-warning-bg px-3 py-2">
            <Icon name="fechaLimite" size={20} className="text-warning" />
            <p className="text-sm font-medium text-warning">Quedan 3 días</p>
          </div>
        </div>
      </Section>

      <footer className="border-t border-border py-8">
        <p className="text-sm text-text-muted">
          DonaKit · Grupo 6 · US-006 — Paquete de diseño estandarizado
        </p>
      </footer>
    </main>
  );
}
