"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { nombreCategoria, PARA_EL_DIA, PREGUNTAS_APTITUD, type PreguntaAptitud } from "@/lib/contenido-donante";
import type { Requisito } from "@/lib/api";

/* ============================================================================
   US-14/ST-03 — Autoevaluación interactiva de requisitos
   ----------------------------------------------------------------------------
   En vez de una lista de requisitos para leer, preguntas de sí o no. Es más
   rápido de contestar en el celular, y cada respuesta da una explicación
   concreta ("con un tatuaje de menos de un año todavía no se puede donar"),
   en lugar de dejar a la persona interpretando una lista.

   FORMATO DIAPOSITIVA (pedido del equipo después de probarla): una pregunta
   por vez. Con las seis apiladas, la sección ocupaba casi tres pantallas en
   el celular; así ocupa una tarjeta.
   - Al responder aparece la siguiente; "Anterior" vuelve sin perder lo
     contestado.
   - Si una respuesta impide donar, se corta ahí y se explica por qué: no
     tiene sentido hacer contestar el resto a quien ya sabe que no puede.
   - Al cambiar de pregunta, el foco va al título de la nueva, para que el
     lector de pantalla la lea y quien usa teclado no quede perdido.

   El resultado nunca dice "sos apto": dice "podés ir a donar" y aclara que la
   decisión final la toma el equipo médico. Prometer más que eso sería
   inventar un diagnóstico.

   Sin enlaces a páginas externas (ni del hospital ni del Ministerio): el
   equipo decidió sacarlos después de QA (US-18). Sacaban a la persona de la
   página justo cuando estaba decidiendo si ir a donar.

   Debajo van los requisitos que la institución cargó en la base (US-14/ST-02,
   tabla `requirement`). No reemplazan a las preguntas: la tabla guarda
   requisitos redactados, no preguntas de sí o no. Los que tienen
   is_immediate_disqualification se marcan como excluyentes.
   ========================================================================== */

type Respuesta = "si" | "no";
type Respuestas = Record<string, Respuesta | undefined>;
const TOTAL = PREGUNTAS_APTITUD.length;

