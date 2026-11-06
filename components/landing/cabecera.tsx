import { Icon } from "@/lib/icons";
import type { CampaniaPublica } from "@/lib/api";

/* ============================================================================
   US-13/ST-02 — Cabecera de la landing con el grupo sanguíneo
   ----------------------------------------------------------------------------
   Lo primero que tiene que poder responderse quien abre el enlace es "¿esto
   es para mí?", y eso lo decide el grupo sanguíneo. Por eso el grupo va en
   una tarjeta grande, en rojo sobre blanco, antes que cualquier otra cosa; el
   nombre del paciente va al lado, como contexto.

   Misma jerarquía que las placas (US-11/ST-01): quien llega desde una placa
   reconoce el pedido de un vistazo.

   Contraste medido (WCAG): nombre blanco sobre azul de marca 10,78:1; grupo
   rojo 700 sobre blanco 7,55:1; textos secundarios sobre azul, 5,23:1 o más.

   El h1 lleva el color explícito: los estilos globales pintan todos los
   encabezados con el color de texto principal, y sin esto el nombre del
   paciente salía azul oscuro sobre el fondo azul.
   ========================================================================== */

export function Cabecera({ c }: { c: CampaniaPublica }) {
  const todos = c.grupo === "TODOS";
  return (
    <header className="bg-surface-brand text-text-on-brand">
      <div className="mx-auto w-full max-w-[560px] px-4 pb-8 pt-5">
        <p className="font-display text-lg font-bold tracking-tight">
          Dona<span className="text-red-300">Kit</span>
        </p>

        <p className="mt-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-200">
          <Icon name="donacion" size={18} />
          Se necesitan donantes de sangre
        </p>
        <h1 className="mt-2 text-3xl leading-tight text-text-on-brand wrap-anywhere">
          <span className="block text-base font-normal text-navy-200">Para</span>
          {c.nombre}
        </h1>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl bg-surface px-5 py-4 text-text-primary shadow-lg">
          <p className="text-sm font-semibold uppercase leading-snug tracking-wide text-text-secondary">
            Grupo
            <br />y factor
          </p>
          <p
            className={`font-display font-bold leading-none text-red-700 ${todos ? "text-4xl" : "text-6xl"}`}
            aria-label={todos ? "Cualquier grupo sanguíneo" : `Grupo ${c.grupo}`}
          >
            {todos ? "Todos" : c.grupo}
          </p>
        </div>
        {todos && (
          <p className="mt-2 text-sm text-navy-200">Sirve sangre de cualquier grupo y factor.</p>
        )}

        {c.institucion && (
          <p className="mt-5 flex items-start gap-2 text-sm text-navy-100">
            <Icon name="institucion" size={18} className="mt-0.5 shrink-0" />
            {c.institucion.nombre}
          </p>
        )}
      </div>
    </header>
  );
}
