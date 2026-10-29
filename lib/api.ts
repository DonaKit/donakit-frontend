import { INSTITUCION } from "./institucion";
import type { ValorGrupo } from "./grupos-sanguineos";

/* ============================================================================
   US-01/ST-06 — Servicio para hablar con el backend
   ----------------------------------------------------------------------------
   Un único lugar donde el frontend sabe que existe una API. Los componentes
   llaman a estas funciones y no conocen rutas, cabeceras ni códigos HTTP.

   FLUJO ACORDADO (28/10, con Adán):
   la campaña se crea al pedir la previsualización, no al confirmar. El backend
   devuelve el slug, y con ese slug el frontend arma el QR real. Confirmar
   después solo cambia el estado de DRAFT a ACTIVE.

   Sin eso, el QR de la previsualización tendría que ser falso: el slug lo
   genera el backend y antes de guardar no existe.
   ========================================================================== */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Más de esto y damos la conexión por perdida. */
const ESPERA_MAXIMA_MS = 15_000;

/* ----------------------------------------------------------------- Tipos */

export interface DatosPedido {
  nombre: string;
  grupo: ValorGrupo;
  fecha: string;
  donantes: string;
  observaciones: string;
}

export interface CampaniaCreada {
  id: string;
  slug: string;
  editToken: string;
}

/**
 * Las funciones no lanzan excepciones: devuelven un resultado que el
 * componente puede dibujar. Es el mismo criterio que usa la validación del
 * formulario, así no hay dos formas distintas de manejar lo que sale mal.
 */
export type Respuesta<T> =
  | { ok: true; datos: T }
  | { ok: false; error: string };

/* ------------------------------------------------------------- Traducción */

/**
 * El formulario trabaja con los nombres que usa la pantalla; el backend espera
 * los suyos. La traducción vive acá y en ningún otro lado: si el DTO cambia un
 * nombre, se toca esta función y nada más.
 *
 * PENDIENTE: confirmar con Adán los nombres exactos de `CreateCampaignDto`
 * (US-01/ST-04). Están puestos como los de la tabla `campaign`, que es la
 * apuesta más probable, pero no está verificado.
 */
function aCuerpoDePeticion(d: DatosPedido) {
  return {
    institution_id: INSTITUCION.id,
    patient_name: d.nombre.trim(),

    // null, no ausente: el pedido acepta cualquier grupo.
    blood_type: d.grupo,

    // Los opcionales viajan como null cuando no se informaron. Mandar null
    // es más explícito que omitir la clave: deja claro que se preguntó.
    deadline: d.fecha || null,
    target_donors: d.donantes === "" ? null : Number(d.donantes),
    observations: d.observaciones.trim() || null,
  };
}

/* -------------------------------------------------------------- Peticiones */

/**
 * Crea la campaña en estado DRAFT y devuelve el slug para armar el QR.
 */
export async function crearCampania(
  d: DatosPedido,
): Promise<Respuesta<CampaniaCreada>> {
  if (BASE === "") {
    return {
      ok: false,
      error:
        "Falta configurar la dirección del servidor (NEXT_PUBLIC_API_URL).",
    };
  }

  // Sin esto, una conexión que no responde deja el botón girando para
  // siempre. Pasa seguido con datos móviles dentro de un hospital.
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

  try {
    const r = await fetch(`${BASE}/api/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aCuerpoDePeticion(d)),
      signal: corte.signal,
    });

    if (!r.ok) return { ok: false, error: await mensajeDeError(r) };

    const j = await r.json();
    return {
      ok: true,
      datos: {
        id: j.id,
        slug: j.slug,
        editToken: j.edit_token ?? j.editToken,
      },
    };
  } catch (e) {
    // AbortError es nuestro propio reloj; cualquier otra cosa es que el
    // navegador no pudo siquiera establecer la conexión.
    const porTiempo = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: porTiempo
        ? "El servidor tardó demasiado. Revisá tu conexión y probá de nuevo."
        : "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.",
    };
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Traduce un error del servidor a algo que una persona pueda leer.
 *
 * Nunca se muestra el texto crudo del backend: puede venir en inglés, puede
 * nombrar columnas de la base, y puede filtrar detalles de implementación.
 */
async function mensajeDeError(r: Response): Promise<string> {
  if (r.status === 400 || r.status === 422) {
    return "Alguno de los datos no es válido. Revisalos y probá de nuevo.";
  }
  if (r.status === 404) {
    return "No encontramos el centro de donación. Avisale al equipo.";
  }
  if (r.status === 409) {
    return "Hubo un conflicto al guardar. Probá de nuevo en unos segundos.";
  }
  if (r.status >= 500) {
    return "El servidor tuvo un problema. Probá de nuevo en unos minutos.";
  }
  return "No pudimos guardar el pedido. Probá de nuevo.";
}
