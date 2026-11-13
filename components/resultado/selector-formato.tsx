"use client";

import { useRef } from "react";
import type { FormatoPlaca } from "@/lib/placa";
import { MEDIDAS } from "./tarjeta-placa";

/* ============================================================================
   US-05/ST-02 — Selector de formato (pestañas 1:1 / 9:16)
   ----------------------------------------------------------------------------
   Pestañas y no carrusel: con dos opciones, un carrusel esconde que existe la
   segunda (hay que deslizar para descubrirla); las pestañas muestran las dos
   desde el principio.

   Sigue el patrón "Tabs" de WAI-ARIA:
   - role="tablist" / "tab" / "tabpanel" con aria-selected y aria-controls;
   - solo la pestaña activa entra en el orden de Tab; entre pestañas se pasa
     con las flechas, Inicio y Fin;
   - el panel es enfocable, para que con Tab se llegue directo al contenido.
   ========================================================================== */

const FORMATOS: FormatoPlaca[] = ["1x1", "9x16"];

interface Props {
  activo: FormatoPlaca;
  alCambiar: (f: FormatoPlaca) => void;
  /** Contenido de cada pestaña. */
  paneles: Record<FormatoPlaca, React.ReactNode>;
}

export function SelectorFormato({ activo, alCambiar, paneles }: Props) {
  const pestanas = useRef<Record<FormatoPlaca, HTMLButtonElement | null>>({
    "1x1": null,
    "9x16": null,
  });

  function teclado(e: React.KeyboardEvent, actual: FormatoPlaca) {
    const i = FORMATOS.indexOf(actual);
    let destino: FormatoPlaca | null = null;
    if (e.key === "ArrowRight") destino = FORMATOS[(i + 1) % FORMATOS.length];
    if (e.key === "ArrowLeft") destino = FORMATOS[(i - 1 + FORMATOS.length) % FORMATOS.length];
    if (e.key === "Home") destino = FORMATOS[0];
    if (e.key === "End") destino = FORMATOS[FORMATOS.length - 1];
    if (!destino) return;
    e.preventDefault();
    alCambiar(destino);
    pestanas.current[destino]?.focus();
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Formato de la placa"
        className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1 ring-1 ring-border"
      >
        {FORMATOS.map((f) => {
          const sel = f === activo;
          return (
            <button
              key={f}
              ref={(el) => {
                pestanas.current[f] = el;
              }}
              type="button"
              role="tab"
              id={`pestana-${f}`}
              aria-selected={sel}
              aria-controls={`panel-${f}`}
              tabIndex={sel ? 0 : -1}
              onClick={() => alCambiar(f)}
              onKeyDown={(e) => teclado(e, f)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
                sel
                  ? "bg-surface text-text-primary shadow-sm ring-1 ring-border"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {MEDIDAS[f].nombre} {f === "1x1" ? "1:1" : "9:16"}
              <span className="text-xs font-normal">{MEDIDAS[f].uso}</span>
            </button>
          );
        })}
      </div>

      {FORMATOS.map((f) => (
        <div
          key={f}
          role="tabpanel"
          id={`panel-${f}`}
          aria-labelledby={`pestana-${f}`}
          hidden={f !== activo}
          tabIndex={0}
          className="mt-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          {paneles[f]}
        </div>
      ))}
    </div>
  );
}
