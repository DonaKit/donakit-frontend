"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import type { CampaniaCreada, DatosPedido } from "@/lib/api";
import {
  generarPlaca11,
  generarPlaca916,
  nombreArchivo,
  type DatosPlaca,
  type FormatoPlaca,
} from "@/lib/placa";

/* ============================================================================
   US-03/ST-05 — Generación de las placas al terminar el formulario
   ----------------------------------------------------------------------------
   Aparece cuando el backend ya devolvió el slug. Antes de eso no hay placa
   posible: el QR apunta a una dirección que todavía no existe.

   La generación arranca sola, sin que nadie la pida. Pensalo desde la persona
   que acaba de completar el formulario: ya dijo que quiere el kit. Ponerle
   después un botón "generar" sería preguntarle dos veces lo mismo. Los botones
   que sí hay son los de descargar, que son la acción siguiente.

   Se generan los dos formatos: la cuadrada (US-03) para el feed y WhatsApp, y
   la vertical (US-04) para historias. La pantalla de previsualización con
   pestañas para alternarlas es US-05, en el Sprint 3; hasta entonces se ve la
   cuadrada y se descargan las dos.
   ========================================================================== */

interface Props {
  campania: CampaniaCreada;
  pedido: DatosPedido;
}

type Urls = Record<FormatoPlaca, string | null>;

export function PlacaGenerada({ campania, pedido }: Props) {
  const [urls, setUrls] = useState<Urls>({ "1x1": null, "9x16": null });
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
    const creadas: string[] = [];

    // La cuadrada primero: es la que se muestra, así aparece antes.
    (async () => {
      try {
        const cuadrada = URL.createObjectURL(await generarPlaca11(datos));
        creadas.push(cuadrada);
        if (!vivo) return;
        setUrls((u) => ({ ...u, "1x1": cuadrada }));

        const vertical = URL.createObjectURL(await generarPlaca916(datos));
        creadas.push(vertical);
        if (!vivo) return;
        setUrls((u) => ({ ...u, "9x16": vertical }));
      } catch (e) {
        if (!vivo) return;
        setError(
          e instanceof Error
            ? e.message
            : "No pudimos generar las placas. Probá recargando la página.",
        );
      }
    })();

    // Cada objectURL retiene el PNG en memoria hasta que se revoca.
    return () => {
      vivo = false;
      for (const u of creadas) URL.revokeObjectURL(u);
    };
    // El slug identifica la campaña: si no cambió, las placas son las mismas.
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
        {urls["1x1"] ? (
          /* Es un blob local de tamaño conocido; next/image no aporta nada acá
             y exigiría configurar un dominio para algo que nunca sale de esta
             pestaña. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urls["1x1"]}
            alt={`Placa para compartir: se buscan donantes de sangre para ${datos.nombre}`}
            width={1080}
            height={1080}
            className="aspect-square w-full"
          />
        ) : (
          <div className="flex aspect-square items-center justify-center text-sm text-text-secondary">
            {error ?? "Generando las placas…"}
          </div>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <BotonDescarga
            url={urls["1x1"]}
            archivo={nombreArchivo(datos, "1x1")}
            texto="Descargar cuadrada"
            detalle="Feed y WhatsApp"
          />
          <BotonDescarga
            url={urls["9x16"]}
            archivo={nombreArchivo(datos, "9x16")}
            texto="Descargar vertical"
            detalle="Historias"
            secundario
          />
        </div>
      )}

      <p className="mt-3 text-sm text-text-secondary">
        Falta la pantalla de previsualización con los dos formatos (US-05,
        Sprint 3).
      </p>
    </section>
  );
}

function BotonDescarga({
  url,
  archivo,
  texto,
  detalle,
  secundario = false,
}: {
  url: string | null;
  archivo: string;
  texto: string;
  detalle: string;
  secundario?: boolean;
}) {
  const listo = url !== null;
  const estilo = !listo
    ? "pointer-events-none bg-ink-400 text-text-on-brand"
    : secundario
      ? "bg-surface text-text-primary ring-2 ring-border-interactive"
      : "bg-surface-brand text-text-on-brand";

  return (
    <a
      href={url ?? undefined}
      download={archivo}
      aria-disabled={!listo}
      className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-lg text-lg font-semibold ${estilo}`}
    >
      <Icon name="descargar" size={20} />
      {listo ? texto : "Preparando…"}
      {listo && (
        <span className="text-sm font-normal opacity-80">· {detalle}</span>
      )}
    </a>
  );
}
