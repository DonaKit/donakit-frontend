import type { ValorGrupo } from "./grupos-sanguineos";

/* ============================================================================
   US-01/ST-02 — Validación de los campos del pedido
   ----------------------------------------------------------------------------
   Funciones puras: reciben un valor y devuelven un resultado. No tocan el DOM
   ni saben nada de React.

   Por qué separado del componente: las mismas reglas las va a necesitar
   US-02/ST-02 para los campos opcionales, y eventualmente el backend en
   CreateCampaignDto (US-01/ST-04). Una regla escrita dos veces se desincroniza.
   ========================================================================== */

export type Resultado =
  | { ok: true; aviso?: string }
  | { ok: false; error: string };

/** Largo a partir del cual el nombre empieza a achicarse en la placa. */
export const NOMBRE_LARGO = 32;

/** Largo máximo aceptado. Más que esto no entra ni achicado. */
export const NOMBRE_MAXIMO = 60;

export function validarNombre(valor: string): Resultado {
  const v = valor.trim();

  if (v === "") {
    return { ok: false, error: "Escribí el nombre de la persona." };
  }
  if (v.length < 3) {
    return { ok: false, error: "El nombre parece incompleto." };
  }
  if (/\d/.test(v)) {
    return { ok: false, error: "El nombre no lleva números." };
  }
  if (v.length > NOMBRE_MAXIMO) {
    return {
      ok: false,
      error: `Máximo ${NOMBRE_MAXIMO} caracteres. Probá con el nombre y un apellido.`,
    };
  }
  if (v.length > NOMBRE_LARGO) {
    // No bloquea: la placa lo resuelve achicando el cuerpo. Pero conviene
    // avisarlo acá, donde todavía se puede acortar, y no descubrirlo después.
    return {
      ok: true,
      aviso: "Es largo: en la placa va a verse más chico.",
    };
  }
  return { ok: true };
}

export function validarInstitucion(valor: string): Resultado {
  if (valor === "") {
    return { ok: false, error: "Elegí dónde se dona." };
  }
  return { ok: true };
}

export function validarGrupo(valor: ValorGrupo | undefined): Resultado {
  // `undefined` es "todavía no eligió"; `null` es "eligió Todos".
  // Son estados distintos y solo el primero es un error.
  if (valor === undefined) {
    return { ok: false, error: "Elegí un grupo, o Todos si no te lo dijeron." };
  }
  return { ok: true };
}
