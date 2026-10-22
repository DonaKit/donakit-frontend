"use client";

import { useState } from "react";
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
  NOMBRE_MAXIMO,
} from "@/lib/validacion-pedido";

/* ============================================================================
   US-01/ST-01 + ST-02 — Formulario del pedido con validación en tiempo real
   ----------------------------------------------------------------------------
   Cuándo se muestra un error, que es la decisión que define si el formulario
   ayuda o molesta:

   - Mientras se escribe por primera vez: NADA. Marcar "campo requerido" apenas
     alguien entra a un campo vacío es acusarlo de un error que todavía no
     cometió.
   - Al salir del campo (blur): se valida y se muestra.
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

  // Un error solo se muestra si el campo ya fue tocado.
  const errNombre = tocado.nombre && !vNombre.ok ? vNombre.error : null;
  const errInstitucion =
    tocado.institucion && !vInstitucion.ok ? vInstitucion.error : null;
  const errGrupo = tocado.grupo && !vGrupo.ok ? vGrupo.error : null;

  // El aviso de nombre largo no es un error: se muestra apenas aparece.
  const avisoNombre = vNombre.ok ? vNombre.aviso : undefined;

  const valido = vNombre.ok && vInstitucion.ok && vGrupo.ok;

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
