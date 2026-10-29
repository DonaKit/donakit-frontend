"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import type { CampaniaCreada, DatosPedido } from "@/lib/api";
import { generarPlaca11, nombreArchivo, type DatosPlaca } from "@/lib/placa";

/* ============================================================================
   US-03/ST-05 — Botón que dispara la generación de la placa
   ----------------------------------------------------------------------------
   Aparece cuando el backend ya devolvió el slug. Antes de eso no hay placa
   posible: el QR apunta a una dirección que todavía no existe.

   La generación arranca sola, sin que nadie la pida. Pensalo desde la persona
   que acaba de completar el formulario: ya dijo que quiere el kit. Ponerle
   después un botón "generar" sería preguntarle dos veces lo mismo. El botón
   que sí hay es el de descargar, que es la acción siguiente, no la misma.
   ========================================================================== */

interface Props {
  campania: CampaniaCreada;
  pedido: DatosPedido;
}

export function PlacaGenerada({ campania, pedido }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const datos: DatosPlaca = {
    nombre: pedido.nombre.trim(),
    grupo: pedido.grupo ?? null,
    donantes: pedido.donantes === "" ? null : Number(pedido.donantes),
    fecha: pedido.fecha || null,
    slug: campania.slug,
  };

  useEffect(() => {
    let vivo = true;
    let creada: string | null = null;

    generarPlaca11(datos)
      .then((blob) => {
        if (!vivo) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch((e) => {
        if (!vivo) return;
        setError(
          e instanceof Error
            ? e.message
            : "No pudimos generar la placa. Probá recargando la página.",
        );
      });

    // El objectURL retiene el PNG en memoria hasta que se revoca.
    return () => {
      vivo = false;
      if (creada) URL.revokeObjectURL(creada);
    };
    // El slug identifica la campaña: si no cambió, la placa es la misma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campania.slug]);

  return (
    <section className="rounded-lg bg-success-bg p-4" aria-live="polite">
      <p className="flex items-center gap-2 text-base font-semibold text-success">
        <Icon name="exito" size={20} />
        Tu kit está listo
      </p>

      <p className="mt-1 text-sm text-text-secondary">
        La página del caso va a estar en{" "}
        <span className="font-semibold text-text-primary">
          donakit.app/c/{campania.slug}
        </span>
      </p>

      <div className="mt-4 overflow-hidden rounded-lg bg-surface-muted ring-1 ring-border">
        {url ? (
          /* Es un blob local de tamaño conocido; next/image no aporta nada acá
             y exigiría configurar un dominio para algo que nunca sale de esta
             pestaña. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Placa para compartir: se buscan donantes de sangre para ${datos.nombre}`}
            width={1080}
            height={1080}
            className="aspect-square w-full"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-sm text-text-secondary">
            {error ?? "Generando la placa…"}
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : (
        <a
          href={url ?? undefined}
          download={nombreArchivo(datos)}
          aria-disabled={url === null}
          className={`mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-lg text-lg font-semibold ${
            url
              ? "bg-surface-brand text-text-on-brand"
              : "pointer-events-none bg-ink-400 text-text-on-brand"
          }`}
        >
          <Icon name="descargar" size={20} />
          {url ? "Descargar la placa" : "Preparando…"}
        </a>
      )}

      <p className="mt-3 text-sm text-text-secondary">
        1080×1080, lista para WhatsApp e Instagram. Falta la pantalla de
        previsualización completa (US-05, Sprint 3).
      </p>
    </section>
  );
}
