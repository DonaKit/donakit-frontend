"use client";

import { useState } from "react";
import { Dialogo } from "@/components/ui/dialogo";
import type { FormatoPlaca } from "@/lib/placa";
import { MEDIDAS } from "./tarjeta-placa";

/* ============================================================================
   US-05/ST-03 — Visor modal con zoom
   ----------------------------------------------------------------------------
   Dos niveles, y no un zoom continuo con rueda o pellizco hecho a mano:
   - "Ajustada": la placa entera en la pantalla, para ver la composición.
   - "Tamaño real": 1 píxel de la imagen = 1 píxel de la pantalla, con
     desplazamiento. Es lo que hace falta para revisar el nombre, la dirección
     y el QR antes de compartir.
   En el celular el pellizco del sistema sigue funcionando encima de los dos.

   Se cambia con el botón o con doble toque sobre la imagen.
   ========================================================================== */

interface Props {
  formato: FormatoPlaca | null;
  url: string | null;
  descripcion: string;
  alCerrar: () => void;
}

export function VisorPlaca({ formato, url, descripcion, alCerrar }: Props) {
  const [real, setReal] = useState(false);
  const abierto = formato !== null && url !== null;
  const m = formato ? MEDIDAS[formato] : null;

  function cerrar() {
    setReal(false);
    alCerrar();
  }

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={cerrar}
      titulo={m ? `Placa ${m.nombre.toLowerCase()}` : "Placa"}
      tamano="pantalla"
    >
      {abierto && m && (
        <div className="flex h-full flex-col gap-3 pt-2">
          <div
            className={`min-h-0 flex-1 rounded-lg bg-ink-100 ${
              real ? "overflow-auto" : "flex items-center justify-center overflow-hidden"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={descripcion}
              width={m.ancho}
              height={m.alto}
              onDoubleClick={() => setReal((r) => !r)}
              className={real ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}
              style={real ? { width: m.ancho, height: m.alto } : undefined}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              {m.ancho}×{m.alto} px · {real ? "Tamaño real" : "Ajustada a la pantalla"}
            </p>
            <button
              type="button"
              onClick={() => setReal((r) => !r)}
              aria-pressed={real}
              className="h-11 rounded-lg px-4 text-sm font-semibold ring-2 ring-border-interactive"
            >
              {real ? "Ajustar a la pantalla" : "Ver a tamaño real"}
            </button>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
