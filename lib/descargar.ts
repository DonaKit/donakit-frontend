/* ============================================================================
   Descargar un archivo generado en el navegador
   ----------------------------------------------------------------------------
   Crea un enlace temporal con el atributo `download` y lo "toca". Se hace así,
   y no con un <a> fijo en la página, porque la descarga tiene que ir junto
   con otras acciones (registrar la descarga, mostrar el aviso) en el mismo
   clic.
   ========================================================================== */

export function descargarArchivo(datos: Blob, nombre: string) {
  const url = URL.createObjectURL(datos);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Darle tiempo al navegador a empezar la descarga antes de liberar el blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
