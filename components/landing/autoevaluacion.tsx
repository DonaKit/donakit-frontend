"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { URL_MINISTERIO } from "@/lib/institucion";
import { PARA_EL_DIA, PREGUNTAS_APTITUD, type PreguntaAptitud } from "@/lib/contenido-donante";

/* ============================================================================
   US-14/ST-03 — Autoevaluación interactiva de requisitos
   US-14/ST-04 — Botón al portal oficial del Ministerio de Salud
   ----------------------------------------------------------------------------
   En vez de una lista de requisitos para leer, preguntas de sí o no. Es más
   rápido de contestar en el celular, y cada respuesta da una explicación
   concreta en el momento ("con un tatuaje de menos de un año todavía no se
   puede donar"), en lugar de dejar a la persona interpretando una lista.

   Cada pregunta es un grupo de radio nativo (fieldset + legend + inputs), así
   se navega con teclado y lector de pantalla sin código extra.

   El resultado nunca dice "sos apto": dice "podés ir a donar" y aclara que la
   decisión final la toma el equipo médico. Prometer más que eso sería
   inventar un diagnóstico.
   ========================================================================== */

type Respuestas = Record<string, "si" | "no" | undefined>;

export function Autoevaluacion() {
  const [r, setR] = useState<Respuestas>({});

  const contestadas = PREGUNTAS_APTITUD.filter((p) => r[p.id] !== undefined).length;
  const total = PREGUNTAS_APTITUD.length;
  const noAptas = PREGUNTAS_APTITUD.filter((p) => r[p.id] !== undefined && r[p.id] !== p.apta);
  const impide = noAptas.some((p) => p.impide);
  const completa = contestadas === total;

  return (
    <section aria-labelledby="titulo-requisitos" className="flex flex-col gap-4">
      <div>
        <h2 id="titulo-requisitos" className="flex items-center gap-2 text-xl font-semibold">
          <Icon name="requisitos" size={22} />
          ¿Podés donar?
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Contestá estas {total} preguntas: tarda menos de un minuto.
        </p>
      </div>

      <ol className="flex flex-col gap-3">
        {PREGUNTAS_APTITUD.map((p, i) => (
          <li key={p.id}>
            <Pregunta
              p={p}
              numero={i + 1}
              valor={r[p.id]}
              alResponder={(v) => setR((x) => ({ ...x, [p.id]: v }))}
            />
          </li>
        ))}
      </ol>

      {/* Resultado: aparece con la primera respuesta que no permite donar, o
          al completar todas. aria-live lo anuncia sin mover el foco. */}
      <div aria-live="polite">
        {impide ? (
          <Resultado tono="no" titulo="Por ahora no podrías donar">
            Revisá el motivo en la pregunta marcada. Igual podés ayudar mucho
            compartiendo este pedido con alguien que sí pueda.
          </Resultado>
        ) : completa && noAptas.length > 0 ? (
          <Resultado tono="consultar" titulo="Consultá antes de ir">
            Hay algo para revisar en tus respuestas. Llamá al banco de sangre y
            contalo antes de sacar turno.
          </Resultado>
        ) : completa ? (
          <Resultado tono="si" titulo="Podés ir a donar">
            Según lo que contestaste, cumplís los requisitos generales. Antes de
            donar hay una entrevista médica confidencial: ahí se confirma.
          </Resultado>
        ) : contestadas > 0 ? (
          <p className="text-sm text-text-secondary">
            {contestadas} de {total} respondidas.
          </p>
        ) : null}
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

      {/* US-14/ST-04 */}
      <a
        href={URL_MINISTERIO}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-center text-base font-semibold text-text-primary ring-2 ring-border-interactive"
      >
        Requisitos oficiales del Ministerio de Salud
        <Icon name="enlaceExterno" size={18} className="shrink-0" />
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
    </section>
  );
}

function Pregunta({
  p,
  numero,
  valor,
  alResponder,
}: {
  p: PreguntaAptitud;
  numero: number;
  valor: "si" | "no" | undefined;
  alResponder: (v: "si" | "no") => void;
}) {
  const noApta = valor !== undefined && valor !== p.apta;
  return (
    <fieldset
      className={`rounded-xl p-4 ring-1 ${noApta ? "bg-red-50 ring-red-200" : "bg-surface ring-border"}`}
    >
      <legend className="sr-only">
        Pregunta {numero}: {p.pregunta}
      </legend>
      <p aria-hidden className="text-base font-semibold text-text-primary">
        {p.pregunta}
      </p>
      {p.ayuda && <p className="mt-1 text-sm text-text-secondary">{p.ayuda}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(["si", "no"] as const).map((v) => (
          <label
            key={v}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg text-base font-semibold ring-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
              valor === v
                ? "bg-surface-brand text-text-on-brand ring-surface-brand"
                : "bg-surface text-text-primary ring-border"
            }`}
          >
            <input
              type="radio"
              name={`aptitud-${p.id}`}
              value={v}
              checked={valor === v}
              onChange={() => alResponder(v)}
              className="sr-only"
            />
            {v === "si" ? "Sí" : "No"}
          </label>
        ))}
      </div>
      {noApta && (
        <p className="mt-3 flex items-start gap-2 text-sm text-danger">
          <Icon name="alerta" size={16} className="mt-0.5 shrink-0" />
          {p.siNoApta}
        </p>
      )}
    </fieldset>
  );
}

function Resultado({
  tono,
  titulo,
  children,
}: {
  tono: "si" | "no" | "consultar";
  titulo: string;
  children: React.ReactNode;
}) {
  const estilo = {
    si: "bg-success-bg ring-success text-success",
    no: "bg-danger-bg ring-danger text-danger",
    consultar: "bg-warning-bg ring-warning text-text-primary",
  }[tono];
  return (
    <div className={`rounded-xl p-4 ring-1 ${estilo}`}>
      <p className="flex items-center gap-2 text-base font-semibold">
        <Icon name={tono === "si" ? "apto" : tono === "no" ? "error" : "alerta"} size={20} />
        {titulo}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-text-primary">{children}</p>
    </div>
  );
}
