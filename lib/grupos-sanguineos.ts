/* ============================================================================
   Catálogo de grupos sanguíneos — US-01
   ----------------------------------------------------------------------------
   En Argentina el grupo nulo se escribe "0" (cero), no "O" (letra). Importa:
   la placa se lee de un vistazo y la confusión entre cero y letra O es
   justamente el error que la tipografía Inter evita.

   "Todos" cubre el caso en que la institución todavía no definió el grupo, o
   el pedido admite cualquiera. Se guarda como null en campaign.blood_type.
   ========================================================================== */

export const GRUPOS = [
  "0+",
  "0-",
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
] as const;

export type GrupoSanguineo = (typeof GRUPOS)[number];

/** Lo que se manda al backend: el grupo, o null si el pedido acepta cualquiera. */
export type ValorGrupo = GrupoSanguineo | null;

/** Etiqueta de la opción que representa "cualquier grupo". */
export const ETIQUETA_TODOS = "Todos";
