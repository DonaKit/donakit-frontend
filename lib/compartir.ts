/* ============================================================================
   Compartir una placa con el menú nativo del celular (Web Share API)
   ----------------------------------------------------------------------------
   navigator.share abre el mismo menú que aparece al compartir una foto de la
   galería: la persona toca WhatsApp y elige el grupo, o toca Instagram y la
   placa se abre en el editor de historias. Va la imagen y el texto (que ya
   trae el enlace a la página del caso) en un solo paso.

   Cuándo se puede: casi todos los celulares (Chrome en Android, Safari en
   iPhone) comparten archivos; muchas computadoras no. Por eso se pregunta
   antes con navigator.canShare, y si no se puede, el botón ni se muestra:
   en la compu quedan "Descargar" y "Copiar texto", que ya existían.

   Dos detalles que hacen que funcione en iPhone:
   - navigator.share se llama directo desde el clic, sin un `await` antes.
     Safari solo deja abrir el menú si la llamada sale del gesto de la
     persona; si antes se espera otra cosa, lo rechaza.
   - No se manda `url` aparte del texto: varias apps (WhatsApp entre ellas)
     se quedan con el enlace y descartan el texto. El enlace ya va adentro
     del texto.
   ========================================================================== */

export type ResultadoCompartir = "compartido" | "cancelado" | "no-soportado" | "error";

/** Si este navegador puede compartir una imagen con el menú nativo. */
export function puedeCompartirArchivos(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  try {
    const prueba = new File([new Uint8Array(1)], "prueba.png", { type: "image/png" });
    return navigator.canShare({ files: [prueba] });
  } catch {
    return false;
  }
}

export async function compartirPlaca(
  imagen: Blob,
  nombreArchivo: string,
  texto: string,
): Promise<ResultadoCompartir> {
  const archivo = new File([imagen], nombreArchivo, { type: "image/png" });
  const datos: ShareData = { files: [archivo], text: texto };
  if (typeof navigator.canShare !== "function" || !navigator.canShare(datos)) {
    return "no-soportado";
  }
  try {
    await navigator.share(datos);
    return "compartido";
  } catch (e) {
    // Cerrar el menú sin elegir una app no es un error: no se avisa nada.
    if (e instanceof DOMException && e.name === "AbortError") return "cancelado";
    return "error";
  }
}
