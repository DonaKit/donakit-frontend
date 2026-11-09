"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { DIAS_URGENCIA, diasHasta, fechaLarga } from "@/lib/fechas";
import type { CampaniaPublica } from "@/lib/api";

/* ============================================================================
   US-13/ST-03 — Contador de donantes y cuenta regresiva
   ----------------------------------------------------------------------------
   Dos números que responden "¿todavía hace falta?" y "¿hasta cuándo?".

   La fecha límite es un día, no una hora. La cuenta regresiva dice cuántos
   días faltan; el último día cambia a horas, porque "faltan 0 días" no dice
   nada y "quedan 5 horas" sí. Se actualiza cada minuto.

   Si la campaña no tiene cantidad o fecha, esa parte no se muestra: no se
   inventan metas.
   ========================================================================== */

export function EstadoPedido({ c }: { c: CampaniaPublica }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const meta = c.donantesObjetivo;
  if (!meta && !c.fecha) return null;

  return (
    <section aria-label="Estado del pedido" className="grid gap-3 sm:grid-cols-2">
      {meta ? <Donantes actuales={c.donantesActuales} meta={meta} /> : null}
      {c.fecha ? <CuentaRegresiva fecha={c.fecha} ahora={ahora} /> : null}
    </section>
  );
}

function Donantes({ actuales, meta }: { actuales: number; meta: number }) {
  const faltan = Math.max(0, meta - actuales);
  const avance = Math.min(100, Math.round((actuales / meta) * 100));
  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <Icon name="donantes" size={18} />
        Donantes
      </p>
      <p className="mt-2 text-text-primary">
        <span className="font-display text-4xl font-bold">{faltan}</span>{" "}
        <span className="text-base">{faltan === 1 ? "falta" : "faltan"} de {meta}</span>
      </p>
      <div
        role="progressbar"
        aria-label="Donantes confirmados"
        aria-valuemin={0}
        aria-valuemax={meta}
        aria-valuenow={actuales}
        aria-valuetext={`${actuales} de ${meta} donantes`}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-200"
      >
        <div className="h-full rounded-full bg-red-600" style={{ width: `${avance}%` }} />
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        {actuales === 0 ? "Todavía nadie confirmó: podés ser la primera persona." : `${actuales} ya confirmaron.`}
      </p>
    </div>
  );
}

function CuentaRegresiva({ fecha, ahora }: { fecha: string; ahora: Date }) {
  const dias = diasHasta(fecha, ahora);
  const urgente = dias >= 0 && dias <= DIAS_URGENCIA;

  let principal: string;
  let detalle: string;
  if (dias < 0) {
    principal = "Plazo vencido";
    detalle = `La fecha límite era el ${fechaLarga(fecha)}. Consultá en el banco de sangre si todavía hace falta.`;
  } else if (dias === 0) {
    const fin = new Date(ahora);
    fin.setHours(24, 0, 0, 0);
    const horas = Math.max(1, Math.ceil((fin.getTime() - ahora.getTime()) / 3_600_000));
    principal = `${horas} h`;
    detalle = "Hoy es el último día.";
  } else {
    principal = `${dias} ${dias === 1 ? "día" : "días"}`;
    detalle = `Hasta el ${fechaLarga(fecha)}.`;
  }

  return (
    <div className={`rounded-xl p-4 ring-1 ${urgente ? "bg-red-50 ring-red-200" : "bg-surface ring-border"}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <Icon name="cuentaRegresiva" size={18} />
        {dias < 0 ? "Fecha límite" : "Quedan"}
        {urgente && (
          <span className="ml-auto rounded-full bg-red-700 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-text-on-brand">
            Urgente
          </span>
        )}
      </p>
      <p className={`mt-2 font-display text-4xl font-bold ${urgente ? "text-red-700" : "text-text-primary"}`}>
        {principal}
      </p>
      <p className="mt-2 text-sm text-text-secondary">{detalle}</p>
    </div>
  );
}
