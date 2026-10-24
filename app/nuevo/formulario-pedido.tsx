"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import {
  GRUPOS,
  ETIQUETA_TODOS,
  type ValorGrupo,
} from "@/lib/grupos-sanguineos";
import {
  validarNombre,
  validarInstitucion,
  validarGrupo,
  validarFecha,
  validarDonantes,
  validarObservaciones,
  NOMBRE_MAXIMO,
  DONANTES_MINIMO,
  DONANTES_MAXIMO,
  OBSERVACIONES_MAXIMO,
} from "@/lib/validacion-pedido";

/* ============================================================================
   US-01/ST-01 + ST-02 — Formulario del pedido con validación en tiempo real
   ----------------------------------------------------------------------------
   Cuándo se muestra un error, que es la decisión que define si el formulario
   ayuda o molesta:

   - Campo INCOMPLETO (vacío, muy corto): nada mientras escribe. Marcar
     "requerido" apenas alguien entra a un campo vacío es acusarlo de un error
     que todavía no cometió. Se muestra al salir del campo.
   - Campo con FORMATO INVÁLIDO (un número en un nombre): se muestra al
     instante. Eso ya está mal y no mejora tecleando más.
   - A partir de ahí, en cada tecla: se revalida. El error desaparece en cuanto
     se corrige, sin esperar a salir de nuevo.
   - Al enviar: se marcan todos los campos y se muestran todos los errores.

   Falta US-01/ST-06: la llamada a POST /api/campaigns, que depende del
   endpoint de backend (US-01/ST-03 a ST-05).
   ========================================================================== */

const INSTITUCIONES_DEMO = [
  { id: "1", nombre: "Hospital Garrahan", ciudad: "CABA" },
  { id: "2", nombre: "Hospital Italiano", ciudad: "CABA" },
  { id: "3", nombre: "Hospital Posadas", ciudad: "El Palomar" },
];

type Campo = "nombre" | "institucion" | "grupo";

