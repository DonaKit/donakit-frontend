/* ============================================================================
   Dirección pública de la app
   ----------------------------------------------------------------------------
   El QR de las placas y el enlace del texto para compartir tienen que llevar
   a la landing del caso (/c/[slug]) en un servidor que exista.

   Antes el QR apuntaba a "donakit.app", un dominio que no es nuestro: escanear
   una placa no llevaba a ningún lado. Ahora la dirección sale de:

   1. NEXT_PUBLIC_SITE_URL, si está configurada en Vercel (el dominio final);
   2. si no, la dirección desde la que se está usando la app. En el preview de
      Vercel eso es la URL del preview, y el QR funciona tal cual.
   ========================================================================== */

export function origenDelSitio(): string {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurado) return configurado.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Dirección completa de la landing de una campaña. */
export function urlCampania(slug: string): string {
  return `${origenDelSitio()}/c/${slug}`;
}

/**
 * Nombre corto del sitio para mostrar impreso (placas). Si el dominio es largo
 * —como los de preview de Vercel— se usa la marca: nadie va a tipear eso, y
 * para eso está el QR.
 */
export function dominioVisible(): string {
  try {
    const host = new URL(origenDelSitio()).host.replace(/^www\./, "");
    return host.length <= 22 ? host : "DonaKit";
  } catch {
    return "DonaKit";
  }
}
