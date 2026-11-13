"use client";

import { useId, useMemo, useState } from "react";
import { Icon } from "@/lib/icons";
import { nombreCategoria, PREGUNTAS_FRECUENTES, type PreguntaFrecuente } from "@/lib/contenido-donante";
import type { PreguntaBackend } from "@/lib/api";
import { SeccionDesplegable } from "./seccion-desplegable";

/* ============================================================================
   US-15/ST-03 — Acordeón accesible de preguntas frecuentes
   US-15/ST-04 — Buscador por palabra clave
   ----------------------------------------------------------------------------
   Acordeón según el patrón de WAI-ARIA: cada pregunta es un <button> dentro
   de un encabezado, con aria-expanded y aria-controls apuntando a su
   respuesta. Se pueden tener varias abiertas a la vez: quien está leyendo dos
   respuestas parecidas no quiere que una cierre la otra.

   El buscador filtra preguntas Y respuestas:
   - sin distinguir mayúsculas ni tildes (en el teléfono casi nadie las pone);
   - por raíz de palabra: "ayuno" encuentra "ayunas", "tatuajes" encuentra
     "tatuaje". Se compara sin la vocal ni la "s" final, que es donde cambian
     el género, el número y la forma de la palabra en castellano;
   - cada palabra por separado: "turno tatuaje" muestra lo que tenga las dos.
   Mientras hay búsqueda, las coincidencias se muestran abiertas, porque si la
   palabra está en la respuesta es la respuesta lo que se quiere ver.

   Las preguntas salen del backend (US-15/ST-02, tabla `faq_item`). Si la
   campaña no trae ninguna, se usan las generales de lib/contenido-donante.ts.

   Después de QA (US-18) la sección entera arranca cerrada, dentro de una
   SeccionDesplegable: en el celular ocupaba varias pantallas.
   ========================================================================== */

/** "Sí, AYÚNAS" -> "si, ayunas": sin tildes y en minúscula. */
function normalizar(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Raíz aproximada: "ayunas"/"ayuno" -> "ayun", "tatuajes" -> "tatuaj". */
function raiz(palabra: string) {
  if (palabra.length <= 4) return palabra;
  return palabra.replace(/(es|s)$/, "").replace(/[aeiou]$/, "");
}

function coincide(texto: string, consulta: string) {
  const t = normalizar(texto);
  return consulta
    .split(/\s+/)
    .filter(Boolean)
    .every((palabra) => t.includes(raiz(palabra)));
}

export function PreguntasFrecuentes({ desdeBackend = [] }: { desdeBackend?: PreguntaBackend[] }) {
  const lista: PreguntaFrecuente[] = useMemo(
    () =>
      desdeBackend.length > 0
        ? desdeBackend.map((p) => ({ ...p, categoria: nombreCategoria(p.categoria) }))
        : PREGUNTAS_FRECUENTES,
    [desdeBackend],
  );
  const [busqueda, setBusqueda] = useState("");
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const idBuscador = useId();

  const q = normalizar(busqueda.trim());
  const visibles = useMemo(
    () =>
      q === "" ? lista : lista.filter((p) => coincide(`${p.pregunta} ${p.respuesta}`, q)),
    [q, lista],
  );

  function alternar(id: string) {
    setAbiertas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <SeccionDesplegable
      id="titulo-faq"
      icono="pregunta"
      titulo="Preguntas frecuentes"
      resumen={`${lista.length} respuestas sobre cómo donar, con buscador.`}
    >
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor={idBuscador} className="sr-only">
            Buscar en las preguntas frecuentes
          </label>
          <div className="relative">
            <Icon name="buscar" size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              id={idBuscador}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscá: ayunas, turno, tatuaje…"
              className="h-12 w-full rounded-lg bg-surface pl-10 pr-3 text-base ring-1 ring-border-interactive placeholder:text-text-muted focus:outline-2 focus:outline-focus"
              aria-describedby={`${idBuscador}-resultados`}
            />
          </div>
          <p id={`${idBuscador}-resultados`} aria-live="polite" className="mt-2 text-sm text-text-secondary">
            {q === ""
              ? `${lista.length} preguntas`
              : visibles.length === 0
                ? "No encontramos esa palabra. Probá con otra o llamá al banco de sangre."
                : `${visibles.length} ${visibles.length === 1 ? "resultado" : "resultados"}`}
          </p>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-xl bg-surface ring-1 ring-border">
          {visibles.map((p) => (
            <Item
              key={p.id}
              p={p}
              // Con búsqueda activa, las coincidencias se ven abiertas.
              abierta={q !== "" || abiertas.has(p.id)}
              alAlternar={() => alternar(p.id)}
            />
          ))}
        </div>
      </div>
    </SeccionDesplegable>
  );
}

function Item({ p, abierta, alAlternar }: { p: PreguntaFrecuente; abierta: boolean; alAlternar: () => void }) {
  const idRespuesta = `faq-${p.id}`;
  return (
    <div>
      <h3>
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={idRespuesta}
          onClick={alAlternar}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold text-text-primary hover:bg-surface-muted"
        >
          <span className="min-w-0 wrap-anywhere">
            <span className="block text-xs font-semibold uppercase tracking-wide text-text-muted">{p.categoria}</span>
            {p.pregunta}
          </span>
          <Icon
            name="desplegar"
            size={20}
            className={`shrink-0 text-text-secondary transition-transform ${abierta ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      <div id={idRespuesta} hidden={!abierta} className="px-4 pb-4 text-base leading-relaxed text-text-secondary wrap-anywhere">
        {p.respuesta}
      </div>
    </div>
  );
}
