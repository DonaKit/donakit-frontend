"use client";

import { useId, useState } from "react";
import { Icon, type IconName } from "@/lib/icons";

/* ============================================================================
   Sección desplegable de la landing (US-18, pedido del equipo después de QA)
   ----------------------------------------------------------------------------
   "¿Tenés dudas?" y "Preguntas frecuentes" ocupaban mucho en el celular y no
   son lo primero que busca quien llega desde una placa. Ahora arrancan
   cerradas: se ve el título y una línea que dice qué hay adentro, y un toque
   las abre.

   Es el mismo patrón de WAI-ARIA que el acordeón de preguntas: un <button>
   dentro del <h2>, con aria-expanded y aria-controls. El contenido cerrado
   usa `hidden` en vez de desmontarse, así no pierde lo que la persona había
   escrito en el buscador si la cierra y la vuelve a abrir.
   ========================================================================== */

interface Props {
  id: string;
  icono: IconName;
  titulo: string;
  /** Una línea que anticipa qué hay adentro; se ve siempre. */
  resumen: string;
  children: React.ReactNode;
}

export function SeccionDesplegable({ id, icono, titulo, resumen, children }: Props) {
  const [abierta, setAbierta] = useState(false);
  const idContenido = useId();

  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-xl bg-surface ring-1 ring-border">
      <h2 id={id}>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={idContenido}
          onClick={() => setAbierta((a) => !a)}
          className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted"
        >
          <Icon name={icono} size={22} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-text-primary">{titulo}</span>
            <span className="block text-sm font-normal text-text-secondary">{resumen}</span>
          </span>
          <Icon
            name="desplegar"
            size={22}
            className={`shrink-0 text-text-secondary transition-transform ${abierta ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      <div id={idContenido} hidden={!abierta} className="border-t border-border p-4">
        {children}
      </div>
    </section>
  );
}
