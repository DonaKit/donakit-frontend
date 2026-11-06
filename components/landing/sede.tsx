import { Icon } from "@/lib/icons";
import { INSTITUCION } from "@/lib/institucion";
import type { CampaniaPublica } from "@/lib/api";

/* ============================================================================
   US-16/ST-03 — Tarjeta de sede con horario de atención
   US-16/ST-04 — Botón de ubicación ("Cómo llegar")
   ----------------------------------------------------------------------------
   Datos: primero lo que devuelve el backend (US-16/ST-02: dirección y
   `business_hours`), y lo de lib/institucion.ts solo si la base no lo tiene.

   Una excepción: la DIRECCIÓN del Garrahan. La base tiene la entrada
   principal (Combate de los Pozos 1881), pero la web del banco de sangre dice
   que los donantes entran por 15 de Noviembre de 1889 N° 2151. Mandar a
   alguien a la puerta equivocada de un hospital pediátrico es perderle media
   hora, así que mientras la base no se corrija se muestra la verificada.

   "Cómo llegar" abre Google Maps con la dirección buscada. Es un enlace común
   y no un mapa incrustado: un mapa embebido pesa más de 1 MB, necesita una
   clave de API y en el celular la persona igual lo termina abriendo en la app
   de mapas para que la guíe.

   `extras` es true cuando la campaña es de la institución del MVP: solo ahí
   se completan datos del frontend, para no mezclar datos de otra institución.
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
  const horario = inst.horario ?? (extras ? INSTITUCION.horario : null);
  const turno = extras ? INSTITUCION.urlTurno : null;

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
          {horario && (
            <div className="flex items-start gap-3">
              <dt>
                <Icon name="horario" size={20} label="Horario" className="mt-0.5 text-text-secondary" />
              </dt>
              <dd>
                {horario}
                {turno && (
                  <span className="block text-sm text-text-secondary">Con turno previo: elegís día y hora al reservar.</span>
                )}
              </dd>
            </div>
          )}
        </dl>

        {inst.requisitosPropios && (
          <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-sm leading-relaxed">
            <Icon name="info" size={18} className="mt-0.5 shrink-0" />
            {inst.requisitosPropios}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {turno && (
            <a
              href={turno}
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
