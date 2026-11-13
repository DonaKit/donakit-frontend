"use client";

import { Icon } from "@/lib/icons";
import { INSTITUCION } from "@/lib/institucion";
import type { CampaniaPublica } from "@/lib/api";
import { SeccionDesplegable } from "./seccion-desplegable";

/* ============================================================================
   US-17/ST-03 — Botones de contacto directo con Hemoterapia
   US-17/ST-04 — Contacto secundario
   ----------------------------------------------------------------------------
   Datos: primero los de la institución que devuelve el backend (US-17/ST-02:
   phone, whatsapp, email, website_url). Si la base no los tiene y la campaña
   es de la institución del MVP, se completan con lib/institucion.ts.

   Botones principales, uno por canal que exista:
   - Llamar: enlace tel:, que en el celular marca directo.
   - WhatsApp: enlace wa.me con un mensaje ya escrito, para que la persona no
     tenga que pensar cómo empezar.
   Lo secundario (otro teléfono, email, web) va debajo, con letra más chica,
   para no competir con el botón principal.

   CAMBIO DESPUÉS DE QA (US-18): la sección arranca cerrada (desplegable),
   y lo secundario ya no va en un diálogo aparte. En el celular el diálogo se
   abría vacío; además, con la sección desplegable, un diálogo adentro era un
   paso de más. Ahora al abrir "¿Tenés dudas?" está todo a la vista.

   Si no hay ningún canal, la sección no se muestra: un "¿Tenés dudas?" sin a
   quién preguntar es peor que no decir nada.
   ========================================================================== */

/** "011 4122-6000" -> "tel:+541141226000". Sin código de área no se adivina. */
function enlaceTelefono(numero: string): string {
  const limpio = numero.replace(/[^\d+]/g, "");
  if (limpio.startsWith("+")) return `tel:${limpio}`;
  const digitos = limpio.replace(/^0/, "");
  return digitos.length >= 10 ? `tel:+54${digitos}` : `tel:${digitos}`;
}

/** "+54 9 11 2027-0742" -> "https://wa.me/5491120270742?text=..." */
function enlaceWhatsapp(numero: string, mensaje: string): string {
  return `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`;
}

export function Contacto({ c, extras }: { c: CampaniaPublica; extras: boolean }) {
  const inst = c.institucion;

  const telefono = inst?.telefono
    ? { visible: inst.telefono, enlace: enlaceTelefono(inst.telefono) }
    : extras
      ? INSTITUCION.telefono
      : null;
  const whatsapp = inst?.whatsapp ?? null;
  const email = inst?.email ?? null;
  const web = inst?.web ?? (extras ? INSTITUCION.web : null);

  // Teléfonos extra para el diálogo, sin repetir el principal.
  const otrosTelefonos = extras
    ? [
        { nombre: "Banco de Sangre", ...INSTITUCION.telefono },
        { nombre: "Conmutador del hospital", ...INSTITUCION.telefonoGeneral, nota: "Pedí que te comuniquen con Hemoterapia." },
      ].filter((t) => t.enlace !== telefono?.enlace)
    : [];

  if (!telefono && !whatsapp && !email && !web) return null;
  const haySecundario = otrosTelefonos.length > 0 || email || web;

  return (
    <SeccionDesplegable
      id="titulo-contacto"
      icono="telefono"
      titulo="¿Tenés dudas?"
      resumen="Consultá con el banco de sangre antes de ir."
    >
      <div className="flex flex-col gap-3">
        {telefono && (
          <a
            href={telefono.enlace}
            className="flex min-h-14 items-center justify-center gap-2.5 rounded-lg bg-surface-brand px-4 text-lg font-semibold text-text-on-brand"
          >
            <Icon name="telefono" size={20} />
            Llamar al {telefono.visible}
          </a>
        )}

        {whatsapp && (
          <a
            href={enlaceWhatsapp(whatsapp, `Hola, quiero donar sangre por el pedido de ${c.nombre}. ¿Me pueden ayudar?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-text-primary ring-2 ring-border-interactive"
          >
            <Icon name="whatsapp" size={20} />
            Escribir por WhatsApp
            <span className="sr-only">(se abre WhatsApp)</span>
          </a>
        )}

        {/* US-17/ST-04 */}
        {haySecundario && (
          <div className="mt-2 flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              Otras formas de contacto
            </h3>
            <dl className="flex flex-col gap-3 text-base">
              {otrosTelefonos.map((t) => (
                <div key={t.enlace}>
                  <dt className="text-sm font-semibold text-text-secondary">{t.nombre}</dt>
                  <dd>
                    <a href={t.enlace} className="font-semibold underline underline-offset-2">
                      {t.visible}
                    </a>
                    {"nota" in t && t.nota && <span className="block text-sm text-text-secondary">{t.nota}</span>}
                  </dd>
                </div>
              ))}
              {email && (
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${email}?subject=${encodeURIComponent(`Donación por ${c.nombre}`)}`}
                      className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 wrap-anywhere"
                    >
                      <Icon name="email" size={16} className="shrink-0" />
                      {email}
                    </a>
                  </dd>
                </div>
              )}
              {web && (
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">Web</dt>
                  <dd>
                    <a
                      href={web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 wrap-anywhere"
                    >
                      {web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      <Icon name="enlaceExterno" size={16} className="shrink-0" />
                      <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <p className="rounded-lg bg-surface-muted p-3 text-sm text-text-secondary">
          Para consultas por el paciente, hablá con la familia que compartió
          este pedido.
        </p>
      </div>
    </SeccionDesplegable>
  );
}
