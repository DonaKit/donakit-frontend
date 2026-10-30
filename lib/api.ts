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
   real. Con las placas ya dibujadas, se suben con POST /campaigns/:id/assets
   para que queden guardadas con la campaña. Confirmar después es
   PATCH /campaigns/:id/confirm.

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

/* --------------------------------------------- US-03/ST-04 y US-04/ST-02 */

/** Formatos de placa tal como los nombra el backend (enum `asset_format`). */
export type FormatoAsset = "SQUARE_1_1" | "STORY_9_16";

export interface PlacaParaSubir {
  formato: FormatoAsset;
  imagen: Blob;
  ancho: number;
  alto: number;
}

export interface PlacaGuardada {
  id: string;
  formato: FormatoAsset;
  /** URL pública en Supabase Storage. La van a usar la landing y el panel. */
  url: string;
}

/** Blob a data URL (`data:image/png;base64,...`), que el backend acepta tal cual. */
function aDataUrl(b: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result as string);
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(b);
  });
}

/**
 * Sube las placas generadas en el navegador para que queden guardadas con la
 * campaña (POST /campaigns/:id/assets).
 *
 * Las placas se dibujan en el navegador porque ahí están las fuentes y el
 * canvas; el backend solo las guarda. El `editToken` prueba que quien sube es
 * quien creó la campaña: sin él, cualquiera que conozca el id podría
 * reemplazarle las imágenes.
 */
export async function subirPlacas(
  campania: CampaniaCreada,
  placas: PlacaParaSubir[],
): Promise<Respuesta<PlacaGuardada[]>> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

  try {
    const assets = await Promise.all(
      placas.map(async (p) => ({
        format: p.formato,
        imageBase64: await aDataUrl(p.imagen),
        width: p.ancho,
        height: p.alto,
      })),
    );

    const r = await fetch(`${BASE}/campaigns/${campania.id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editToken: campania.editToken, assets }),
      signal: corte.signal,
    });

    if (!r.ok) {
      return {
        ok: false,
        error: await mensajeDeError(r, "No encontramos la campaña para guardar las placas."),
      };
    }

    const sobre = await r.json();
    const lista: { id: string; format: FormatoAsset; imageUrl: string }[] =
      sobre.data ?? [];
    return {
      ok: true,
      datos: lista.map((a) => ({ id: a.id, formato: a.format, url: a.imageUrl })),
    };
  } catch (e) {
    const porTiempo = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: porTiempo
        ? "El servidor tardó demasiado en guardar las placas."
        : "No pudimos conectarnos para guardar las placas.",
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
 *
 * @param mensaje404 qué decir si el recurso no existe: depende del pedido.
 */
async function mensajeDeError(
  r: Response,
  mensaje404 = "No encontramos el centro de donación. Avisale al equipo.",
): Promise<string> {
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
  if (r.status === 403) {
    return "No tenés permiso para modificar esta campaña.";
  }
  if (r.status === 404) {
    return mensaje404;
  }
  if (r.status === 413) {
    // El cuerpo superó el límite del servidor. NestJS acepta 100 KB por
    // defecto y dos placas en Base64 pesan unos 450 KB.
    return "Las imágenes pesan más de lo que acepta el servidor. Avisale al equipo.";
  }
  if (r.status === 409) {
    return "Hubo un conflicto al guardar. Probá de nuevo en unos segundos.";
  }
  if (r.status >= 500) {
    return "El servidor tuvo un problema. Probá de nuevo en unos minutos.";
  }
  return "No pudimos guardar el pedido. Probá de nuevo.";
}