export function Autoevaluacion({ requisitos = [] }: { requisitos?: Requisito[] }) {
  const [r, setR] = useState<Respuestas>({});
  /** Índice de la pregunta visible, o "fin" cuando se muestra el resultado. */
  const [paso, setPaso] = useState<number | "fin">(0);
  const titulo = useRef<HTMLHeadingElement>(null);
  const interactuo = useRef(false);

  // Mover el foco al título nuevo, pero solo después de que la persona
  // interactuó: al cargar la página no se le roba el foco a nadie.
  useEffect(() => {
    if (interactuo.current) titulo.current?.focus();
  }, [paso]);

  function ir(destino: number | "fin") {
    interactuo.current = true;
    setPaso(destino);
  }

  function responder(p: PreguntaAptitud, i: number, v: Respuesta) {
    setR((x) => ({ ...x, [p.id]: v }));
    const noApta = v !== p.apta;
    if ((noApta && p.impide) || i === TOTAL - 1) ir("fin");
    else ir(i + 1);
  }

  // La primera respuesta que impide donar, en orden: es el motivo a explicar.
  const impide = PREGUNTAS_APTITUD.find((p) => r[p.id] !== undefined && r[p.id] !== p.apta && p.impide);
  const aRevisar = PREGUNTAS_APTITUD.filter((p) => r[p.id] !== undefined && r[p.id] !== p.apta && !p.impide);

  return (
    <section aria-labelledby="titulo-requisitos" className="flex flex-col gap-4">
      <div>
        <h2 id="titulo-requisitos" className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="requisitos" size={22} />
          ¿Podés donar?
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {TOTAL} preguntas de sí o no: tarda menos de un minuto.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-border">
        {paso === "fin" ? (
          <div key="fin" className="diapositiva-entrada flex flex-col gap-4 p-4" aria-live="polite">
            {impide ? (
              <Resultado tono="no" titulo="Por ahora no podrías donar" refTitulo={titulo}>
                {impide.siNoApta} Igual podés ayudar mucho compartiendo este pedido
                con alguien que sí pueda.
              </Resultado>
            ) : aRevisar.length > 0 ? (
              <Resultado tono="consultar" titulo="Consultá antes de ir" refTitulo={titulo}>
                {aRevisar.map((p) => p.siNoApta).join(" ")} Llamá al banco de
                sangre y contalo antes de sacar turno.
              </Resultado>
            ) : (
              <Resultado tono="si" titulo="Podés ir a donar" refTitulo={titulo}>
                Según lo que contestaste, cumplís los requisitos generales. Antes
                de donar hay una entrevista médica confidencial: ahí se confirma.
              </Resultado>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {impide && (
                <button
                  type="button"
                  onClick={() => ir(PREGUNTAS_APTITUD.indexOf(impide))}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold ring-2 ring-border-interactive"
                >
                  <Icon name="volver" size={18} />
                  Cambiar mi respuesta
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setR({});
                  ir(0);
                }}
                className="flex min-h-11 items-center justify-center rounded-lg px-4 text-base font-semibold text-text-secondary hover:text-text-primary"
              >
                Empezar de nuevo
              </button>
            </div>
          </div>
        ) : (
          <Diapositiva
            key={paso}
            p={PREGUNTAS_APTITUD[paso]}
            indice={paso}
            valor={r[PREGUNTAS_APTITUD[paso].id]}
            refTitulo={titulo}
            alResponder={(v) => responder(PREGUNTAS_APTITUD[paso], paso, v)}
            alVolver={paso > 0 ? () => ir(paso - 1) : undefined}
          />
        )}
      </div>

      <div className="rounded-xl bg-surface-muted p-4 ring-1 ring-border">
        <p className="text-sm font-semibold">Para el día de la donación</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {PARA_EL_DIA.map((t) => (
            <li key={t} className="flex items-start gap-2 text-sm text-text-primary">
              <Icon name="listo" size={16} className="mt-0.5 shrink-0 text-success" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {requisitos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">Requisitos del banco de sangre</h3>
          <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-surface ring-1 ring-border">
            {requisitos.map((q) => (
              <li key={q.id} className="flex flex-col gap-1 p-4">
                <p className="flex flex-wrap items-center gap-2 text-base font-semibold">
                  {q.titulo}
                  {q.excluyente && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                      Excluyente
                    </span>
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {nombreCategoria(q.categoria)}
                  </span>
                </p>
                <p className="text-sm leading-relaxed text-text-secondary wrap-anywhere">{q.descripcion}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Diapositiva({
  p,
  indice,
  valor,
  refTitulo,
  alResponder,
  alVolver,
}: {
  p: PreguntaAptitud;
  indice: number;
  valor: Respuesta | undefined;
  refTitulo: React.RefObject<HTMLHeadingElement | null>;
  alResponder: (v: Respuesta) => void;
  alVolver?: () => void;
}) {
  const avance = Math.round((indice / TOTAL) * 100);
  return (
    <div className="diapositiva-entrada flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <p className="shrink-0 text-sm font-semibold text-text-secondary">
          Pregunta {indice + 1} de {TOTAL}
        </p>
        <div
          role="progressbar"
          aria-label="Avance de la autoevaluación"
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={indice}
          className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200"
        >
          <div className="h-full rounded-full bg-surface-brand transition-[width] duration-200" style={{ width: `${avance}%` }} />
        </div>
      </div>

      <div className="min-h-[4.5rem]">
        <h3 ref={refTitulo} tabIndex={-1} className="text-lg font-semibold leading-snug text-text-primary outline-none">
          {p.pregunta}
        </h3>
        {p.ayuda && <p className="mt-1 text-sm text-text-secondary">{p.ayuda}</p>}
      </div>

      {/* Botones y no radios: cada respuesta es una acción (avanza), no una
          selección que después se confirma. aria-pressed marca la respuesta
          anterior cuando se vuelve a una pregunta ya contestada. */}
      <div className="grid grid-cols-2 gap-2">
        {(["si", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={valor === v}
            onClick={() => alResponder(v)}
            className={`flex min-h-14 items-center justify-center rounded-lg text-lg font-semibold ring-2 ${
              valor === v
                ? "bg-surface-brand text-text-on-brand ring-surface-brand"
                : "bg-surface text-text-primary ring-border-interactive hover:bg-surface-muted"
            }`}
          >
            {v === "si" ? "Sí" : "No"}
          </button>
        ))}
      </div>

      {alVolver && (
        <button
          type="button"
          onClick={alVolver}
          className="-mb-1 flex min-h-11 items-center gap-1.5 self-start rounded-lg px-1 text-sm font-semibold text-text-secondary hover:text-text-primary"
        >
          <Icon name="volver" size={16} />
          Anterior
        </button>
      )}
    </div>
  );
}

function Resultado({
  tono,
  titulo,
  refTitulo,
  children,
}: {
  tono: "si" | "no" | "consultar";
  titulo: string;
  refTitulo: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  const estilo = {
    si: "bg-success-bg ring-success text-success",
    no: "bg-danger-bg ring-danger text-danger",
    consultar: "bg-warning-bg ring-warning text-text-primary",
  }[tono];
  return (
    <div className={`rounded-xl p-4 ring-1 ${estilo}`}>
      <h3 ref={refTitulo} tabIndex={-1} className="flex items-center gap-2 text-base font-semibold outline-none">
        <Icon name={tono === "si" ? "apto" : tono === "no" ? "error" : "alerta"} size={20} />
        {titulo}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-text-primary">{children}</p>
    </div>
  );
}
