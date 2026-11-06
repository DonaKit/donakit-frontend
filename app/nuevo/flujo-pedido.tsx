"use client";

import { useState } from "react";
import type { CampaniaCreada, DatosPedido } from "@/lib/api";
import { PantallaResultado } from "@/components/resultado/pantalla-resultado";
import { FormularioPedido } from "./formulario-pedido";

/* ============================================================================
   Flujo de dos pasos: formulario -> kit
   ----------------------------------------------------------------------------
   Los datos del pedido viven acá, por encima de las dos pantallas. Eso es lo
   que permite US-10/ST-02: al tocar "Corregir datos" el formulario vuelve con
   todo cargado, y si se vuelve sin cambios el kit sigue siendo el mismo (no se
   crea otra campaña ni se regeneran las placas).

   Es un solo componente con dos estados y no dos rutas (/nuevo y /kit) a
   propósito: el kit depende del editToken, que no debe viajar en la URL, y
   recargar a mitad del flujo no tiene un estado útil que recuperar.
   ========================================================================== */

type Paso =
  | { paso: "formulario"; anterior?: { campania: CampaniaCreada; pedido: DatosPedido } }
  | { paso: "kit"; campania: CampaniaCreada; pedido: DatosPedido };

export function FlujoPedido() {
  const [estado, setEstado] = useState<Paso>({ paso: "formulario" });

  function irArriba() {
    window.scrollTo({ top: 0 });
  }

  if (estado.paso === "kit") {
    return (
      <PantallaResultado
        // La key fuerza un componente nuevo por versión del kit: al corregir
        // con PATCH el id es el mismo, pero las placas tienen que rehacerse.
        key={`${estado.campania.id}|${estado.campania.slug}|${JSON.stringify(estado.pedido)}`}
        campania={estado.campania}
        pedido={estado.pedido}
        alCorregir={() => {
          setEstado({ paso: "formulario", anterior: { campania: estado.campania, pedido: estado.pedido } });
          irArriba();
        }}
      />
    );
  }

  const anterior = estado.anterior;
  return (
    <>
      <p className="text-sm font-medium text-text-secondary">Paso 1 de 2</p>
      <h1 className="mt-2 text-2xl">{anterior ? "Corregir el pedido" : "Pedido de donantes"}</h1>
      <p className="mt-2 text-base leading-relaxed text-text-secondary">
        {anterior
          ? "Cambiá lo que haga falta. Si no cambiás nada, volvés al mismo kit."
          : "Con estos datos armamos la página del caso y las placas listas para compartir por WhatsApp."}
      </p>

      <div className="mt-8">
        <FormularioPedido
          inicial={anterior?.pedido}
          anterior={anterior?.campania}
          alCrear={(campania, pedido) => {
            setEstado({ paso: "kit", campania, pedido });
            irArriba();
          }}
          alCancelar={
            anterior
              ? () => {
                  setEstado({ paso: "kit", ...anterior });
                  irArriba();
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
