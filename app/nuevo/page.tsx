import type { Metadata } from "next";
import { Encabezado } from "@/components/marca";
import { FormularioPedido } from "./formulario-pedido";

export const metadata: Metadata = {
  title: "Nuevo pedido",
  description:
    "Cargá los datos del pedido y DonaKit genera la página y las placas para difundir.",
};

/* ============================================================================
   US-01 — Pantalla de carga del pedido
   ----------------------------------------------------------------------------
   Ruta: /nuevo

   El ancho máximo de 480 px es el token --container-app del design system.
   En un celular ocupa todo; en una pantalla grande queda centrado, porque un
   formulario de una columna estirado a 1200 px es ilegible.
   ========================================================================== */

export default function PaginaNuevoPedido() {
  return (
    <>
      <Encabezado />
      <main className="mx-auto w-full max-w-[480px] px-4 pb-16 pt-8">
      <p className="text-sm font-medium text-text-secondary">
        Paso 1 de 2
      </p>
      <h1 className="mt-2 text-2xl">Pedido de donantes</h1>
      <p className="mt-2 text-base leading-relaxed text-text-secondary">
        Con estos datos armamos la página del caso y las placas listas para
        compartir por WhatsApp.
      </p>

      <div className="mt-8">
        <FormularioPedido />
      </div>
      </main>
    </>
  );
}
