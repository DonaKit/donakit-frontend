"use client";

import { useEffect, useState } from "react";
import { generarPlaca11, type DatosPlaca } from "@/lib/placa";

/* ============================================================================
   Página interna — vista previa de la placa 1:1
   ----------------------------------------------------------------------------
   No es parte del producto: es el banco de pruebas del generador de US-03/ST-03.

   Existe porque los casos que rompen una placa son los extremos (un nombre de
   cuatro palabras, "TODOS" en lugar de "0+", un pedido sin fecha) y probarlos
   creando una campaña por cada uno es inviable. Acá se ven los seis de un
   golpe.
   ========================================================================== */

const CASOS: { titulo: string; nota: string; datos: DatosPlaca }[] = [
  {
    titulo: "Caso típico",
    nota: "Lo que se espera el 90% de las veces.",
    datos: {
      nombre: "Lucía Fernández",
      grupo: "0+",
      donantes: 6,
      fecha: "2026-11-20",
      slug: "donantes-lucia-fernandez-4a21bc",
    },
  },
  {
    titulo: "Nombre largo",
    nota: "El renglón del paciente achica la letra hasta entrar; si ni así entra, corta con puntos suspensivos.",
    datos: {
      nombre: "María de los Ángeles Rodríguez Etchebarne",
      grupo: "AB-",
      donantes: 4,
      fecha: "2026-12-05",
      slug: "donantes-maria-rodriguez-9f03de",
    },
  },
  {
    titulo: "Cualquier grupo",
    nota: '"TODOS" no entra al cuerpo de "0+": se dibuja más chico.',
    datos: {
      nombre: "Jorge Peralta",
      grupo: null,
      donantes: 10,
      fecha: "2026-11-12",
      slug: "donantes-jorge-peralta-77c1aa",
    },
  },
  {
    titulo: "Sin fecha ni cantidad",
    nota: 'Sin cantidad la etiqueta dice "Pedido de donación"; sin fecha desaparece esa fila.',
    datos: {
      nombre: "Ana Suárez",
      grupo: "B+",
      donantes: null,
      fecha: null,
      slug: "donantes-ana-suarez-1b55ef",
    },
  },
  {
    titulo: "Un solo nombre",
    nota: "El mínimo que acepta la validación.",
    datos: {
      nombre: "Ruiz",
      grupo: "A-",
      donantes: 2,
      fecha: "2026-11-08",
      slug: "donantes-ruiz-c40982",
    },
  },
  {
    titulo: "Cantidad alta",
    nota: "Dos dígitos: la etiqueta de arriba crece y no choca con el logo.",
    datos: {
      nombre: "Centro de Hemoterapia",
      grupo: "0-",
      donantes: 25,
      fecha: "2027-01-15",
      slug: "colecta-hemoterapia-ab3310",
    },
  },
];

export default function PaginaPlaca() {
  const [urls, setUrls] = useState<(string | null)[]>(
    () => CASOS.map(() => null),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    const creadas: string[] = [];

    (async () => {
      try {
        for (let i = 0; i < CASOS.length; i++) {
          const blob = await generarPlaca11(CASOS[i].datos);
          if (!vivo) return;
          const url = URL.createObjectURL(blob);
          creadas.push(url);
          setUrls((prev) => {
            const siguiente = [...prev];
            siguiente[i] = url;
            return siguiente;
          });
        }
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "Falló el generador.");
      }
    })();

    // Cada objectURL retiene el blob en memoria hasta que se revoca.
    return () => {
      vivo = false;
      for (const u of creadas) URL.revokeObjectURL(u);
    };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-gutter py-12">
      <h1 className="font-display text-3xl font-bold text-text-primary">
        Placa 1:1 — vista previa
      </h1>
      <p className="mt-3 max-w-prose text-text-secondary">
        Generada en el navegador con el canvas, a 1080×1080 reales. Lo que se ve
        acá es el archivo que se descarga, escalado para que entre en pantalla.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-danger-bg p-4 text-danger">
          {error}
        </p>
      )}

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        {CASOS.map((caso, i) => (
          <figure key={caso.titulo}>
            <div className="aspect-square overflow-hidden rounded-xl bg-surface-muted ring-1 ring-border">
              {urls[i] ? (
                /* Es un blob local de tamaño conocido; next/image no aporta
                   nada acá y exigiría configurar el dominio. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[i]!}
                  alt={`Placa de ejemplo: ${caso.titulo}`}
                  width={1080}
                  height={1080}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                  Generando…
                </div>
              )}
            </div>
            <figcaption className="mt-3">
              <span className="font-semibold text-text-primary">
                {caso.titulo}
              </span>
              <span className="mt-1 block text-sm text-text-secondary">
                {caso.nota}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