export function FormularioPedido() {
  const [nombre, setNombre] = useState("");
  const [institucionId, setInstitucionId] = useState("");
  const [grupo, setGrupo] = useState<ValorGrupo | undefined>(undefined);

  // US-02/ST-01 — opcionales. Vacío significa "no lo informaron", y en la base
  // van como null: la placa tiene una regla distinta para cada ausencia.
  const [fecha, setFecha] = useState("");
  const [donantes, setDonantes] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // El mínimo del calendario se calcula después del montaje. Si se calculara
  // durante el render, el servidor y el navegador podrían estar en días
  // distintos y React avisaría que el HTML no coincide.
  const [hoy, setHoy] = useState("");
  useEffect(() => {
    setHoy(new Date().toISOString().slice(0, 10));
  }, []);

  const [tocado, setTocado] = useState<Record<Campo, boolean>>({
    nombre: false,
    institucion: false,
    grupo: false,
  });

  const marcar = (campo: Campo) =>
    setTocado((t) => (t[campo] ? t : { ...t, [campo]: true }));

  const vNombre = validarNombre(nombre);
  const vInstitucion = validarInstitucion(institucionId);
  const vGrupo = validarGrupo(grupo);

  // Un error de campo incompleto espera al blur. Uno de formato se muestra
  // apenas ocurre: lo que ya está mal no mejora tecleando más.
  const errNombre = !vNombre.ok && (tocado.nombre || vNombre.inmediato)
    ? vNombre.error
    : null;
  const errInstitucion =
    tocado.institucion && !vInstitucion.ok ? vInstitucion.error : null;
  const errGrupo = tocado.grupo && !vGrupo.ok ? vGrupo.error : null;

  // El aviso de nombre largo no es un error: se muestra apenas aparece.
  const avisoNombre = vNombre.ok ? vNombre.aviso : undefined;

  // US-02/ST-02 — opcionales. Vacío siempre es válido, así que no hay estado
  // "incompleto" que esperar: el error, si lo hay, se muestra enseguida.
  const vFecha = validarFecha(fecha, hoy);
  const vDonantes = validarDonantes(donantes);
  const vObservaciones = validarObservaciones(observaciones);

  const errFecha = vFecha.ok ? null : vFecha.error;
  const errDonantes = vDonantes.ok ? null : vDonantes.error;

  const avisoDonantes = vDonantes.ok ? vDonantes.aviso : undefined;
  const avisoObservaciones = vObservaciones.ok
    ? vObservaciones.aviso
    : undefined;

  const valido =
    vNombre.ok &&
    vInstitucion.ok &&
    vGrupo.ok &&
    vFecha.ok &&
    vDonantes.ok &&
    vObservaciones.ok;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTocado({ nombre: true, institucion: true, grupo: true });
    if (!valido) return;
    // US-01/ST-06: POST /api/campaigns
  }

  return (
    <form className="flex flex-col gap-7" onSubmit={enviar} noValidate>
      {/* ---------------------------------------------------- Nombre */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="nombre"
          className="text-base font-semibold text-text-primary"
        >
          ¿Para quién es la donación?
        </label>
        <p id="nombre-ayuda" className="text-sm text-text-secondary">
          El nombre que va a aparecer en la placa y en la página.
        </p>
        <input
          id="nombre"
          name="nombre"
          type="text"
          value={nombre}
          maxLength={NOMBRE_MAXIMO}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => marcar("nombre")}
          aria-describedby={
            errNombre ? "nombre-error" : avisoNombre ? "nombre-aviso" : "nombre-ayuda"
          }
          aria-invalid={errNombre ? true : undefined}
          autoComplete="off"
          placeholder="Nombre y apellido"
          className={[
            "h-14 w-full rounded-md border bg-surface px-4 text-base text-text-primary placeholder:text-text-muted",
            errNombre ? "border-danger" : "border-border-interactive",
          ].join(" ")}
        />
        <Mensaje id="nombre-error" error={errNombre} />
        {!errNombre && avisoNombre && (
          <p id="nombre-aviso" className="text-sm text-text-secondary">
            {avisoNombre}
          </p>
        )}
      </div>

      {/* --------------------------------------------- Centro de salud */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="institucion"
          className="text-base font-semibold text-text-primary"
        >
          ¿Dónde se dona?
        </label>
        <p id="institucion-ayuda" className="text-sm text-text-secondary">
          El centro donde está internada la persona o donde pidieron los donantes.
        </p>
        <div className="relative">
          <select
            id="institucion"
            name="institucion"
            value={institucionId}
            onChange={(e) => {
              setInstitucionId(e.target.value);
              marcar("institucion");
            }}
            onBlur={() => marcar("institucion")}
            aria-describedby={
              errInstitucion ? "institucion-error" : "institucion-ayuda"
            }
            aria-invalid={errInstitucion ? true : undefined}
            className={[
              "h-14 w-full appearance-none rounded-md border bg-surface px-4 pr-12 text-base text-text-primary",
              errInstitucion ? "border-danger" : "border-border-interactive",
            ].join(" ")}
          >
            <option value="">Elegí un centro de salud</option>
            {INSTITUCIONES_DEMO.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre} — {i.ciudad}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary">
            <Icon name="sede" size={20} />
          </span>
        </div>
        <Mensaje id="institucion-error" error={errInstitucion} />
      </div>

      {/* ------------------------------------------- Grupo sanguíneo */}
      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="text-base font-semibold text-text-primary">
          ¿Qué grupo sanguíneo se necesita?
        </legend>
        <p id="grupo-ayuda" className="text-sm text-text-secondary">
          Si no te lo dijeron, elegí {ETIQUETA_TODOS}: se puede corregir después.
        </p>

        <div
          role="radiogroup"
          aria-describedby={errGrupo ? "grupo-error" : "grupo-ayuda"}
          aria-label="Grupo sanguíneo"
          className="mt-1 grid grid-cols-3 gap-2.5"
        >
          {GRUPOS.map((g) => (
            <BotonGrupo
              key={g}
              etiqueta={g}
              activo={grupo === g}
              error={Boolean(errGrupo)}
              onClick={() => {
                setGrupo(g);
                marcar("grupo");
              }}
            />
          ))}
          <BotonGrupo
            etiqueta={ETIQUETA_TODOS}
            activo={grupo === null}
            error={Boolean(errGrupo)}
            onClick={() => {
              setGrupo(null);
              marcar("grupo");
            }}
          />
        </div>
        <Mensaje id="grupo-error" error={errGrupo} />
      </fieldset>

      {/* ------------------------------------------ Campos opcionales */}
      <div className="mt-2 border-t border-border pt-7">
        <h2 className="text-xl">Datos opcionales</h2>
        <p className="mt-1 text-sm text-text-secondary">
          No hacen falta para generar el kit, pero la placa comunica mejor con
          ellos.
        </p>

        <div className="mt-6 flex flex-col gap-7">
          {/* Fecha límite */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="fecha"
              className="text-base font-semibold text-text-primary"
            >
              ¿Hasta cuándo se necesita?
            </label>
            <p id="fecha-ayuda" className="text-sm text-text-secondary">
              Si hay una fecha, la placa muestra cuántos días quedan.
            </p>
            <input
              id="fecha"
              name="fecha"
              type="date"
              value={fecha}
              min={hoy || undefined}
              onChange={(e) => setFecha(e.target.value)}
              aria-describedby={errFecha ? "fecha-error" : "fecha-ayuda"}
              aria-invalid={errFecha ? true : undefined}
              className={[
                "h-14 w-full rounded-md border bg-surface px-4 text-base text-text-primary",
                errFecha ? "border-danger" : "border-border-interactive",
              ].join(" ")}
            />
            <Mensaje id="fecha-error" error={errFecha} />
          </div>

          {/* Cantidad de donantes */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="donantes"
              className="text-base font-semibold text-text-primary"
            >
              ¿Cuántos donantes se necesitan?
            </label>
            <p id="donantes-ayuda" className="text-sm text-text-secondary">
              Un número concreto moviliza más que un pedido general.
            </p>
            <Contador
              valor={donantes}
              onChange={setDonantes}
              describedBy={errDonantes ? "donantes-error" : "donantes-ayuda"}
              error={Boolean(errDonantes)}
            />
            <Mensaje id="donantes-error" error={errDonantes} />
            {!errDonantes && avisoDonantes && (
              <p className="text-sm text-text-secondary">{avisoDonantes}</p>
            )}
          </div>

          {/* Observaciones */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="observaciones"
              className="text-base font-semibold text-text-primary"
            >
              ¿Algo más que deban saber?
            </label>
            <p id="observaciones-ayuda" className="text-sm text-text-secondary">
              Va en la página, no en la placa. Por ejemplo: a qué piso ir, o un
              horario distinto al habitual.
            </p>
            <textarea
              id="observaciones"
              name="observaciones"
              rows={3}
              value={observaciones}
              maxLength={OBSERVACIONES_MAXIMO}
              onChange={(e) => setObservaciones(e.target.value)}
              aria-describedby="observaciones-ayuda observaciones-restantes"
              className="w-full resize-none rounded-md border border-border-interactive bg-surface p-4 text-base leading-relaxed text-text-primary placeholder:text-text-muted"
              placeholder="Preguntar por Hemoterapia en planta baja."
            />
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-text-secondary">
                {avisoObservaciones ?? ""}
              </p>
              <p
                id="observaciones-restantes"
                className="shrink-0 text-sm text-text-muted"
              >
                {OBSERVACIONES_MAXIMO - observaciones.length} caracteres
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------- Acción */}
      <button
        type="submit"
        className="mt-1 flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-surface-brand text-lg font-semibold text-text-on-brand"
      >
        Continuar
        <Icon name="enlace" size={20} />
      </button>

      <p className="text-center text-sm text-text-secondary">
        Después vas a poder agregar la fecha límite y otros datos.
      </p>
    </form>
  );
}

/* ----------------------------------------------------------------------------
   Contador de donantes.

   Por qué no es un <input type="number"> suelto: en el celular las flechitas
   son diminutas, y en la computadora la rueda del mouse cambia el valor sin
   querer cuando alguien scrollea con el cursor encima. Los dos problemas son
   conocidos y los dos arruinan un dato que después va impreso en una placa.

   La solución es el campo acompañado de dos botones de 56 px. Se puede tocar
   o escribir, y la rueda no lo toca porque el campo es de texto con teclado
   numérico, no de tipo número.
-------------------------------------------------------------------------------- */
function Contador({
  valor,
  onChange,
  describedBy,
  error = false,
}: {
  valor: string;
  onChange: (v: string) => void;
  describedBy: string;
  error?: boolean;
}) {
  const n = valor === "" ? 0 : Number(valor);

  const ajustar = (delta: number) => {
    const siguiente = Math.min(
      DONANTES_MAXIMO,
      Math.max(DONANTES_MINIMO, n + delta),
    );
    onChange(String(siguiente));
  };

  const boton =
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border-interactive bg-surface text-2xl font-semibold text-text-primary disabled:text-text-muted";

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => ajustar(-1)}
        disabled={valor === "" || n <= DONANTES_MINIMO}
        aria-label="Un donante menos"
        className={boton}
      >
        −
      </button>

      <input
        id="donantes"
        name="donantes"
        type="text"
        inputMode="numeric"
        value={valor}
        onChange={(e) => {
          // Solo dígitos, y nunca más de dos: el máximo es 99.
          const limpio = e.target.value.replace(/\D/g, "").slice(0, 2);
          onChange(limpio);
        }}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        placeholder="—"
        className={[
          "h-14 min-w-0 flex-1 rounded-md border bg-surface text-center text-lg font-semibold text-text-primary placeholder:font-normal placeholder:text-text-muted",
          error ? "border-danger" : "border-border-interactive",
        ].join(" ")}
      />

      <button
        type="button"
        onClick={() => ajustar(1)}
        disabled={n >= DONANTES_MAXIMO}
        aria-label="Un donante más"
        className={boton}
      >
        +
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Mensaje de error.

   role="alert" hace que el lector de pantalla lo anuncie en cuanto aparece,
   sin que el usuario tenga que ir a buscarlo. El ícono lleva aria-hidden
   porque el texto ya dice todo: leerlo dos veces es ruido.
-------------------------------------------------------------------------------- */
function Mensaje({ id, error }: { id: string; error: string | null }) {
  if (!error) return null;
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-sm font-medium text-danger"
    >
      <span className="mt-0.5 shrink-0">
        <Icon name="alerta" size={16} />
      </span>
      {error}
    </p>
  );
}

/* ----------------------------------------------------------------------------
   Botón de grupo sanguíneo.

   Es un <button> con role="radio" y no un <input type="radio"> porque el dato
   tiene que ocupar todo el recuadro: un radio nativo obliga a dibujar el
   círculo. El comportamiento accesible se mantiene con aria-checked dentro del
   radiogroup del padre.

   Alto de 56 px: supera los 44 px mínimos de área tocable (WCAG 2.5.5).
-------------------------------------------------------------------------------- */
function BotonGrupo({
  etiqueta,
  activo,
  error,
  onClick,
}: {
  etiqueta: string;
  activo: boolean;
  error: boolean;
  onClick: () => void;
}) {
  const borde = activo
    ? "border-surface-brand bg-surface-brand text-text-on-brand"
    : error
      ? "border-danger bg-surface text-text-primary"
      : "border-border-interactive bg-surface text-text-primary";

  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      className={`flex h-14 items-center justify-center rounded-md border text-lg font-semibold ${borde}`}
    >
      {etiqueta}
    </button>
  );
}
