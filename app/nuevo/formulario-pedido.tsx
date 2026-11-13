"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/lib/icons";
import { INSTITUCION } from "@/lib/institucion";
import {
  GRUPOS,
  ETIQUETA_TODOS,
  type ValorGrupo,
} from "@/lib/grupos-sanguineos";
import {
  validarNombre,
  validarGrupo,
  validarFecha,
  validarDonantes,
  validarObservaciones,
  NOMBRE_MAXIMO,
  DONANTES_MINIMO,
  DONANTES_MAXIMO,
  OBSERVACIONES_MAXIMO,
} from "@/lib/validacion-pedido";
import {
  actualizarCampania,
  cambiaElEnlace,
  corregibleConPatch,
  crearCampania,
  type CampaniaCreada,
  type DatosPedido,
} from "@/lib/api";
import { Dialogo } from "@/components/ui/dialogo";

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

   US-01/ST-06: al enviar se crea la campaña en estado DRAFT y el backend
   devuelve el slug. Con ese slug el front arma el QR real de la
   previsualización. Confirmar, más adelante, solo cambia el estado.

   US-10 — Corregir datos: el formulario puede abrirse con los datos del kit
   ya generado (`inicial`). Si se envía sin cambios, vuelve al kit sin crear
   nada. Si hubo cambios, primero pide confirmación (ST-01) diciendo qué pasa
   con el enlace, y después corrige la MISMA campaña con PATCH (ST-03). La
   excepción es quitar un dato opcional, que el PATCH todavía no permite: ahí
   se crea una campaña nueva (ver corregibleConPatch en lib/api.ts).
   ========================================================================== */

type Campo = "nombre" | "grupo";

interface Props {
  /** Datos con los que arranca el formulario (US-10/ST-02: corregir). */
  inicial?: DatosPedido;
  /** La campaña que se está corrigiendo (US-10/ST-03: se corrige con PATCH). */
  anterior?: CampaniaCreada;
  /** Se llama cuando el backend creó la campaña. */
  alCrear: (campania: CampaniaCreada, pedido: DatosPedido) => void;
  /** Solo en modo corrección: volver al kit sin cambiar nada. */
  alCancelar?: () => void;
}

/** ¿Cambió algo respecto del kit anterior? Compara lo que se guarda, no espacios. */
function mismosDatos(a: DatosPedido, b: DatosPedido): boolean {
  return (
    a.nombre.trim() === b.nombre.trim() &&
    a.grupo === b.grupo &&
    a.fecha === b.fecha &&
    a.donantes === b.donantes &&
    a.observaciones.trim() === b.observaciones.trim()
  );
}

