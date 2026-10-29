/* ============================================================================
   Institución del MVP
   ----------------------------------------------------------------------------
   DonaKit se vende a una institución por vez. En esta versión el sistema
   opera para una sola, así que el centro de salud no se elige: está fijo.

   Esto NO significa que la tabla `institution` sobre. La base sigue teniendo
   una fila por institución, y las historias de la landing (US-16 dirección y
   horarios, US-17 contacto, US-20 requisitos propios) leen de ahí. Lo único
   que desaparece es que el difusor tenga que elegirla.

   Para vender el sistema a otra institución se cambia este archivo y se carga
   su fila en la base. Nada más.

   PENDIENTE: reemplazar `id` por el UUID real de Hospital Posadas en la tabla
   `institution` de Supabase. Sin ese valor el backend va a rechazar el pedido,
   porque `campaign.institution_id` es una clave foránea.
   ========================================================================== */

export const INSTITUCION = {
  /** UUID de la fila en la tabla `institution`. */
  id: "PENDIENTE-UUID-DE-SUPABASE",

  nombre: "Hospital Posadas",
  ciudad: "El Palomar",

  /** El servicio donde se dona, no el hospital entero. */
  servicio: "Servicio de Hemoterapia",
} as const;
