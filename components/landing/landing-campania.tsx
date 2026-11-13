"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { obtenerCampania, type CampaniaPublica } from "@/lib/api";
import { INSTITUCION } from "@/lib/institucion";
import { Cabecera } from "./cabecera";
import { EstadoPedido } from "./estado-pedido";
import { Sede } from "./sede";
import { Autoevaluacion } from "./autoevaluacion";
import { Contacto } from "./contacto";
import { PreguntasFrecuentes } from "./preguntas-frecuentes";

/* ============================================================================
   US-12 — Landing pública del pedido
   US-12/ST-03 — Mobile-first desde 360 px
   ----------------------------------------------------------------------------
   Orden de las secciones = orden de las preguntas de quien llega desde una
   placa:
     1. ¿Es para mí?             -> cabecera con el grupo (US-13)
     2. ¿Todavía hace falta?     -> donantes y cuenta regresiva (US-13)
     3. ¿Algo que tenga que saber? -> indicaciones de la familia
     4. ¿Dónde y cuándo?         -> sede, turno, cómo llegar (US-16)
     5. ¿Puedo donar?            -> autoevaluación (US-14)
     6. ¿A quién pregunto?       -> contacto (US-17)
     7. Dudas generales          -> preguntas frecuentes (US-15)

   Mobile-first: todo es una columna de hasta 560 px. Los botones miden al
   menos 44 px de alto (WCAG 2.5.5) y nada tiene ancho fijo, así entra entero
   en una pantalla de 360 px sin desplazamiento horizontal.

   Textos escritos por personas (observaciones, nombre, datos de la base):
   llevan `wrap-anywhere` (overflow-wrap: anywhere). Sin eso, una "palabra"
   larga sin espacios —un enlace pegado, o alguien que dejó apretada una
   tecla— no se corta, y como la página es una columna flexible, la caja se
   estira hasta el ancho de esa palabra y la página entera se desborda.
   ========================================================================== */

type Estado =
  | { tipo: "cargando" }
  | { tipo: "no-existe" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "ok"; c: CampaniaPublica };

export function LandingCampania({
  slug,
  esPreview = false,
}: {
  slug: string;
  esPreview?: boolean;
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });
  const [demora, setDemora] = useState(false);
  // Número del último pedido hecho. Si llegan dos respuestas desordenadas
  // (reintento rápido, o el doble montaje de React en desarrollo), solo vale
  // la del último pedido: una respuesta vieja no pisa a una nueva.
  const ultimo = useRef(0);

  const cargar = useCallback(async () => {
    const este = ++ultimo.current;
    setEstado({ tipo: "cargando" });
    setDemora(false);
    // Si tarda más de 5 s, casi seguro es el backend despertándose en Render.
    const aviso = setTimeout(() => setDemora(true), 5000);
    const r = await obtenerCampania(slug, { preview: esPreview });
    clearTimeout(aviso);
    if (este !== ultimo.current) return;
    if (!r.ok) setEstado({ tipo: "error", mensaje: r.error });
    else if (r.datos === null) setEstado({ tipo: "no-existe" });
    else setEstado({ tipo: "ok", c: r.datos });
  }, [slug, esPreview]);

  useEffect(() => {
    // Pedir datos a un sistema externo al montar es para lo que sirve un
    // efecto; el setState ocurre después de la respuesta, no en el render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  if (estado.tipo === "cargando") return <Cargando demora={demora} />;
  if (estado.tipo === "no-existe") return <NoExiste />;
  if (estado.tipo === "error") return <ErrorCarga mensaje={estado.mensaje} reintentar={() => void cargar()} />;

  const c = estado.c;
  // Los datos de contacto y turno del frontend son de UNA institución: solo
  // se muestran si la campaña es de esa.
  const extras = c.institucionId === INSTITUCION.id;

  return (
    <>
      {esPreview && (
        <aside
          role="status"
          aria-label="Aviso de vista previa"
          className="sticky top-0 z-50 flex items-center justify-between border-b border-navy-700 bg-navy-900 px-4 py-2.5 text-xs text-white shadow-sm"
        >
          <span className="flex items-center gap-2 font-medium">
            <Icon name="visitas" size={15} className="text-navy-300" />
            <span>Vista previa de administración · Esta visita no suma a las métricas</span>
          </span>
          <span className="rounded bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-200">
            Dashboard
          </span>
        </aside>
      )}
      <Cabecera c={c} />
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-10 px-4 pb-16 pt-6">
        <EstadoPedido c={c} />

        {c.observaciones && (
          <section aria-labelledby="titulo-indicaciones" className="rounded-xl bg-info-bg p-4 ring-1 ring-info/30">
            <h2 id="titulo-indicaciones" className="flex items-center gap-2 text-base font-semibold">
              <Icon name="info" size={20} />
              Indicaciones de la familia
            </h2>
            <p className="mt-2 whitespace-pre-line text-base leading-relaxed wrap-anywhere">{c.observaciones}</p>
          </section>
        )}

        <Sede c={c} extras={extras} />
        <Autoevaluacion requisitos={c.requisitos} />
        <Contacto c={c} extras={extras} />
        <PreguntasFrecuentes desdeBackend={c.preguntas} />

        <footer className="border-t border-border pt-6 text-center text-sm text-text-secondary">
          <p>
            Página armada con{" "}
            <span className="font-display font-bold text-ink-800">
              Dona<span className="text-red-700">Kit</span>
            </span>
          </p>
          <Link href="/nuevo" className="mt-2 inline-block font-semibold text-text-primary underline underline-offset-2">
            Armá un pedido de donantes
          </Link>
        </footer>
      </main>
    </>
  );
}

function Contenedor({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      {children}
    </main>
  );
}

/** Pantalla de carga sin estado, para usar como fallback de <Suspense>. */
export function CargandoPedido() {
  return <Cargando demora={false} />;
}

function Cargando({ demora }: { demora: boolean }) {
  return (
    <Contenedor>
      <Icon name="cargando" size={32} className="animate-spin text-text-secondary" />
      <p className="text-lg font-semibold" role="status">
        Cargando el pedido…
      </p>
      {demora && (
        <p className="max-w-[34ch] text-sm text-text-secondary">
          Está tardando más de lo normal: el servidor se está despertando. Puede
          llevar hasta un minuto la primera vez.
        </p>
      )}
    </Contenedor>
  );
}

function NoExiste() {
  return (
    <Contenedor>
      <Icon name="pregunta" size={32} className="text-text-secondary" />
      <h1 className="text-2xl">No encontramos este pedido</h1>
      <p className="max-w-[36ch] text-base text-text-secondary">
        Revisá que el enlace esté completo. Si lo escaneaste de una placa, pedile
        a quien lo compartió que te mande el enlace de nuevo.
      </p>
      <Link href="/" className="mt-2 font-semibold underline underline-offset-2">
        Ir a DonaKit
      </Link>
    </Contenedor>
  );
}

function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return (
    <Contenedor>
      <Icon name="error" size={32} className="text-danger" />
      <h1 className="text-2xl">No pudimos cargar el pedido</h1>
      <p className="max-w-[36ch] text-base text-text-secondary" role="alert">
        {mensaje}
      </p>
      <button
        type="button"
        onClick={reintentar}
        className="mt-2 flex h-12 items-center justify-center rounded-lg bg-surface-brand px-6 text-base font-semibold text-text-on-brand"
      >
        Reintentar
      </button>
    </Contenedor>
  );
}
