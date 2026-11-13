"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "@/lib/icons";

/* ============================================================================
   Avisos emergentes ("toasts") — US-07/ST-04 y US-09/ST-03
   ----------------------------------------------------------------------------
   Confirman acciones que no cambian la pantalla: "Descarga iniciada",
   "Texto copiado". Sin el aviso, la persona no sabe si el toque funcionó y lo
   repite.

   Accesibilidad: la región tiene role="status" y aria-live="polite", así un
   lector de pantalla lee el aviso sin interrumpir lo que estaba leyendo. Los
   errores usan role="alert", que sí interrumpe.

   Se ubican abajo y centrados porque en el teléfono es donde está el pulgar y
   la vista, y no tapan el botón que se acaba de tocar (que suele estar arriba
   del aviso, no debajo).
   ========================================================================== */

type Tipo = "exito" | "error" | "info";
interface Aviso {
  id: number;
  texto: string;
  tipo: Tipo;
}

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

/** Duración en pantalla. 4 s alcanzan para leer una frase corta dos veces. */
const DURACION_MS = 4000;

export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const siguiente = useRef(1);

  const avisar = useCallback((texto: string, tipo: Tipo = "exito") => {
    const id = siguiente.current++;
    // Como máximo dos a la vez: más que eso tapa la pantalla.
    setAvisos((a) => [...a.slice(-1), { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), DURACION_MS);
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {avisos.map((a) => (
          <p
            key={a.id}
            role={a.tipo === "error" ? "alert" : undefined}
            className={`aviso-entrada pointer-events-auto flex max-w-[440px] items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              a.tipo === "error"
                ? "bg-danger text-text-on-brand"
                : "bg-ink-900 text-text-on-brand"
            }`}
          >
            <Icon
              name={a.tipo === "error" ? "error" : a.tipo === "info" ? "info" : "exito"}
              size={18}
            />
            {a.texto}
          </p>
        ))}
      </div>
    </Contexto.Provider>
  );
}

/** `const avisar = useAvisos(); avisar("Texto copiado")` */
export function useAvisos() {
  return useContext(Contexto);
}
