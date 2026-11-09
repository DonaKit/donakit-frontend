/* ============================================================================
   Fechas del pedido
   ----------------------------------------------------------------------------
   La fecha límite se guarda como día calendario (AAAA-MM-DD), sin hora. Para
   contar cuánto falta se compara con el día de hoy EN LA HORA LOCAL de quien
   mira: si se usara UTC, a las 22 h en Argentina "mañana" ya sería "hoy".
   ========================================================================== */

/** Días de urgencia: con la fecha a esta distancia o menos, el pedido es urgente. */
export const DIAS_URGENCIA = 3;

/** `AAAA-MM-DD` (o ISO con hora) a medianoche local de ese día. */
function aDiaLocal(fecha: string): Date {
  const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/**
 * Días enteros que faltan hasta la fecha límite: 0 es hoy, negativo es que ya
 * pasó. `ahora` se recibe para poder probarla sin depender del reloj.
 */
export function diasHasta(fecha: string, ahora: Date = new Date()): number {
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((aDiaLocal(fecha).getTime() - hoy.getTime()) / 86_400_000);
}

export function esUrgente(fecha: string | null, ahora?: Date): boolean {
  if (!fecha) return false;
  const dias = diasHasta(fecha, ahora);
  return dias >= 0 && dias <= DIAS_URGENCIA;
}

/** `DD/MM`, o `DD/MM/AA` si cae en otro año. */
export function fechaCorta(fecha: string, ahora: Date = new Date()): string {
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return Number(a) === ahora.getFullYear() ? `${d}/${m}` : `${d}/${m}/${a.slice(2)}`;
}

/** "jueves 20 de noviembre", para textos largos. */
export function fechaLarga(fecha: string): string {
  return aDiaLocal(fecha).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
