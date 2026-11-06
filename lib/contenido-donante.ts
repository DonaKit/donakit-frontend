/* ============================================================================
   Contenido para la persona que va a donar (landing)
   ----------------------------------------------------------------------------
   US-14 (requisitos) y US-15 (preguntas frecuentes).

   PROVISORIO EN EL FRONTEND. El backend tiene las tablas `requirement` y
   `faq_item` (con categoría, orden y la marca is_immediate_disqualification),
   pero todavía no hay endpoints que las expongan (US-14/ST-02 y US-15/ST-02).
   La forma de estos datos copia la de esas tablas a propósito: cuando existan
   los endpoints, se reemplaza este archivo por una llamada a la API y los
   componentes no cambian.

   Criterio de contenido: solo requisitos generales y ampliamente difundidos
   para donar en Argentina, redactados con prudencia. Siempre se aclara que la
   decisión final la toma el equipo médico en la entrevista previa. No se dan
   plazos ni condiciones que no estén respaldados.

   Fuentes (consultadas el 06/11/2026):
   - Banco de Sangre del Hospital Garrahan: turno previo, entrada de donantes,
     estacionamiento para donantes.
     https://www.garrahan.gov.ar/home-hemoterapia
   - Requisitos generales difundidos para el Día del Donante: más de 50 kg,
     16 a 18 años con autorización, no ir en ayunas, dormir al menos 6 horas,
     sin tatuajes en el último año, 2 meses entre donaciones.
     https://www.cronista.com/informacion-gral/dia-del-donante-voluntario-de-sangre-por-que-es-importante-donar-y-cuales-son-los-requisitos-para-hacerlo
   ========================================================================== */

/* ------------------------------------------------------------- US-14 */

export interface PreguntaAptitud {
  id: string;
  pregunta: string;
  /** Aclaración corta debajo de la pregunta. */
  ayuda?: string;
  /** Qué respuesta permite donar. */
  apta: "si" | "no";
  /** Qué decir si la respuesta no es la apta. */
  siNoApta: string;
  /** Como `is_immediate_disqualification`: impide donar hoy, no "consultá". */
  impide: boolean;
}

export const PREGUNTAS_APTITUD: PreguntaAptitud[] = [
  {
    id: "edad",
    pregunta: "¿Tenés entre 16 y 65 años?",
    ayuda: "Si tenés 16 o 17, necesitás autorización de tu madre, padre o tutor.",
    apta: "si",
    siNoApta: "Por edad, no podrías donar. Igual podés ayudar compartiendo el pedido.",
    impide: true,
  },
  {
    id: "peso",
    pregunta: "¿Pesás más de 50 kg?",
    apta: "si",
    siNoApta: "Hace falta pesar más de 50 kg para donar con seguridad.",
    impide: true,
  },
  {
    id: "salud",
    pregunta: "¿Hoy te sentís bien de salud?",
    ayuda: "Sin fiebre, gripe ni malestar.",
    apta: "si",
    siNoApta: "Conviene esperar a sentirte bien. Podés sacar turno para otro día.",
    impide: false,
  },
  {
    id: "tatuaje",
    pregunta: "¿Te hiciste un tatuaje en los últimos 12 meses?",
    apta: "no",
    siNoApta: "Con un tatuaje de menos de un año todavía no se puede donar.",
    impide: true,
  },
  {
    id: "ultima",
    pregunta: "¿Donaste sangre en los últimos 2 meses?",
    apta: "no",
    siNoApta: "Entre una donación y otra tienen que pasar al menos 2 meses.",
    impide: true,
  },
  {
    id: "embarazo",
    pregunta: "¿Estás embarazada o amamantando?",
    apta: "no",
    siNoApta: "Durante el embarazo y la lactancia no se dona. Consultá en el banco de sangre cuándo podés.",
    impide: true,
  },
];

/** Recordatorios para el día de la donación (no son preguntas de sí/no). */
export const PARA_EL_DIA = [
  "Llevá tu DNI.",
  "No vayas en ayunas: desayuná algo liviano y tomá mucha agua.",
  "Dormí al menos 6 horas la noche anterior.",
];

/* ------------------------------------------------------------- US-15 */

export interface PreguntaFrecuente {
  id: string;
  categoria: "Antes" | "Durante" | "Después" | "Turno y sede";
  pregunta: string;
  respuesta: string;
}

export const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  {
    id: "turno",
    categoria: "Turno y sede",
    pregunta: "¿Necesito sacar turno?",
    respuesta:
      "Sí. En el Banco de Sangre del Garrahan se dona con turno: elegís día y horario en su web y lo validás con el mail que te llega. Si después no podés ir, avisá para liberar el turno.",
  },
  {
    id: "entrada",
    categoria: "Turno y sede",
    pregunta: "¿Por dónde entro?",
    respuesta:
      "La entrada para donantes es por 15 de Noviembre de 1889 N° 2151, Parque Patricios. No es la entrada principal del hospital. Hay estacionamiento gratuito para donantes.",
  },
  {
    id: "ayunas",
    categoria: "Antes",
    pregunta: "¿Tengo que ir en ayunas?",
    respuesta:
      "No. Al contrario: desayuná algo liviano y tomá bastante agua antes y después de donar.",
  },
  {
    id: "dni",
    categoria: "Antes",
    pregunta: "¿Qué tengo que llevar?",
    respuesta: "Tu DNI. Si tenés 16 o 17 años, también la autorización de tu madre, padre o tutor.",
  },
  {
    id: "para-quien",
    categoria: "Antes",
    pregunta: "¿Cómo hago para que mi donación sea para esta persona?",
    respuesta:
      "Al llegar, decí que venís a donar por el paciente de este pedido, con su nombre completo. La página tiene todos los datos para que los tengas a mano.",
  },
  {
    id: "entrevista",
    categoria: "Durante",
    pregunta: "¿Qué pasa cuando llego?",
    respuesta:
      "Primero hay una entrevista médica confidencial: ahí se confirma si podés donar ese día. Esa decisión es siempre del equipo médico, aunque cumplas los requisitos de esta página.",
  },
  {
    id: "seguro",
    categoria: "Durante",
    pregunta: "¿Es seguro? ¿Me pueden contagiar algo?",
    respuesta:
      "Sí, es seguro. Todo el material que se usa es estéril y descartable: se abre delante tuyo y se usa una sola vez.",
  },
  {
    id: "duele",
    categoria: "Durante",
    pregunta: "¿Duele?",
    respuesta:
      "Solo se siente el pinchazo al principio, como en un análisis de sangre. La extracción en sí no duele.",
  },
  {
    id: "despues",
    categoria: "Después",
    pregunta: "¿Qué tengo que hacer después de donar?",
    respuesta:
      "Tomá mucho líquido, comé algo y evitá esfuerzos físicos intensos el resto del día. Si te sentís mareado o mareada, avisá al personal.",
  },
  {
    id: "frecuencia",
    categoria: "Después",
    pregunta: "¿Cada cuánto puedo volver a donar?",
    respuesta:
      "Tienen que pasar al menos 2 meses entre una donación y otra. Las mujeres pueden donar hasta 3 veces por año y los varones hasta 4.",
  },
];
