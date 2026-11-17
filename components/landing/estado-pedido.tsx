"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { DIAS_URGENCIA, diasHasta, fechaLarga } from "@/lib/fechas";
import type { CampaniaPublica } from "@/lib/api";

/* ============================================================================
   US-13/ST-03 — Contador de donantes y cuenta regresiva
   ----------------------------------------------------------------------------
   Dos datos: cuántos donantes faltan y hasta cuándo.

   DONANTES QUE FALTAN (vuelve después de la US-18): el equipo decidió llevar
   el registro a mano. Desde el panel (/dashboard), el banco de sangre suma
   cada donante que fue a donar ("+1 Donante") y marca el pedido como
   completado. La landing lee ese número (`currentDonors`) y muestra cuántos
   faltan. Se aclara que lo actualiza el banco de sangre: así nadie espera
   que cambie en el momento en que dona.

   ESTADO DEL PEDIDO: si el banco de sangre lo marcó como completado, o si se
   cancela, ya no se muestran la cuenta regresiva ni lo que falta: se dice
   que el pedido terminó, para que nadie vaya a donar por un caso cerrado
   creyendo que todavía hace falta.

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
  const actuales = c.donantesActuales;

  if (c.estado === "COMPLETED" || c.estado === "CANCELLED") {
    return (
      <section aria-label="Estado del pedido">
        <PedidoCerrado completado={c.estado === "COMPLETED"} meta={meta} actuales={actuales} />
      </section>
    );
  }

  if (!meta && !c.fecha) return null;

  return (
    <section aria-label="Estado del pedido" className="grid gap-3 sm:grid-cols-2">
      {meta ? <Donantes actuales={actuales} meta={meta} /> : null}
      {c.fecha ? <CuentaRegresiva fecha={c.fecha} ahora={ahora} /> : null}
    </section>
  );
}

function PedidoCerrado({
  completado,
  meta,
  actuales,
}: {
  completado: boolean;
  meta: number | null;
  actuales: number;
}) {
  return (
    <div
      role="status"
      className={`rounded-xl p-4 ring-1 ${completado ? "bg-success-bg ring-success" : "bg-surface-muted ring-border"}`}
    >
      <p className={`flex items-center gap-2 text-lg font-semibold ${completado ? "text-success" : "text-text-primary"}`}>
        <Icon name={completado ? "exito" : "info"} size={22} />
        {completado ? "Pedido completado" : "Este pedido ya no está activo"}
      </p>
      <p className="mt-2 text-base leading-relaxed text-text-primary">
        {completado
          ? meta && actuales > 0
            ? `Se consiguieron ${actuales} de ${meta} donantes. Gracias a todas las personas que fueron a donar.`
            : "Se consiguieron los donantes. Gracias a todas las personas que fueron a donar."
          : "El banco de sangre cerró este pedido."}
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Si querés donar igual, la sangre siempre hace falta: podés ir al banco de
        sangre y donar para otra persona.
      </p>
    </div>
  );
}

function Donantes({ actuales, meta }: { actuales: number; meta: number }) {
  const faltan = Math.max(0, meta - actuales);
  const avance = Math.min(100, Math.round((actuales / meta) * 100));
  const cubierto = faltan === 0;
  return (
    <div className={`rounded-xl p-4 ring-1 ${cubierto ? "bg-success-bg ring-success" : "bg-surface ring-border"}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
        <Icon name="donantes" size={18} />
        Donantes
      </p>
      {cubierto ? (
        <p className="mt-2 font-display text-2xl font-bold text-success">
          ¡Ya se consiguieron los {meta}!
        </p>
      ) : (
        <p className="mt-2 text-text-primary">
          <span className="font-display text-4xl font-bold">{faltan}</span>{" "}
          <span className="text-base">{faltan === 1 ? "falta" : "faltan"} de {meta}</span>
        </p>
      )}
      <div
        role="progressbar"
        aria-label="Donantes que ya donaron"
        aria-valuemin={0}
        aria-valuemax={meta}
        aria-valuenow={Math.min(actuales, meta)}
        aria-valuetext={`${actuales} de ${meta} donantes`}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink-200"
      >
        <div
          className={`h-full rounded-full ${cubierto ? "bg-success" : "bg-red-600"}`}
          style={{ width: `${avance}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        {actuales === 0
          ? "Todavía nadie donó: podés ser la primera persona."
          : `${actuales} ${actuales === 1 ? "persona ya donó" : "personas ya donaron"}.`}{" "}
        Lo actualiza el banco de sangre.
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
