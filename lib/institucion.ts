/* ============================================================================
   Institución del MVP
   ----------------------------------------------------------------------------
   DonaKit se vende a una institución por vez. En esta versión el sistema opera
   para una sola, así que el centro de salud no se elige: está fijo.

   Esto NO significa que la tabla `institution` sobre. La base sigue teniendo
   una fila por institución, y las historias de la landing (dirección y
   horarios, contacto, requisitos propios) leen de ahí. Lo único que
   desaparece es que el difusor tenga que elegirla.

   --------------------------------------------------------------------------
   LOS VALORES DE ACÁ TIENEN QUE COINCIDIR CON LA FILA DE LA BASE.

   El `id` es el que viaja al backend; el nombre y la ciudad son los que ve la
   persona antes de enviar. Si se desincronizan, la pantalla dice una cosa y la
   campaña se guarda con otra.

   Para verificarlo: https://donakit-backend.onrender.com/institutions
   --------------------------------------------------------------------------

   PENDIENTE: el equipo definió que el MVP va con Hospital Posadas, pero esa
   fila todavía no está cargada en la base. Mientras tanto apuntamos a
   Garrahan, que es la única institución existente, para poder probar el
   circuito completo. Cuando exista Posadas se cambian estos cuatro valores y
   nada más.
   ========================================================================== */

export const INSTITUCION = {
  /** UUID de la fila en la tabla `institution`. */
  id: "63a65bfe-3c92-484e-b658-d3446355e5c2",

  nombre: "Hospital Garrahan",
  ciudad: "CABA",

  /** El servicio donde se dona, no el hospital entero. */
  servicio: "Servicio de Hemoterapia",

  /** Nombre corto del servicio, para la placa: "Hospital Garrahan - Hemoterapia". */
  servicioCorto: "Hemoterapia",

  /** Tal cual figura en la base (campo `address`). */
  direccion: "Combate de los Pozos 1881",

  /* PENDIENTE: el horario existe en la tabla (`business_hours`) pero
     GET /institutions todavía no lo devuelve. Mientras sea null, la placa
     omite esa fila: un horario inventado en una placa pública manda gente a
     un hospital cerrado. */
  horario: null as string | null,

  /* PROVISORIO: requisitos generales para donar en Argentina. Cada hospital
     puede sumar los suyos; cuando la base los tenga, se leen de ahí. */
  requisitos: [
    "Llevar DNI",
    "16 a 65 años",
    "Más de 50 kg",
    "No ir en ayunas",
  ],
} as const;
