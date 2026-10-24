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
  | { ok: false; error: string; inmediato?: boolean };

/* `inmediato` distingue dos clases de error:

   - Sin la marca: el campo está INCOMPLETO. Vacío, o demasiado corto. No es
     culpa de nadie todavía — alguien tecleando "Juan" pasa por "J" y "Ju".
     Se muestra recién al salir del campo.

   - Con la marca: lo escrito está MAL. Un número en un nombre no se vuelve
     válido escribiendo más. Esperar al blur para avisarlo deja que la persona
     siga tecleando sobre algo que ya no sirve.
*/

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
    return { ok: false, error: "El nombre no lleva números.", inmediato: true };
  }
  if (v.length > NOMBRE_MAXIMO) {
    return {
      ok: false,
      error: `Máximo ${NOMBRE_MAXIMO} caracteres. Probá con el nombre y un apellido.`,
      inmediato: true,
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

/* ------------------------------------------------- Campos opcionales (US-02) */

/** Cantidad de donantes: una campaña real pide entre 2 y 20. */
export const DONANTES_MINIMO = 1;
export const DONANTES_MAXIMO = 99;

/** Observaciones: el texto va a la página pública, no a la placa. */
export const OBSERVACIONES_MAXIMO = 280;

/** Una campaña con fecha límite a más de un año no es una urgencia. */
export const DEADLINE_MESES_MAXIMO = 12;

export function validarInstitucion(valor: string): Resultado {
  if (valor === "") {
    return { ok: false, error: "Elegí dónde se dona." };
  }
  return { ok: true };
}

/* ============================================================================
   US-02/ST-02 — Validación de los campos opcionales
   ----------------------------------------------------------------------------
   Todos devuelven ok cuando están vacíos: no informar un dato opcional es una
   respuesta válida, no un error. Por eso ninguno lleva la marca `inmediato`
   para distinguir casos — si hay un valor y está mal, está mal desde el
   primer momento.
   ========================================================================== */

/**
 * Fecha límite.
 *
 * @param hoy fecha de referencia en formato AAAA-MM-DD. Se pasa como
 *   parámetro y no se calcula adentro para que la función sea predecible:
 *   con la misma entrada da siempre el mismo resultado, y se puede probar
 *   sin depender del día en que se corra la prueba.
 */
export function validarFecha(valor: string, hoy: string): Resultado {
  if (valor === "") return { ok: true };

  // Sin fecha de referencia todavía no se puede comparar. Pasa durante el
  // primer instante de vida de la página, antes de que se calcule el día.
  if (hoy === "") return { ok: true };

  // Las fechas en formato AAAA-MM-DD se comparan como texto sin ambigüedad:
  // los dígitos están ordenados de mayor a menor unidad.
  if (valor < hoy) {
    return {
      ok: false,
      error: "Esa fecha ya pasó.",
      inmediato: true,
    };
  }

  const limite = new Date(hoy);
  limite.setMonth(limite.getMonth() + DEADLINE_MESES_MAXIMO);
  if (valor > limite.toISOString().slice(0, 10)) {
    return {
      ok: false,
      error: `Como máximo ${DEADLINE_MESES_MAXIMO} meses: más que eso no se lee como urgente.`,
      inmediato: true,
    };
  }

  return { ok: true };
}

/** Cantidad de donantes. El campo ya filtra a dos dígitos, así que el tope lo
 *  cubre la interfaz; lo que hay que atajar acá es el cero. */
export function validarDonantes(valor: string): Resultado {
  if (valor === "") return { ok: true };

  const n = Number(valor);

  if (n < DONANTES_MINIMO) {
    return {
      ok: false,
      error: "Tiene que ser al menos 1.",
      inmediato: true,
    };
  }
  if (n > 30) {
    // No bloquea. Una placa que pide 80 donantes se lee como exageración y
    // pierde credibilidad, pero puede ser un pedido real de una colecta.
    return {
      ok: true,
      aviso: "Son muchos: un número más chico suele movilizar mejor.",
    };
  }
  return { ok: true };
}

/** Observaciones. Un texto de solo espacios equivale a no haber escrito nada. */
export function validarObservaciones(valor: string): Resultado {
  if (valor.trim() === "") return { ok: true };

  if (valor.trim().length < 10) {
    return {
      ok: true,
      aviso: "Muy corto: si no agrega nada útil, mejor dejarlo vacío.",
    };
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
