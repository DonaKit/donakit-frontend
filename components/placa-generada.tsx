"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import {
  subirPlacas,
  type CampaniaCreada,
  type DatosPedido,
  type PlacaGuardada,
  type Respuesta,
} from "@/lib/api";
import {
  generarPlaca11,
  generarPlaca916,
  nombreArchivo,
  type DatosPlaca,
  type FormatoPlaca,
} from "@/lib/placa";

/* ============================================================================
   US-03/ST-05 — Generación de las placas al terminar el formulario
   US-03/ST-04 y US-04/ST-02 (parte frontend) — Guardado en el backend
   ----------------------------------------------------------------------------
   Aparece cuando el backend ya devolvió el slug. Antes de eso no hay placa
   posible: el QR apunta a una dirección que todavía no existe.

   La generación arranca sola, sin que nadie la pida. Pensalo desde la persona
   que acaba de completar el formulario: ya dijo que quiere el kit. Ponerle
   después un botón "generar" sería preguntarle dos veces lo mismo. Los botones
   que sí hay son los de descargar, que son la acción siguiente.

   Con las dos placas listas, se suben al backend para que queden guardadas
   con la campaña. Si eso falla, la descarga sigue funcionando: las imágenes
   ya están en el navegador. Lo que se pierde es que la landing y el panel las
   tengan, así que se muestra el error y se ofrece reintentar.
   ========================================================================== */

interface Props {
  campania: CampaniaCreada;
  pedido: DatosPedido;
}

type Blobs = Record<FormatoPlaca, Blob | null>;
type Urls = Record<FormatoPlaca, string | null>;
type Guardado =
  | { estado: "esperando" }
  | { estado: "subiendo" }
  | { estado: "listo"; placas: PlacaGuardada[] }
  | { estado: "error"; mensaje: string };

/* Una subida por campaña, aunque el componente se monte dos veces. En
   desarrollo React monta los efectos dos veces a propósito, y sin esto cada
   prueba dejaría placas duplicadas en la base. */
const subidas = new Map<string, Promise<Respuesta<PlacaGuardada[]>>>();

export function PlacaGenerada({ campania, pedido }: Props) {
  const [blobs, setBlobs] = useState<Blobs>({ "1x1": null, "9x16": null });
  const [urls, setUrls] = useState<Urls>({ "1x1": null, "9x16": null });
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<Guardado>({ estado: "esperando" });

  const datos: DatosPlaca = {
    nombre: pedido.nombre.trim(),
    grupo: pedido.grupo ?? null,
    donantes: pedido.donantes === "" ? null : Number(pedido.donantes),
    fecha: pedido.fecha || null,
    slug: campania.slug,
  };

  // ------------------------------------------------------------ Generación
  useEffect(() => {
    let vivo = true;
    const creadas: string[] = [];

    // La cuadrada primero: es la que se muestra, así aparece antes.
    (async () => {
      try {
        const cuadrada = await generarPlaca11(datos);
        const urlCuadrada = URL.createObjectURL(cuadrada);
        creadas.push(urlCuadrada);
        if (!vivo) return;
        setBlobs((b) => ({ ...b, "1x1": cuadrada }));
        setUrls((u) => ({ ...u, "1x1": urlCuadrada }));

        const vertical = await generarPlaca916(datos);
        const urlVertical = URL.createObjectURL(vertical);
        creadas.push(urlVertical);
        if (!vivo) return;
        setBlobs((b) => ({ ...b, "9x16": vertical }));
        setUrls((u) => ({ ...u, "9x16": urlVertical }));

        // Con las dos listas, se guardan. Va acá y no en otro efecto que
        // "reaccione" a las placas: es el paso siguiente de este mismo flujo.
        await guardar(cuadrada, vertical, false);
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

  // --------------------------------------------------------------- Guardado
  async function guardar(cuadrada: Blob, vertical: Blob, reintento: boolean) {
    if (reintento) subidas.delete(campania.id);
    let subida = subidas.get(campania.id);
    if (!subida) {
      subida = subirPlacas(campania, [
        { formato: "SQUARE_1_1", imagen: cuadrada, ancho: 1080, alto: 1080 },
        { formato: "STORY_9_16", imagen: vertical, ancho: 1080, alto: 1920 },
      ]);
      subidas.set(campania.id, subida);
    }

    setGuardado({ estado: "subiendo" });
    const r = await subida;
    if (!r.ok) subidas.delete(campania.id); // que el reintento vuelva a pedir
    setGuardado(
      r.ok
        ? { estado: "listo", placas: r.datos }
        : { estado: "error", mensaje: r.error },
    );
  }

  function reintentar() {
    if (blobs["1x1"] && blobs["9x16"]) {
      void guardar(blobs["1x1"], blobs["9x16"], true);
    }
  }

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

      <EstadoGuardado guardado={guardado} reintentar={reintentar} />

      <p className="mt-3 text-sm text-text-secondary">
        Falta la pantalla de previsualización con los dos formatos (US-05,
        Sprint 3).
      </p>
    </section>
  );
}

function EstadoGuardado({
  guardado,
  reintentar,
}: {
  guardado: Guardado;
  reintentar: () => void;
}) {
  if (guardado.estado === "esperando") return null;

  if (guardado.estado === "subiendo") {
    return (
      <p className="mt-3 text-sm text-text-secondary">Guardando las placas…</p>
    );
  }

  if (guardado.estado === "listo") {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-sm text-success">
        <Icon name="exito" size={16} />
        Placas guardadas con la campaña.
      </p>
    );
  }

  return (
    <div role="alert" className="mt-3 rounded-lg bg-danger-bg p-3 text-sm">
      <p className="text-danger">
        {guardado.mensaje} Las podés descargar igual.
      </p>
      <button
        type="button"
        onClick={reintentar}
        className="mt-2 font-semibold text-text-primary underline underline-offset-2"
      >
        Reintentar
      </button>
    </div>
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
