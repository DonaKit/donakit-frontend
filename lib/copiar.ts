/* ============================================================================
   US-09/ST-01 — Copiar al portapapeles con respaldo
   ----------------------------------------------------------------------------
   Camino principal: navigator.clipboard.writeText. Es asincrónico y no toca
   la selección del usuario, pero solo existe en contexto seguro (HTTPS o
   localhost) y algunos navegadores embebidos —el de Instagram, el de
   Facebook— lo bloquean.

   Respaldo: un <textarea> invisible, se selecciona su contenido y se ejecuta
   document.execCommand("copy"). Es una API obsoleta, pero sigue funcionando
   justo en los lugares donde la moderna falla, y por eso se mantiene acá.

   Devuelve true/false en vez de lanzar: el botón decide qué mostrar.
   ========================================================================== */

export async function copiarTexto(texto: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // Permiso denegado o navegador embebido: se intenta el respaldo.
    }
  }
  return copiarConRespaldo(texto);
}

function copiarConRespaldo(texto: string): boolean {
  if (typeof document === "undefined") return false;
  const area = document.createElement("textarea");
  area.value = texto;
  // Fuera de la vista pero en el documento: si estuviera oculto con
  // display:none, no se podría seleccionar.
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);

  // Guardar el foco para devolverlo: si no, quien navega con teclado pierde
  // su lugar después de copiar.
  const foco = document.activeElement as HTMLElement | null;
  area.select();
  area.setSelectionRange(0, texto.length); // iOS ignora select() a secas

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  foco?.focus();
  return ok;
}
