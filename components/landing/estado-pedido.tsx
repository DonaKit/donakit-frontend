"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { DIAS_URGENCIA, diasHasta, fechaLarga } from "@/lib/fechas";
import type { CampaniaPublica } from "@/lib/api";

/* ============================================================================
   US-13/ST-03 — Contador de donantes y cuenta regresiva
   ----------------------------------------------------------------------------
   Dos datos: cuántos donantes se pidieron y hasta cuándo.

   Solo la cantidad pedida, sin "faltan X" ni barra de avance (decisión del
   equipo después de QA, US-18): DonaKit no está conectado al registro de
   donaciones de la institución, así que un "faltan" sería un número que no
   se actualiza nunca y le diría a la gente algo falso.

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
      {meta ? <Donantes meta={meta} /> : null}
      {c.fecha ? <CuentaRegresiva fecha={c.fecha} ahora={ahora} /> : null}
    </section>
  );
}

function Donantes({ meta }: { meta: number }) {
  return (
    <div className="rounded-xl bg-surface p-4 ring-1 ring-border">
      <p className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <Icon name="donantes" size={18} />
        Se necesitan
      </p>
      <p className="mt-2 font-display text-4xl font-bold text-text-primary">
        {meta} {meta === 1 ? "donante" : "donantes"}
      </p>
      <p className="mt-2 text-sm text-text-secondary">Cada donación cuenta: podés ser una.</p>
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
