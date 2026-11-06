"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { INSTITUCION } from "@/lib/institucion";
import { Dialogo } from "@/components/ui/dialogo";

/* ============================================================================
   US-17/ST-03 — Botones de contacto directo con Hemoterapia
   US-17/ST-04 — Diálogo con el contacto secundario
   ----------------------------------------------------------------------------
   El contacto principal es el teléfono del Banco de Sangre: un enlace tel:
   que en el celular marca directo. Es lo que sirve para la duda de último
   momento ("¿puedo donar si tomé un antibiótico?").

   Lo secundario (conmutador del hospital, web) va en un diálogo, para no
   competir con el botón principal.

   No hay botón de WhatsApp ni de email: la web del Garrahan no publica un
   WhatsApp para donar sangre y el email aparece oculto. Poner un contacto
   que no sabemos si existe es peor que no ponerlo. Cuando el backend exponga
   `whatsapp` y `email` de la institución (US-17/ST-02), se agregan acá.
   ========================================================================== */

export function Contacto() {
  const [abierto, setAbierto] = useState(false);

  return (
    <section aria-labelledby="titulo-contacto" className="flex flex-col gap-4">
      <h2 id="titulo-contacto" className="flex items-center gap-2 text-xl font-semibold">
        <Icon name="telefono" size={22} />
        ¿Tenés dudas?
      </h2>
      <p className="-mt-2 text-sm text-text-secondary">
        Consultá directamente con el Banco de Sangre antes de ir.
      </p>

      <a
        href={INSTITUCION.telefono.enlace}
        className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg bg-surface-brand px-4 text-lg font-semibold text-text-on-brand"
      >
        <Icon name="telefono" size={20} />
        Llamar al {INSTITUCION.telefono.visible}
      </a>

      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-text-primary ring-2 ring-border-interactive"
      >
        <Icon name="info" size={20} />
        Otras formas de contacto
      </button>

      {/* US-17/ST-04 */}
      <Dialogo abierto={abierto} alCerrar={() => setAbierto(false)} titulo="Otras formas de contacto">
        <div className="flex flex-col gap-4 pt-3">
          <dl className="flex flex-col gap-4 text-base">
            <div>
              <dt className="text-sm font-semibold text-text-secondary">Banco de Sangre</dt>
              <dd>
                <a href={INSTITUCION.telefono.enlace} className="font-semibold underline underline-offset-2">
                  {INSTITUCION.telefono.visible}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-text-secondary">Conmutador del hospital</dt>
              <dd>
                <a href={INSTITUCION.telefonoGeneral.enlace} className="font-semibold underline underline-offset-2">
                  {INSTITUCION.telefonoGeneral.visible}
                </a>
                <span className="block text-sm text-text-secondary">Pedí que te comuniquen con Hemoterapia.</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-text-secondary">Web del Banco de Sangre</dt>
              <dd>
                <a
                  href={INSTITUCION.web}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                >
                  garrahan.gov.ar
                  <Icon name="enlaceExterno" size={16} />
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
                <span className="block text-sm text-text-secondary">Turnos, requisitos y novedades.</span>
              </dd>
            </div>
          </dl>
          <p className="rounded-lg bg-surface-muted p-3 text-sm text-text-secondary">
            Para consultas por el paciente, hablá con la familia que compartió
            este pedido.
          </p>
        </div>
      </Dialogo>
    </section>
  );
}
