"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/lib/icons";

/* ============================================================================
   Diálogo modal — base de US-05/ST-03 (zoom), US-10/ST-01 (confirmación) y
   US-17/ST-04 (contacto secundario)
   ----------------------------------------------------------------------------
   Usa el elemento <dialog> nativo con showModal(). Eso da gratis lo que un
   modal hecho a mano suele olvidar:
   - el foco queda atrapado adentro mientras está abierto;
   - Escape lo cierra;
   - el resto de la página queda inerte para el teclado y el lector de
     pantalla;
   - al cerrar, el foco vuelve al botón que lo abrió.
   ========================================================================== */

interface Props {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  /** Oculta el título visualmente (sigue disponible para lectores de pantalla). */
  tituloOculto?: boolean;
  /** "pantalla" ocupa casi todo el viewport: para ver una placa en grande. */
  tamano?: "normal" | "pantalla";
  children: React.ReactNode;
}

export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  tituloOculto = false,
  tamano = "normal",
  children,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      aria-label={tituloOculto ? titulo : undefined}
      aria-labelledby={tituloOculto ? undefined : "dialogo-titulo"}
      onClose={alCerrar}
      // Tocar el fondo oscuro cierra, como esperaría cualquiera en el celular.
      onClick={(e) => {
        if (e.target === ref.current) alCerrar();
      }}
      className={`m-auto rounded-xl bg-surface p-0 text-text-primary shadow-xl backdrop:bg-ink-900/70 ${
        tamano === "pantalla"
          ? "h-[92dvh] w-[96vw] max-w-[96vw]"
          : "w-[min(92vw,440px)]"
      }`}
    >
      <div className={`flex h-full flex-col ${tamano === "pantalla" ? "p-3" : "p-5"}`}>
        <div className="flex items-start justify-between gap-4">
          <h2
            id="dialogo-titulo"
            className={tituloOculto ? "sr-only" : "text-lg font-semibold"}
          >
            {titulo}
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            className="-m-1 ml-auto flex size-11 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted"
          >
            <Icon name="cerrar" label="Cerrar" size={22} />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </dialog>
  );
}