export function FormularioPedido({ inicial, anterior, alCrear, alCancelar }: Props) {
  const corrigiendo = inicial !== undefined;
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [grupo, setGrupo] = useState<ValorGrupo | undefined>(
    inicial ? inicial.grupo : undefined,
  );

  // US-02/ST-01 — opcionales. Vacío significa "no lo informaron", y en la base
  // van como null: la placa tiene una regla distinta para cada ausencia.
  const [fecha, setFecha] = useState(inicial?.fecha ?? "");
  const [donantes, setDonantes] = useState(inicial?.donantes ?? "");
  const [observaciones, setObservaciones] = useState(inicial?.observaciones ?? "");

  /* El mínimo del calendario se calcula después del montaje. Si se calculara
     durante el render, el servidor y el navegador podrían estar en días
     distintos y React avisaría que el HTML no coincide.

     El reloj del navegador ES un sistema externo a React, y leerlo al montar
     es exactamente para lo que sirve un efecto. La regla apunta a los efectos
     que encadenan renders a partir de estado que React ya tiene; acá no hay
     tal cosa: corre una vez y nunca más. */
  const [hoy, setHoy] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoy(new Date().toISOString().slice(0, 10));
  }, []);

  const [tocado, setTocado] = useState<Record<Campo, boolean>>({
    nombre: false,
    grupo: false,
  });

  const marcar = (campo: Campo) =>
    setTocado((t) => (t[campo] ? t : { ...t, [campo]: true }));

  const vNombre = validarNombre(nombre);
  const vGrupo = validarGrupo(grupo);

  // Un error de campo incompleto espera al blur. Uno de formato se muestra
  // apenas ocurre: lo que ya está mal no mejora tecleando más.
  const errNombre = !vNombre.ok && (tocado.nombre || vNombre.inmediato)
    ? vNombre.error
    : null;
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
    vGrupo.ok &&
    vFecha.ok &&
    vDonantes.ok &&
    vObservaciones.ok;

  // US-01/ST-06 — estados del envío.
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  function pedidoActual(): DatosPedido {
    return { nombre, grupo: grupo ?? null, fecha, donantes, observaciones };
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setTocado({ nombre: true, grupo: true });
    if (!valido || enviando) return;

    if (corrigiendo) {
      // Sin cambios no hay nada que reemplazar: se vuelve al mismo kit.
      if (mismosDatos(pedidoActual(), inicial)) {
        alCancelar?.();
        return;
      }
      setConfirmando(true);
      return;
    }
    await crear();
  }

  /* Cómo se va a corregir, para decirlo en el modal antes de hacerlo:
     - "mismo-enlace": PATCH sin cambio de nombre.
     - "enlace-nuevo": PATCH con cambio de nombre (el backend regenera el slug).
     - "kit-nuevo":    se quitó un dato opcional, que el PATCH no sabe borrar. */
  const pedidoNuevo = pedidoActual();
  const modo: "mismo-enlace" | "enlace-nuevo" | "kit-nuevo" | null =
    !corrigiendo || !anterior
      ? null
      : !corregibleConPatch(inicial, pedidoNuevo)
        ? "kit-nuevo"
        : cambiaElEnlace(inicial, pedidoNuevo)
          ? "enlace-nuevo"
          : "mismo-enlace";

  async function crear() {
    setConfirmando(false);
    setEnviando(true);
    setErrorEnvio(null);

    const pedido = pedidoActual();
    const r =
      anterior && (modo === "mismo-enlace" || modo === "enlace-nuevo")
        ? await actualizarCampania(anterior, pedido)
        : await crearCampania(pedido);

    setEnviando(false);
    if (!r.ok) {
      setErrorEnvio(r.error);
      return;
    }
    alCrear(r.datos, pedido);
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
      {/* No es un campo: el sistema opera para una sola institución. Pero la
          información queda a la vista, porque quien carga el pedido tiene que
          saber dónde se va a donar antes de seguir. */}
      <div className="flex items-start gap-3 rounded-lg bg-surface-muted p-4">
        <span className="mt-0.5 shrink-0 text-text-secondary">
          <Icon name="sede" size={20} />
        </span>
        <div>
          <p className="text-sm text-text-secondary">Se dona en</p>
          <p className="mt-0.5 text-base font-semibold text-text-primary">
            {INSTITUCION.nombre}
          </p>
          <p className="text-sm text-text-secondary">
            {INSTITUCION.servicio} · {INSTITUCION.ciudad}
          </p>
        </div>
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
              Si hay una fecha, aparece en las placas: “Donar hasta el 20/11”.
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
        disabled={enviando}
        aria-busy={enviando}
        className="mt-1 flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-surface-brand text-lg font-semibold text-text-on-brand disabled:bg-ink-400"
      >
        {enviando
          ? "Generando el kit…"
          : corrigiendo
            ? "Generar el kit corregido"
            : "Generar el kit"}
        {!enviando && <Icon name="placa" size={20} />}
      </button>

      {corrigiendo && (
        <button
          type="button"
          onClick={alCancelar}
          className="-mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold text-text-secondary hover:text-text-primary"
        >
          <Icon name="volver" size={18} />
          Volver al kit sin cambios
        </button>
      )}

      <Mensaje id="envio-error" error={errorEnvio} />

      {/* US-10/ST-01 — confirmación antes de reemplazar el kit */}
      <Dialogo
        abierto={confirmando}
        alCerrar={() => setConfirmando(false)}
        titulo={modo === "kit-nuevo" ? "¿Generar un kit nuevo?" : "¿Corregir el kit?"}
      >
        <div className="flex flex-col gap-4 pt-2">
          {modo === "mismo-enlace" && (
            <p className="text-base leading-relaxed text-text-secondary">
              Se actualizan los datos y se generan las placas de nuevo. El
              enlace no cambia: quien ya lo tiene va a ver los datos corregidos.
            </p>
          )}
          {modo === "enlace-nuevo" && (
            <>
              <p className="text-base leading-relaxed text-text-secondary">
                Se actualizan los datos y se generan las placas de nuevo.
              </p>
              <p className="rounded-lg bg-warning-bg p-3 text-sm leading-relaxed text-text-primary">
                Como cambiaste el nombre, el enlace y el QR cambian. Si ya
                compartiste el kit, mandá el nuevo: el enlace anterior deja de
                funcionar.
              </p>
            </>
          )}
          {(modo === "kit-nuevo" || modo === null) && (
            <>
              <p className="text-base leading-relaxed text-text-secondary">
                Como quitaste un dato que estaba cargado, se genera un kit
                nuevo, con placas y enlace nuevos.
              </p>
              <p className="rounded-lg bg-warning-bg p-3 text-sm leading-relaxed text-text-primary">
                Si ya compartiste el kit anterior, avisá que hay uno nuevo: el
                enlace viejo va a seguir mostrando los datos sin corregir.
              </p>
            </>
          )}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void crear()}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-surface-brand text-base font-semibold text-text-on-brand"
            >
              {modo === "kit-nuevo" || modo === null ? "Sí, generar el kit nuevo" : "Sí, corregir"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-text-primary ring-2 ring-border-interactive"
            >
              Seguir editando
            </button>
          </div>
        </div>
      </Dialogo>
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
