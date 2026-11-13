"use client";

import { Icon } from "@/lib/icons";
import type { FormatoPlaca } from "@/lib/placa";

/* ============================================================================
   US-05/ST-01 — PlatePreviewCard: una placa en vista previa
   US-07/ST-01 — con su botón de descarga directa
   ----------------------------------------------------------------------------
   El mismo componente sirve para los dos formatos: recibe las medidas y deja
   que la relación de aspecto la ponga CSS. Así la tarjeta ocupa su lugar
   desde el primer momento, aunque la imagen todavía se esté generando, y la
   pantalla no "salta" cuando aparece.

   La vertical se limita en alto: a 1080×1920, en un celular ocuparía tres
   pantallas. La vista previa es para revisar, no para mirar a tamaño real;
   para eso está el zoom.
   ========================================================================== */

export const MEDIDAS: Record<FormatoPlaca, { ancho: number; alto: number; nombre: string; uso: string }> = {
  "1x1": { ancho: 1080, alto: 1080, nombre: "Cuadrada", uso: "Feed y WhatsApp" },
  "9x16": { ancho: 1080, alto: 1920, nombre: "Vertical", uso: "Historias y estados" },
};

interface Props {
  formato: FormatoPlaca;
  /** URL local de la imagen, o null mientras se genera. */
  url: string | null;
  error?: string | null;
  descripcion: string;
  alAmpliar: () => void;
  alDescargar: () => void;
}

export function TarjetaPlaca({ formato, url, error, descripcion, alAmpliar, alDescargar }: Props) {
  const m = MEDIDAS[formato];
  const lista = url !== null;

  return (
    <figure className="flex flex-col gap-3">
      <div
        className="relative mx-auto w-full overflow-hidden rounded-lg bg-surface-muted ring-1 ring-border"
        style={{
          aspectRatio: `${m.ancho} / ${m.alto}`,
          // La vertical no pasa de 60% del alto de la pantalla.
          maxWidth: formato === "9x16" ? `calc(60dvh * ${m.ancho / m.alto})` : undefined,
        }}
      >
        {lista ? (
          /* Toda la imagen es el botón de ampliar: es lo primero que se toca
             para ver algo de cerca. El botón de abajo dice lo mismo en texto
             para quien no lo adivine. */
          <button
            type="button"
            onClick={alAmpliar}
            className="block h-full w-full cursor-zoom-in"
            aria-label={`Ver la placa ${m.nombre.toLowerCase()} en grande`}
          >
            {/* Blob local de tamaño conocido: next/image no aporta nada acá. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={descripcion} width={m.ancho} height={m.alto} className="h-full w-full" />
          </button>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-text-secondary">
            {error ? (
              <span className="text-danger">{error}</span>
            ) : (
              <>
                <Icon name="cargando" size={24} className="animate-spin" />
                Generando la placa…
              </>
            )}
          </div>
        )}
      </div>

      {/* El botón de zoom va FUERA de la imagen: encima tapaba la etiqueta de
          arriba a la derecha, que es justo algo que hay que revisar. */}
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-sm text-text-secondary">
          {m.nombre} · {m.ancho}×{m.alto} px
        </span>
        <button
          type="button"
          onClick={alAmpliar}
          disabled={!lista}
          className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-text-primary ring-1 ring-border hover:bg-surface-muted disabled:text-text-muted"
        >
          <Icon name="ampliar" size={18} />
          Ver en grande
        </button>
      </figcaption>

      <button
        type="button"
        onClick={alDescargar}
        disabled={!lista}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-surface-brand text-lg font-semibold text-text-on-brand disabled:bg-ink-400"
      >
        <Icon name="descargar" size={20} />
        Descargar {m.nombre.toLowerCase()}
        <span className="text-sm font-normal opacity-80">· {m.uso}</span>
      </button>
    </figure>
  );
}
