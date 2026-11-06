import { Icon } from "@/lib/icons";
import { INSTITUCION } from "@/lib/institucion";
import type { CampaniaPublica } from "@/lib/api";

/* ============================================================================
   US-16/ST-03 — Tarjeta de sede con horario de atención
   US-16/ST-04 — Botón de ubicación ("Cómo llegar")
   ----------------------------------------------------------------------------
   La dirección que importa es la de la ENTRADA DE DONANTES, no la principal
   del hospital. En el Garrahan son distintas, y mandar a alguien a la puerta
   equivocada de un hospital pediátrico es perderle media hora.

   "Cómo llegar" abre Google Maps con la dirección buscada. Es un enlace común
   y no un mapa incrustado: un mapa embebido pesa más de 1 MB, necesita una
   clave de API y en el celular la persona igual lo termina abriendo en la app
   de mapas para que la guíe.

   `extras` es false cuando la campaña es de otra institución que la del MVP:
   ahí solo se muestra lo que viene del backend, sin mezclar datos de otra.
   ========================================================================== */

export function urlComoLlegar(direccion: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
}

export function Sede({ c, extras }: { c: CampaniaPublica; extras: boolean }) {
  const inst = c.institucion;
  if (!inst) return null;

  const direccion = extras
    ? `${INSTITUCION.entradaDonantes}, ${INSTITUCION.barrio}, ${inst.ciudad}`
    : `${inst.direccion}, ${inst.ciudad}`;

  return (
    <section aria-labelledby="titulo-sede" className="flex flex-col gap-4">
      <h2 id="titulo-sede" className="flex items-center gap-2 text-xl font-semibold">
        <Icon name="sede" size={22} />
        Dónde donar
      </h2>

      <div className="flex flex-col gap-4 rounded-xl bg-surface p-4 ring-1 ring-border">
        <div>
          <p className="text-base font-semibold">{inst.nombre}</p>
          {extras && <p className="text-sm text-text-secondary">{INSTITUCION.servicio}</p>}
        </div>

        <dl className="flex flex-col gap-3 text-base">
          <div className="flex items-start gap-3">
            <dt>
              <Icon name="sede" size={20} label={extras ? "Entrada de donantes" : "Dirección"} className="mt-0.5 text-text-secondary" />
            </dt>
            <dd>
              {extras && <span className="block text-sm font-semibold text-text-secondary">Entrada de donantes</span>}
              {direccion}
            </dd>
          </div>
          {extras && INSTITUCION.horario && (
            <div className="flex items-start gap-3">
              <dt>
                <Icon name="horario" size={20} label="Horario" className="mt-0.5 text-text-secondary" />
              </dt>
              <dd>
                {INSTITUCION.horario}
                <span className="block text-sm text-text-secondary">
                  Elegís día y hora al reservar el turno.
                </span>
              </dd>
            </div>
          )}
        </dl>

        <div className="grid gap-2 sm:grid-cols-2">
          {extras && (
            <a
              href={INSTITUCION.urlTurno}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-surface-brand px-4 text-base font-semibold text-text-on-brand"
            >
              <Icon name="turno" size={20} />
              Sacar turno
              <span className="sr-only">(se abre en una pestaña nueva)</span>
            </a>
          )}
          {/* US-16/ST-04 */}
          <a
            href={urlComoLlegar(direccion)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-text-primary ring-2 ring-border-interactive"
          >
            <Icon name="comoLlegar" size={20} />
            Cómo llegar
            <span className="sr-only">(abre el mapa en una pestaña nueva)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
