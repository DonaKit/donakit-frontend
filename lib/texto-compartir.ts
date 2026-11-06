import { INSTITUCION } from "./institucion";
import { fechaLarga } from "./fechas";
import type { DatosPedido } from "./api";

/* ============================================================================
   US-06/ST-03 — Texto para compartir junto con las placas
   ----------------------------------------------------------------------------
   El backend tiene la columna `generated_copy` y la tarea de generarlo
   (US-06/ST-01 y ST-02), pero todavía devuelve null. Mientras tanto el texto
   se arma acá con los mismos datos. Si la campaña trae `generatedCopy`, se usa
   ese y esto queda como respaldo.

   Está escrito para WhatsApp, que es donde se va a pegar:
   - *texto* sale en negrita;
   - líneas cortas, porque se lee en un teléfono;
   - el enlace va solo en su línea, así WhatsApp lo detecta y arma la vista
     previa;
   - pocos emojis y con función (marcan dónde, cuándo, qué llevar), no de
     decoración.
   ========================================================================== */

export function textoParaCompartir(p: DatosPedido, url: string): string {
  const grupo = p.grupo ?? "cualquier grupo";
  const lineas: string[] = [
    "🩸 *Se necesitan donantes de sangre*",
    "",
    `Para *${p.nombre.trim()}*`,
    `Grupo y factor: *${grupo}*`,
  ];

  const cantidad = p.donantes ? `Se necesitan ${p.donantes} donantes` : "";
  const hasta = p.fecha ? `hasta el ${fechaLarga(p.fecha)}` : "";
  if (cantidad || hasta) {
    const frase = [cantidad, hasta].filter(Boolean).join(", ");
    lineas.push(frase.charAt(0).toUpperCase() + frase.slice(1));
  }

  lineas.push(
    "",
    `📍 ${INSTITUCION.nombre} – ${INSTITUCION.servicioCorto}`,
    `Entrada de donantes: ${INSTITUCION.entradaDonantes}, ${INSTITUCION.ciudad}`,
  );
  if (INSTITUCION.horario) lineas.push(`🗓️ ${INSTITUCION.horario}`);

  lineas.push(
    "",
    `✅ Llevá DNI, tenés que tener entre 16 y 65 años, pesar más de 50 kg y no ir en ayunas.`,
    "",
    "👉 Requisitos, turno y cómo llegar:",
    url,
    "",
    "Si no podés donar, compartilo: le puede llegar a quien sí pueda 🙏",
  );

  return lineas.join("\n");
}
