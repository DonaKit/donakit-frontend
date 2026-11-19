"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

/* ============================================================================
   Detector de Inactividad de Sesión Administrativa (5 minutos)
   ----------------------------------------------------------------------------
   Escucha eventos de actividad del usuario (mouse, teclado, scroll, touch).
   Si pasan 5 minutos continuos sin interacción, cierra la sesión automáticamente
   y redirige a la pantalla de login con el mensaje correspondiente.
   ========================================================================== */

const TIEMPO_LIMITE_MS = 5 * 60 * 1000; // 5 minutos (300.000 ms)
const EVENTOS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
];

export function DetectorInactividad() {
  const temporizador = useRef<NodeJS.Timeout | null>(null);
  const ultimoMovimiento = useRef<number>(0);

  useEffect(() => {
    ultimoMovimiento.current = Date.now();
    function cerrarPorInactividad() {
      // Cierra sesión cliente y redirige indicando la causa
      void signOut({ redirectTo: "/login?error=SessionExpired" });
    }

    function reiniciarTemporizador() {
      ultimoMovimiento.current = Date.now();
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
      temporizador.current = setTimeout(cerrarPorInactividad, TIEMPO_LIMITE_MS);
    }

    // Iniciar temporizador inicial
    reiniciarTemporizador();

    // Throttling ligero para no reiniciar el timer en cada milisegundo de mousemove
    let throttling = false;
    function handleActividad() {
      if (throttling) return;
      throttling = true;
      reiniciarTemporizador();
      setTimeout(() => {
        throttling = false;
      }, 1000);
    }

    // También comprobar cuando la pestaña vuelve a tener foco (ej. si suspendió la PC o cambió de pestaña)
    function handleVisibilidad() {
      if (document.visibilityState === "visible") {
        const transcurrido = Date.now() - ultimoMovimiento.current;
        if (transcurrido >= TIEMPO_LIMITE_MS) {
          cerrarPorInactividad();
        } else {
          reiniciarTemporizador();
        }
      }
    }

    EVENTOS.forEach((evento) => {
      window.addEventListener(evento, handleActividad, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilidad);

    return () => {
      if (temporizador.current) {
        clearTimeout(temporizador.current);
      }
      EVENTOS.forEach((evento) => {
        window.removeEventListener(evento, handleActividad);
      });
      document.removeEventListener("visibilitychange", handleVisibilidad);
    };
  }, []);

  return null;
}
