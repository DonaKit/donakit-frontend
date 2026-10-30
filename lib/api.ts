import { INSTITUCION } from "./institucion";
import type { ValorGrupo } from "./grupos-sanguineos";

/* ============================================================================
   US-01/ST-06 — Servicio para hablar con el backend
   ----------------------------------------------------------------------------
   Un único lugar donde el frontend sabe que existe una API. Los componentes
   llaman a estas funciones y no conocen rutas, cabeceras ni códigos HTTP.

   FLUJO (documentado por el backend, 29/10):
   la campaña se crea al pedir la previsualización, no al confirmar. Nace en
   DRAFT, el backend devuelve el slug, y con ese slug el frontend arma el QR
   real. Confirmar después es PATCH /campaigns/:id/confirm.

   Sin eso, el QR de la previsualización tendría que ser falso: el slug lo
   genera el backend y antes de guardar no existe.
   ========================================================================== */

/* Dirección del backend. SIN /api al final: el servidor responde en la raíz.

   El valor por defecto no es una concesión: las variables NEXT_PUBLIC_ se
   empaquetan dentro del código que llega al navegador, así que esta dirección
   es pública de todas formas. Tenerla acá hace que el proyecto funcione recién
   clonado, sin configurar nada.

   Si algún día se configura NEXT_PUBLIC_API_URL en Vercel, esa gana. */
const BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://donakit-backend.onrender.com";

/* El backend vive en el plan gratuito de Render, que duerme el servicio tras
   un rato sin uso. El primer pedido después de la siesta puede tardar bastante
   porque la instancia tiene que levantarse. Por eso la espera es generosa:
   cortar a los 15 segundos haría fallar justo la primera carga, que es la que
   todos ven en una demo. */
const ESPERA_MAXIMA_MS = 40_000;

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
 * El formulario trabaja con los nombres de la pantalla; el backend espera los
 * suyos. La traducción vive acá y en ningún otro lado.
 *
 * El backend acepta camelCase y snake_case, pero su documentación usa
 * camelCase, así que mandamos eso: si algún día sacan el middleware de
 * compatibilidad, lo que queda en pie es la forma documentada.
 */
function aCuerpoDePeticion(d: DatosPedido) {
  return {
    institutionId: INSTITUCION.id,
    patientName: d.nombre.trim(),

    // El backend exige bloodType siempre, y tiene un valor para "cualquiera".
    // En la pantalla eso es "Todos", que internamente guardamos como null.
    bloodType: d.grupo ?? "TODOS",

    // Los opcionales viajan como null cuando no se informaron. Mandar null es
    // más explícito que omitir la clave: deja claro que se preguntó.
    deadline: d.fecha || null,
    targetDonors: d.donantes === "" ? null : Number(d.donantes),
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
  // Sin esto, una conexión que no responde deja el botón girando para
  // siempre. Pasa seguido con datos móviles dentro de un hospital.
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

  try {
    const r = await fetch(`${BASE}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aCuerpoDePeticion(d)),
      signal: corte.signal,
    });

    if (!r.ok) return { ok: false, error: await mensajeDeError(r) };

    // El backend envuelve todo en { success, message, data }.
    const sobre = await r.json();
    const c = sobre.data;

    return {
      ok: true,
      datos: { id: c.id, slug: c.slug, editToken: c.editToken },
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
 * El backend devuelve mensajes por campo, en castellano y ya redactados para
 * una persona. Cuando están, se usan: dicen qué dato arreglar, que es mucho
 * más útil que un "revisá los datos" genérico.
 */
async function mensajeDeError(r: Response): Promise<string> {
  let cuerpo: { errors?: Record<string, string[]> } | null = null;
  try {
    cuerpo = await r.json();
  } catch {
    // Una respuesta de error sin JSON legible: seguimos con los genéricos.
  }

  if (cuerpo?.errors) {
    const primero = Object.values(cuerpo.errors).flat()[0];
    if (typeof primero === "string" && primero !== "") return primero;
  }

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
