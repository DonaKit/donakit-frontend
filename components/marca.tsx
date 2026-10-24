/* ============================================================================
   Logotipo de DonaKit
   ----------------------------------------------------------------------------
   Es texto, no una imagen. Tres razones:

   - Escala sin perder nitidez en cualquier pantalla.
   - No agrega un pedido de red: la página se abre desde el navegador de
     WhatsApp, muchas veces con datos móviles.
   - Lo lee un lector de pantalla como "DonaKit", que es exactamente lo que
     tiene que leer. Una imagen necesitaría texto alternativo que alguien
     tarde o temprano se olvida de poner.

   El tratamiento es el mismo de las placas: "Dona" en el azul institucional y
   "Kit" en el rojo. Si algún día entra el logotipo como archivo, se cambia
   acá adentro y queda cambiado en toda la aplicación.

   Contraste sobre blanco: 14,63:1 el azul y 7,55:1 el rojo. Los dos superan
   WCAG AA con margen.
   ========================================================================== */

export function Marca({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-xl font-bold tracking-tight text-ink-800 ${className}`}
    >
      Dona<span className="text-red-700">Kit</span>
    </span>
  );
}

/**
 * Encabezado de las pantallas donde la persona arma su kit.
 *
 * La landing pública no lo usa: tiene su propio encabezado azul con los datos
 * del caso, porque ahí el protagonista es el paciente y no la marca.
 */
export function Encabezado() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-center px-4">
        <Marca />
      </div>
    </header>
  );
}
