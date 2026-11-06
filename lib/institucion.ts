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
   circuito completo.

   --------------------------------------------------------------------------
   DATOS DE CONTACTO Y ATENCIÓN (provisorios, del lado del frontend)

   La tabla `institution` tiene teléfono, WhatsApp, email, horarios y requisitos
   propios, pero el endpoint público todavía no los devuelve (US-16/ST-02 y
   US-17/ST-02 son del backend). Hasta entonces la landing usa estos valores,
   sacados de la web oficial del Banco de Sangre del Garrahan (consultada el
   06/11/2026):
     https://www.garrahan.gov.ar/home-hemoterapia
     https://garrahan.gov.ar/banco-de-sangre/turno-banco-de-sangre/hemoterapia-1/donar-sangre-1

   Cuando el backend los exponga, se leen de la respuesta y esto se borra.
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

  /** Tal cual figura en la base (campo `address`): la entrada principal. */
  direccion: "Combate de los Pozos 1881",

  /* La entrada de DONANTES no es la principal. La web del banco de sangre
     dice: "La entrada es por 15 de Noviembre de 1889 N° 2151". Es la que va
     en placas y landing, porque es adonde tiene que ir la persona que dona.
     PENDIENTE: que la base la guarde (hoy `address` tiene la principal). */
  entradaDonantes: "15 de Noviembre de 1889 2151",
  barrio: "Parque Patricios",

  /* La web no publica un horario fijo: se dona con turno, y el turno se
     reserva eligiendo día y hora en su calendario. Decir eso es más útil, y
     más cierto, que inventar una franja horaria. */
  horario: "Con turno previo" as string | null,
  urlTurno:
    "https://garrahan.gov.ar/banco-de-sangre/turno-banco-de-sangre/hemoterapia-1/donar-sangre-1",

  /** Teléfono del Banco de Sangre ("Teléfono: 4122-6007" en la web). */
  telefono: { visible: "4122-6007", enlace: "tel:+541141226007" },

  /** Conmutador general del hospital: contacto secundario. */
  telefonoGeneral: { visible: "(011) 4122-6000", enlace: "tel:+541141226000" },

  web: "https://www.garrahan.gov.ar/home-hemoterapia",

  /* PROVISORIO: requisitos generales para donar en Argentina. Cada hospital
     puede sumar los suyos; cuando la base los tenga, se leen de ahí. */
  requisitos: ["Llevar DNI", "16 a 65 años", "Más de 50 kg", "No ir en ayunas"],
} as const;

/** Portal oficial del Ministerio de Salud sobre donación de sangre (US-14/ST-04). */
export const URL_MINISTERIO = "https://www.argentina.gob.ar/node/249584";
