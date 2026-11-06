import type { Metadata } from "next";
import { Encabezado } from "@/components/marca";
import { FlujoPedido } from "./flujo-pedido";

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
      <main className="mx-auto w-full max-w-[480px] px-4 pb-24 pt-8">
        <FlujoPedido />
      </main>
    </>
  );
}
