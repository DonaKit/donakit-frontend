"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { descargarArchivo } from "@/lib/descargar";
import { useAvisos } from "@/components/ui/avisos";

/* ============================================================================
   US-08/ST-04 — Descargar el kit completo en ZIP, con barra de carga
   ----------------------------------------------------------------------------
   El ZIP se arma en el navegador con JSZip. El plan original era pedirlo al
   backend (US-08/ST-01 y ST-02, GET /campaigns/:id/download-zip), pero ese
   endpoint no existe todavía, y las placas ya están en el navegador: armarlo
   acá evita volver a bajar del servidor algo que la persona ya tiene.

   Contenido: las dos placas y el texto para compartir en un .txt.

   La librería se carga recién al tocar el botón (import dinámico): son ~100 KB
   que la mayoría de las personas, que bajan solo una placa, nunca necesita.

   La barra muestra el avance real de JSZip (onUpdate) mientras empaqueta. Las
   placas ya están comprimidas como PNG, así que se guardan sin volver a
   comprimir (STORE): comprimir un PNG gasta tiempo y no achica nada.
   ========================================================================== */

export interface ArchivoZip {
  nombre: string;
  datos: Blob | string;
}

interface Props {
  nombreZip: string;
  /** null mientras las placas se están generando. */
  archivos: ArchivoZip[] | null;
  /** Se llama antes de empaquetar (para guardar y registrar la descarga). */
  alDescargar?: () => void;
}

type Estado = { fase: "quieto" } | { fase: "armando"; avance: number } | { fase: "listo" };

export function DescargaZip({ nombreZip, archivos, alDescargar }: Props) {
  const avisar = useAvisos();
  const [estado, setEstado] = useState<Estado>({ fase: "quieto" });

  async function descargar() {
    if (!archivos) return;
    setEstado({ fase: "armando", avance: 0 });
    alDescargar?.();

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const a of archivos) zip.file(a.nombre, a.datos);

      const blob = await zip.generateAsync(
        { type: "blob", compression: "STORE" },
        (meta) => setEstado({ fase: "armando", avance: Math.round(meta.percent) }),
      );

      descargarArchivo(blob, nombreZip);
      setEstado({ fase: "listo" });
      avisar("Descarga iniciada: kit completo en ZIP.");
      setTimeout(() => setEstado({ fase: "quieto" }), 2500);
    } catch {
      setEstado({ fase: "quieto" });
      avisar("No pudimos armar el ZIP. Descargá las placas por separado.", "error");
    }
  }

  const armando = estado.fase === "armando";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={descargar}
        disabled={!archivos || armando}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-surface text-lg font-semibold text-text-primary ring-2 ring-border-interactive disabled:text-text-muted disabled:ring-border"
      >
        <Icon name={estado.fase === "listo" ? "listo" : "zip"} size={20} />
        {armando ? "Armando el ZIP…" : estado.fase === "listo" ? "ZIP descargado" : "Descargar todo en ZIP"}
      </button>

      {armando && (
        <div className="flex items-center gap-3" aria-live="polite">
          <div
            role="progressbar"
            aria-label="Armando el ZIP"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={estado.avance}
            className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200"
          >
            <div
              className="h-full rounded-full bg-surface-brand transition-[width] duration-150"
              style={{ width: `${estado.avance}%` }}
            />
          </div>
          <span className="w-10 text-right text-sm tabular-nums text-text-secondary">{estado.avance}%</span>
        </div>
      )}
      <p className="text-sm text-text-secondary">Las dos placas y el texto, en un solo archivo.</p>
    </div>
  );
}
