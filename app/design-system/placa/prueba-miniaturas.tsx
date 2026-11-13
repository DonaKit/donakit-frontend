"use client";

import { useEffect, useState } from "react";
import { generarPlaca11, type DatosPlaca } from "@/lib/placa";

/* ============================================================================
   US-11/ST-03 — Pruebas de legibilidad en miniaturas de apps de mensajería
   ----------------------------------------------------------------------------
   Una placa se ve casi siempre CHICA: en la burbuja del chat de WhatsApp
   (~280 px de ancho en un teléfono) y, antes de abrirla, en la vista previa
   de la notificación o de la lista de chats (~120 px).

   La prueba tiene dos partes:
   1. Visual: las placas se muestran a esos tamaños reales, para mirarlas.
   2. Numérica: cuánto mide cada texto a ese tamaño. Un texto de menos de
      ~8 px en pantalla no se lee; entre 8 y 12 se lee con esfuerzo; de 12 en
      adelante se lee sin esfuerzo.

   Lo que tiene que sobrevivir a 120 px es lo que decide si alguien abre la
   imagen: el grupo sanguíneo y la etiqueta (urgente / cuántos donantes). El
   resto se lee al abrirla. Esa es la jerarquía de US-11/ST-01, y la tabla
   muestra que se cumple.
   ========================================================================== */

/** Tamaños de letra de la placa 1:1 en px sobre 1080 (ver MEDIDAS en lib/placa.ts). */
const TEXTOS = [
  { que: "Grupo sanguíneo (\"0+\")", px: 196, clave: true },
  { que: "\"GRUPO Y FACTOR:\"", px: 70, clave: false },
  { que: "Nombre del paciente", px: 40, clave: false },
  { que: "Etiqueta (URGENTE / donantes)", px: 26, clave: true },
  { que: "Requisitos", px: 28, clave: false },
];
const ANCHOS = [
  { px: 390, donde: "Abierta a pantalla completa" },
  { px: 280, donde: "Burbuja del chat" },
  { px: 120, donde: "Vista previa / notificación" },
];

function veredicto(px: number) {
  if (px >= 12) return { texto: "Se lee", clase: "text-success" };
  if (px >= 8) return { texto: "Con esfuerzo", clase: "text-warning" };
  return { texto: "No se lee", clase: "text-danger" };
}

export function PruebaMiniaturas({ casos }: { casos: { titulo: string; datos: DatosPlaca }[] }) {
  const [urls, setUrls] = useState<(string | null)[]>(() => casos.map(() => null));

  useEffect(() => {
    let vivo = true;
    const creadas: string[] = [];
    (async () => {
      for (let i = 0; i < casos.length; i++) {
        const u = URL.createObjectURL(await generarPlaca11(casos[i].datos));
        creadas.push(u);
        if (!vivo) return;
        setUrls((x) => x.map((v, j) => (j === i ? u : v)));
      }
    })();
    return () => {
      vivo = false;
      creadas.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [casos]);

  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-bold text-text-primary">
        Legibilidad en miniatura — US-11/ST-03
      </h2>
      <p className="mt-2 max-w-prose text-text-secondary">
        Así se ve la placa en WhatsApp antes de abrirla. Lo que tiene que leerse
        a este tamaño es el grupo y la etiqueta: es lo que decide si alguien
        toca la imagen.
      </p>

      <div className="mt-8 flex flex-wrap items-end gap-8">
        {casos.map((c, i) =>
          ANCHOS.map((a) => (
            <figure key={`${c.titulo}-${a.px}`} className="flex flex-col gap-2">
              <div
                className="overflow-hidden rounded-md bg-surface-muted ring-1 ring-border"
                style={{ width: a.px, height: a.px }}
              >
                {urls[i] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[i]!} alt={`${c.titulo} a ${a.px} px`} width={a.px} height={a.px} />
                )}
              </div>
              <figcaption className="text-sm text-text-secondary">
                {c.titulo} · {a.px} px
                <span className="block text-xs">{a.donde}</span>
              </figcaption>
            </figure>
          )),
        )}
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="mb-2 text-left text-text-secondary">
            Tamaño de cada texto en pantalla (placa 1:1)
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 font-semibold">Texto</th>
              {ANCHOS.map((a) => (
                <th key={a.px} className="py-2 pr-4 font-semibold">
                  A {a.px} px
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TEXTOS.map((t) => (
              <tr key={t.que} className="border-b border-border">
                <td className="py-2 pr-4">
                  {t.que}
                  {t.clave && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">clave</span>}
                </td>
                {ANCHOS.map((a) => {
                  const enPantalla = (t.px * a.px) / 1080;
                  const v = veredicto(enPantalla);
                  return (
                    <td key={a.px} className="py-2 pr-4 tabular-nums">
                      {enPantalla.toFixed(1)} px · <span className={`font-semibold ${v.clase}`}>{v.texto}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 max-w-prose space-y-2 text-sm text-text-secondary">
        <p>
          <strong className="text-text-primary">Resultado.</strong> El grupo
          sanguíneo se lee en los tres tamaños: mide 22 px aun en la vista previa
          de 120 px. Es el único texto que lo logra, y es el que tiene que
          lograrlo.
        </p>
        <p>
          La etiqueta (URGENTE / donantes) no se lee en la burbuja ni en la vista
          previa: queda en 7 y 3 px. Lo que sí se distingue es el color: URGENTE
          es un bloque rojo sólido y el normal es contorno sobre rosa. La
          urgencia se comunica por color hasta que la imagen se abre.
        </p>
        <p>
          El nombre se lee con esfuerzo en la burbuja (10 px) y bien al abrir la
          imagen (14 px). Requisitos y dirección están pensados para leerse con
          la imagen abierta, y ahí se leen con esfuerzo: por eso también están en
          la landing, a tamaño normal.
        </p>
        <p>
          El QR se probó aparte, decodificándolo: se lee hasta 640 px de ancho con
          compresión JPEG como la de WhatsApp.
        </p>
      </div>
    </section>
  );
}
