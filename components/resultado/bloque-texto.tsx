"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import { copiarTexto } from "@/lib/copiar";
import { useAvisos } from "@/components/ui/avisos";

/* ============================================================================
   US-06/ST-03 — Previsualización del texto para compartir
   US-09/ST-02 — Botón "Copiar texto" con cambio de ícono y estado
   US-09/ST-03 — Aviso de copiado (a través de useAvisos)
   ----------------------------------------------------------------------------
   El texto se muestra tal cual se va a pegar, con los saltos de línea y los
   asteriscos de WhatsApp a la vista: así la persona ve exactamente qué va a
   mandar y no hay sorpresas.

   El botón cambia de "Copiar" a "Copiado ✓" durante 2 segundos. El aviso
   abajo confirma lo mismo para quien no estaba mirando el botón, y lo anuncia
   el lector de pantalla.
   ========================================================================== */

interface Props {
  texto: string;
  /** Se llama después de copiar con éxito (para confirmar la campaña). */
  alCopiar?: () => void;
}

export function BloqueTexto({ texto, alCopiar }: Props) {
  const avisar = useAvisos();
  const [copiado, setCopiado] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (reloj.current) clearTimeout(reloj.current);
  }, []);

  async function copiar() {
    const ok = await copiarTexto(texto);
    if (!ok) {
      avisar("No pudimos copiar. Seleccioná el texto y copialo a mano.", "error");
      return;
    }
    setCopiado(true);
    avisar("Texto copiado. Pegalo en WhatsApp junto con la placa.");
    alCopiar?.();
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <section aria-labelledby="titulo-texto" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-texto" className="text-lg font-semibold">
          Texto para acompañar
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Mandalo junto con la placa: tiene el enlace a la página del caso.
        </p>
      </div>

      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-4 font-sans text-sm leading-relaxed text-text-primary ring-1 ring-border">
        {texto}
      </pre>

      <button
        type="button"
        onClick={copiar}
        className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-lg text-lg font-semibold ring-2 transition-colors ${
          copiado
            ? "bg-success-bg text-success ring-success"
            : "bg-surface text-text-primary ring-border-interactive"
        }`}
      >
        <Icon name={copiado ? "listo" : "copiar"} size={20} />
        {/* aria-live para que el cambio de estado se anuncie aunque el foco
            siga en el botón. */}
        <span aria-live="polite">{copiado ? "Copiado" : "Copiar texto"}</span>
      </button>
    </section>
  );
}
