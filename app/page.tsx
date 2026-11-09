import Link from "next/link";
import { Encabezado } from "@/components/marca";
import { Icon, type IconName } from "@/lib/icons";

/* ============================================================================
   Portada — ruta /
   ----------------------------------------------------------------------------
   Hasta ahora la raíz mostraba la página de ejemplo de Next.js. Ninguna
   historia de usuario pide una portada, pero es adonde llega quien escribe
   la dirección a mano y adonde lleva "Ir a DonaKit" cuando un pedido no
   existe, así que no puede quedar vacía.

   Es deliberadamente mínima: qué es DonaKit, cómo funciona en tres pasos y un
   solo botón a /nuevo. Quien llega acá viene a armar un pedido; cualquier
   otra cosa en la pantalla lo demora.
   ========================================================================== */

const PASOS: { icono: IconName; titulo: string; texto: string }[] = [
  {
    icono: "editar",
    titulo: "Completá los datos",
    texto: "Nombre del paciente, grupo sanguíneo, cuántos donantes hacen falta y hasta cuándo.",
  },
  {
    icono: "placa",
    titulo: "Descargá las placas",
    texto: "Una cuadrada para el feed y una vertical para estados e historias, con el QR al pedido.",
  },
  {
    icono: "compartir",
    titulo: "Compartilas",
    texto: "Cada placa lleva a una página con la sede, los requisitos y cómo sacar turno.",
  },
];

export default function Portada() {
  return (
    <>
      <Encabezado />
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-10 px-4 pb-24 pt-10">
        <section className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold leading-tight">
            Conseguí donantes de sangre para tu familiar en minutos
          </h1>
          <p className="text-lg leading-relaxed text-text-secondary">
            DonaKit arma el pedido listo para compartir por WhatsApp e
            Instagram: las placas, el texto y una página con toda la
            información para quien quiera donar.
          </p>
          <Link
            href="/nuevo"
            className="mt-2 flex h-14 items-center justify-center gap-2 rounded-lg bg-surface-brand px-6 text-lg font-semibold text-text-on-brand"
          >
            <Icon name="donacion" size={20} />
            Armar un pedido
          </Link>
          <p className="text-center text-sm text-text-secondary">Gratis y sin crear una cuenta.</p>
        </section>

        <section aria-labelledby="titulo-como-funciona" className="flex flex-col gap-4">
          <h2 id="titulo-como-funciona" className="text-xl font-semibold">
            Cómo funciona
          </h2>
          <ol className="flex flex-col gap-3">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4 rounded-xl bg-surface p-4 ring-1 ring-border">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-primary"
                >
                  <Icon name={p.icono} size={20} />
                </span>
                <div>
                  <h3 className="text-base font-semibold">
                    {i + 1}. {p.titulo}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
