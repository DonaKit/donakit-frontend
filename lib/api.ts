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
  /** Texto para compartir generado por el backend (US-06). Hoy llega null. */
  textoGenerado: string | null;
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
      datos: {
        id: c.id,
        slug: c.slug,
        editToken: c.editToken,
        textoGenerado: c.generatedCopy ?? null,
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

/* --------------------------------------------- US-03/ST-04 y US-04/ST-02 */

/** Formatos de placa tal como los nombra el backend (enum `asset_format`). */
export type FormatoAsset = "SQUARE_1_1" | "STORY_9_16";

export interface PlacaParaSubir {
  formato: FormatoAsset;
  /** Sin imagen, el backend reutiliza la que ya tiene guardada para ese formato. */
  imagen?: Blob;
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
 * POST /campaigns/:id/assets.
 *
 * OJO: en el backend actual este endpoint hace TRES cosas a la vez:
 *   1. guarda las placas en Supabase Storage y en `campaign_asset`;
 *   2. confirma la campaña (DRAFT -> ACTIVE);
 *   3. registra una descarga por placa en `download_log`, salvo que se mande
 *      `recordDownload: false`.
 *
 * Por eso NO se llama apenas se generan las placas: confirmaría campañas que
 * la persona todavía está revisando y anotaría descargas que no ocurrieron.
 * Se llama cuando la persona se lleva el kit (descarga, ZIP o copia el texto):
 * primero `guardarPlacas` con las dos imágenes y sin registrar descarga, y
 * después `registrarDescarga` solo con lo que realmente se descargó.
 *
 * El `editToken` prueba que quien sube es quien creó la campaña: sin él,
 * cualquiera que conozca el id podría reemplazarle las imágenes.
 */
async function enviarPlacas(
  campania: CampaniaCreada,
  placas: PlacaParaSubir[],
  extra: { recordDownload: boolean; generatedCopy?: string; downloadType?: "ZIP_BUNDLE" },
): Promise<Respuesta<PlacaGuardada[]>> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

  try {
    const assets = await Promise.all(
      placas.map(async (p) => ({
        format: p.formato,
        ...(p.imagen ? { imageBase64: await aDataUrl(p.imagen) } : {}),
        width: p.ancho,
        height: p.alto,
      })),
    );

    const r = await fetch(`${BASE}/campaigns/${campania.id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editToken: campania.editToken, assets, ...extra }),
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
 * Guarda las dos placas y confirma la campaña, sin registrar descargas.
 *
 * US-06/ST-02: manda también el texto para compartir (`generatedCopy`), así
 * queda guardado con la campaña y no solo en la pantalla de quien lo armó.
 */
export function guardarPlacas(
  campania: CampaniaCreada,
  placas: PlacaParaSubir[],
  texto?: string,
): Promise<Respuesta<PlacaGuardada[]>> {
  return enviarPlacas(campania, placas, { recordDownload: false, generatedCopy: texto });
}

/**
 * Registra en `download_log` la descarga de los formatos indicados. Va sin
 * imagen: el backend usa la que ya guardó `guardarPlacas`.
 *
 * US-08/ST-03: el ZIP se registra como UNA descarga de tipo ZIP_BUNDLE, no
 * como dos descargas sueltas: para las métricas, bajar el kit completo es un
 * evento distinto de bajar una placa.
 */
export function registrarDescarga(
  campania: CampaniaCreada,
  formatos: FormatoAsset[],
  opciones: { zip?: boolean } = {},
): Promise<Respuesta<PlacaGuardada[]>> {
  const medidas: Record<FormatoAsset, [number, number]> = {
    SQUARE_1_1: [1080, 1080],
    STORY_9_16: [1080, 1920],
  };
  return enviarPlacas(
    campania,
    formatos.map((f) => ({ formato: f, ancho: medidas[f][0], alto: medidas[f][1] })),
    { recordDownload: true, ...(opciones.zip ? { downloadType: "ZIP_BUNDLE" as const } : {}) },
  );
}

/* ------------------------------------------------- US-10 — Corregir datos */

/**
 * ¿Se puede corregir con PATCH, o hace falta una campaña nueva?
 *
 * El PATCH del backend hoy NO permite borrar un dato opcional: si se manda
 * vacío o null, lo ignora y la base se queda con el valor viejo. Entonces, si
 * la corrección consiste en QUITAR la fecha, la cantidad o las observaciones,
 * el PATCH dejaría la landing mostrando un dato que la persona sacó. En ese
 * caso se crea una campaña nueva, como antes.
 * PENDIENTE (backend): aceptar null en UpdateCampaignDto para limpiar campos.
 */
export function corregibleConPatch(anterior: DatosPedido, nuevo: DatosPedido): boolean {
  const quitado = (a: string, b: string) => a.trim() !== "" && b.trim() === "";
  return !(
    quitado(anterior.fecha, nuevo.fecha) ||
    quitado(anterior.donantes, nuevo.donantes) ||
    quitado(anterior.observaciones, nuevo.observaciones)
  );
}

/** Si el nombre cambia, el backend genera un slug nuevo: el enlace cambia. */
export function cambiaElEnlace(anterior: DatosPedido, nuevo: DatosPedido): boolean {
  return anterior.nombre.trim() !== nuevo.nombre.trim();
}

/**
 * PATCH /campaigns/:id — corrige la misma campaña (US-10/ST-03 y ST-04).
 * Devuelve la campaña con el slug actualizado (cambia si cambió el nombre).
 */
export async function actualizarCampania(
  campania: CampaniaCreada,
  d: DatosPedido,
): Promise<Respuesta<CampaniaCreada>> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);
  try {
    const r = await fetch(`${BASE}/campaigns/${campania.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // El texto para compartir no va acá: si cambia el nombre, cambia el
      // slug y con él el enlace del texto. Se manda después, junto con las
      // placas, cuando ya se conoce el enlace definitivo.
      body: JSON.stringify({ editToken: campania.editToken, ...aCuerpoDePeticion(d) }),
      signal: corte.signal,
    });
    if (!r.ok) {
      return { ok: false, error: await mensajeDeError(r, "No encontramos la campaña para corregirla.") };
    }
    const c = (await r.json()).data;
    return {
      ok: true,
      datos: {
        id: c.id ?? campania.id,
        slug: c.slug ?? campania.slug,
        editToken: c.editToken ?? campania.editToken,
        // El texto guardado es el de ANTES de corregir (nombre y enlace
        // viejos). El backend no lo genera, solo guarda el que le manda el
        // frontend, así que se arma de nuevo con los datos corregidos.
        textoGenerado: null,
      },
    };
  } catch (e) {
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

/* ------------------------------------------------ US-12/US-13 — Landing */

export type EstadoCampania = "DRAFT" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";

/** Lo que devuelve GET /campaigns/:idOrSlug (sin editToken ni slug). */
export interface CampaniaPublica {
  id: string;
  institucionId: string;
  nombre: string;
  grupo: string;
  tipoDonacion: string | null;
  donantesObjetivo: number | null;
  donantesActuales: number;
  /** AAAA-MM-DD o null. */
  fecha: string | null;
  observaciones: string | null;
  estado: EstadoCampania;
  textoGenerado: string | null;
  institucion: InstitucionPublica | null;
  placas: { formato: FormatoAsset; url: string }[];
  /** Requisitos de la institución (tabla `requirement`). Vacío si no hay. */
  requisitos: Requisito[];
  /** Preguntas frecuentes (tabla `faq_item`). Vacío si no hay. */
  preguntas: PreguntaBackend[];
}

/** Datos de la institución que devuelve la landing (US-16/ST-02, US-17/ST-02). */
export interface InstitucionPublica {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  web: string | null;
  urlRequisitos: string | null;
  /** Texto ya armado a partir de `business_hours` (JSON libre en la base). */
  horario: string | null;
  requisitosPropios: string | null;
}

export interface Requisito {
  id: string;
  titulo: string;
  descripcion: string;
  /** `is_immediate_disqualification`: si no se cumple, no se puede donar. */
  excluyente: boolean;
  categoria: string;
}

export interface PreguntaBackend {
  id: string;
  pregunta: string;
  respuesta: string;
  categoria: string;
}

/**
 * `business_hours` es JSON libre. Hoy tiene la forma
 * { "dias": "Lunes a Viernes", "horario": "07:00 a 18:00", "sabados": "..." },
 * pero nada lo garantiza: se arma el texto con lo que haya y, si la forma es
 * otra, no se muestra horario antes que mostrar algo roto.
 */
function horarioLegible(h: unknown): string | null {
  if (!h || typeof h !== "object") return typeof h === "string" && h.trim() ? h.trim() : null;
  const o = h as Record<string, unknown>;
  const partes: string[] = [];
  if (typeof o.dias === "string" && typeof o.horario === "string") {
    partes.push(`${o.dias}, ${o.horario}`);
  } else if (typeof o.horario === "string") {
    partes.push(o.horario);
  }
  if (typeof o.sabados === "string" && o.sabados.trim()) partes.push(`Sábados, ${o.sabados}`);
  return partes.length ? partes.join(" · ") : null;
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * Datos públicos de una campaña para la landing. Devuelve `null` en `datos`
 * si el pedido no existe (404), para que la página muestre "no encontrado" en
 * vez de un error genérico.
 */
export async function obtenerCampania(
  slug: string,
): Promise<Respuesta<CampaniaPublica | null>> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);
  try {
    const r = await fetch(`${BASE}/campaigns/${encodeURIComponent(slug)}`, {
      signal: corte.signal,
    });
    if (r.status === 404) return { ok: true, datos: null };
    if (!r.ok) return { ok: false, error: await mensajeDeError(r) };

    const c = (await r.json()).data;
    return {
      ok: true,
      datos: {
        id: c.id,
        institucionId: c.institutionId,
        nombre: c.patientName,
        // El backend acepta "O+" además de "0+": se muestra siempre con cero.
        grupo: String(c.bloodType).replace(/^O/, "0"),
        tipoDonacion: c.donationType ?? null,
        donantesObjetivo: c.targetDonors ?? null,
        donantesActuales: c.currentDonors ?? 0,
        fecha: c.deadline ? String(c.deadline).slice(0, 10) : null,
        observaciones: c.observations ?? null,
        estado: c.status,
        textoGenerado: texto(c.generatedCopy),
        institucion: c.institution
          ? {
              nombre: c.institution.name,
              direccion: c.institution.address,
              ciudad: c.institution.city,
              telefono: texto(c.institution.phone),
              whatsapp: texto(c.institution.whatsapp),
              email: texto(c.institution.email),
              web: texto(c.institution.websiteUrl),
              urlRequisitos: texto(c.institution.requirementsUrl),
              horario: horarioLegible(c.institution.businessHours),
              requisitosPropios: texto(c.institution.specificRequirements),
            }
          : null,
        placas: (c.assets ?? []).map((a: { format: FormatoAsset; imageUrl: string }) => ({
          formato: a.format,
          url: a.imageUrl,
        })),
        requisitos: (c.requirements ?? []).map(
          (q: { id: string; title: string; description: string; isImmediateDisqualification: boolean; category: string }) => ({
            id: q.id,
            titulo: q.title,
            descripcion: q.description,
            excluyente: Boolean(q.isImmediateDisqualification),
            categoria: q.category,
          }),
        ),
        preguntas: (c.faqs ?? []).map(
          (f: { id: string; question: string; answer: string; category: string }) => ({
            id: f.id,
            pregunta: f.question,
            respuesta: f.answer,
            categoria: f.category,
          }),
        ),
      },
    };
  } catch (e) {
    const porTiempo = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: porTiempo
        ? "El servidor tardó demasiado en responder. Probá recargar en un rato."
        : "No pudimos conectarnos. Revisá tu conexión y recargá la página.",
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

/* ------------------------------------------------------------- US-19 / US-20 */

export interface CampaniaDashboard {
  id: string;
  slug: string;
  patientName: string;
  bloodType: string;
  donationType: string | null;
  status: EstadoCampania;
  createdAt: string;
  deadline: string | null;
  targetDonors: number | null;
  currentDonors: number;
  progressPercentage: number | null;
  totalVisits: number;
  institution?: {
    id: string;
    name: string;
    city: string;
  } | null;
}

export interface FiltrosDashboard {
  status?: string;
  institutionId?: string;
}

/**
 * GET /campaigns?status=...&institutionId=...
 * Obtiene el listado de campañas con sus métricas acumuladas (visitas, donantes, avance).
 */
export async function obtenerCampaniasDashboard(
  filtros?: FiltrosDashboard,
): Promise<Respuesta<{ campanias: CampaniaDashboard[]; total: number }>> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

  try {
    const params = new URLSearchParams();
    if (filtros?.status) params.set("status", filtros.status);
    if (filtros?.institutionId) params.set("institutionId", filtros.institutionId);

    const query = params.toString() ? `?${params.toString()}` : "";
    const r = await fetch(`${BASE}/campaigns${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: corte.signal,
    });

    if (!r.ok) return { ok: false, error: await mensajeDeError(r) };

    const sobre = await r.json();
    const data: CampaniaDashboard[] = (sobre.data ?? []).map(
      (c: {
        id: string;
        slug: string;
        patientName: string;
        bloodType: string;
        donationType?: string | null;
        status: EstadoCampania;
        createdAt: string;
        deadline?: string | null;
        targetDonors?: number | null;
        currentDonors?: number | null;
        progressPercentage?: number | null;
        totalVisits?: number;
        institution?: { id: string; name: string; city: string } | null;
      }) => ({
        id: c.id,
        slug: c.slug,
        patientName: c.patientName,
        bloodType: String(c.bloodType ?? "").replace(/^O/, "0"),
        donationType: c.donationType ?? null,
        status: c.status,
        createdAt: c.createdAt,
        deadline: c.deadline ?? null,
        targetDonors: c.targetDonors ?? null,
        currentDonors: c.currentDonors ?? 0,
        progressPercentage: c.progressPercentage ?? null,
        totalVisits: c.totalVisits ?? 0,
        institution: c.institution
          ? {
              id: c.institution.id,
              name: c.institution.name,
              city: c.institution.city,
            }
          : null,
      }),
    );

    return {
      ok: true,
      datos: {
        campanias: data,
        total: sobre.total ?? data.length,
      },
    };
  } catch (e) {
    const porTiempo = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: porTiempo
        ? "El servidor tardó demasiado en responder el panel de campañas."
        : "No pudimos conectar con el servidor para cargar las campañas.",
    };
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * PATCH /institutions/:institutionId/campaigns/:campaignId
 * Permite modificar o sumar donantes y actualizar el estado de una campaña desde el panel.
 */
export async function actualizarCampaniaAdmin(
  institutionId: string,
  campaignId: string,
  cambios: {
    currentDonors?: number;
    incrementDonors?: number;
    status?: EstadoCampania;
    observations?: string;
  },
): Promise<Respuesta<CampaniaDashboard>> {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA_MAXIMA_MS);

  try {
    const r = await fetch(
      `${BASE}/institutions/${encodeURIComponent(institutionId)}/campaigns/${encodeURIComponent(campaignId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cambios),
        signal: corte.signal,
      },
    );

    if (!r.ok) return { ok: false, error: await mensajeDeError(r) };

    const sobre = await r.json();
    const c = sobre.data;
    return {
      ok: true,
      datos: {
        id: c.id,
        slug: c.slug,
        patientName: c.patientName,
        bloodType: String(c.bloodType ?? "").replace(/^O/, "0"),
        donationType: c.donationType ?? null,
        status: c.status,
        createdAt: c.createdAt,
        deadline: c.deadline ?? null,
        targetDonors: c.targetDonors ?? null,
        currentDonors: c.currentDonors ?? 0,
        progressPercentage: c.progressPercentage ?? null,
        totalVisits: c.totalVisits ?? 0,
        institution: c.institution
          ? {
              id: c.institution.id,
              name: c.institution.name,
              city: c.institution.city,
            }
          : null,
      },
    };
  } catch (e) {
    const porTiempo = e instanceof DOMException && e.name === "AbortError";
    return {
      ok: false,
      error: porTiempo
        ? "El servidor tardó demasiado en actualizar la campaña."
        : "No pudimos conectar con el servidor para guardar los cambios.",
    };
  } finally {
    clearTimeout(reloj);
  }
}
