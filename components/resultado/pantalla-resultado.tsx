"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/lib/icons";
import {
  guardarPlacas,
  registrarDescarga,
  type CampaniaCreada,
  type DatosPedido,
  type FormatoAsset,
  type Respuesta,
  type PlacaGuardada,
} from "@/lib/api";
import {
  generarPlaca11,
  generarPlaca916,
  nombreArchivo,
  type DatosPlaca,
  type FormatoPlaca,
} from "@/lib/placa";
import { urlCampania } from "@/lib/sitio";
import { textoParaCompartir } from "@/lib/texto-compartir";
import { descargarArchivo } from "@/lib/descargar";
import { copiarTexto } from "@/lib/copiar";
import { useAvisos } from "@/components/ui/avisos";
import { TarjetaPlaca } from "./tarjeta-placa";
import { SelectorFormato } from "./selector-formato";
import { VisorPlaca } from "./visor-placa";
import { BloqueTexto } from "./bloque-texto";
import { DescargaZip } from "./descarga-zip";

/* ============================================================================
   Paso 2 — Resultado: el kit listo para revisar y llevarse
   ----------------------------------------------------------------------------
   Reúne las tareas del Sprint 3:
     US-05  vista previa por formato, pestañas y zoom
     US-06  texto para compartir
     US-07  descarga individual + aviso
     US-08  descarga completa en ZIP
     US-09  copiar el texto
   y el "Corregir datos" de US-10.

   CUÁNDO SE CONFIRMA LA CAMPAÑA
   En el backend, guardar las placas confirma la campaña (DRAFT -> ACTIVE).
   Así que no se guardan apenas se generan: la persona todavía está revisando,
   y puede volver a corregir. Se guardan la primera vez que se lleva algo del
   kit (descarga una placa, el ZIP, o copia el texto con el enlace), que es el
   momento en que el pedido sale a circular.

   Ese guardado se hace UNA vez por campaña, con las dos placas y sin
   registrar descargas. Después cada descarga registra solo su formato.

   El guardado es silencioso: no se muestra ningún estado en pantalla. La
   página del caso ya funciona desde que se crea la campaña, así que un
   "se publica cuando descargues" o un "no pudimos publicar" le decía a la
   persona algo que no era cierto (comentario de QA en US-17). Si el guardado
   falla, queda registrado en la consola y se reintenta en la próxima acción.

   PÁGINA DEL CASO PRIMERO: el enlace va arriba de todo, antes de las placas,
   con su botón para copiarlo. Es lo primero que la persona quiere mandar, y
   abajo de todo se perdía.
   ========================================================================== */

const A_ASSET: Record<FormatoPlaca, FormatoAsset> = { "1x1": "SQUARE_1_1", "9x16": "STORY_9_16" };

type Blobs = Record<FormatoPlaca, Blob | null>;
type Urls = Record<FormatoPlaca, string | null>;

/* Un guardado por versión de la campaña, aunque el componente se monte dos
   veces (en desarrollo React monta los efectos dos veces a propósito).

   La clave incluye los datos y no solo el id: al corregir con PATCH (US-10)
   la campaña conserva su id, pero las placas son otras y hay que volver a
   guardarlas. */
const guardados = new Map<string, Promise<Respuesta<PlacaGuardada[]>>>();
const claveDe = (c: CampaniaCreada, p: DatosPedido) => `${c.id}|${c.slug}|${JSON.stringify(p)}`;

interface Props {
  campania: CampaniaCreada;
  pedido: DatosPedido;
  alCorregir: () => void;
}

export function PantallaResultado({ campania, pedido, alCorregir }: Props) {
  const avisar = useAvisos();
  const [blobs, setBlobs] = useState<Blobs>({ "1x1": null, "9x16": null });
  const [urls, setUrls] = useState<Urls>({ "1x1": null, "9x16": null });
  const [error, setError] = useState<string | null>(null);
  const [formato, setFormato] = useState<FormatoPlaca>("1x1");
  const [ampliado, setAmpliado] = useState<FormatoPlaca | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);
  const relojEnlace = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  const datos: DatosPlaca = {
    nombre: pedido.nombre.trim(),
    grupo: pedido.grupo ?? null,
    donantes: pedido.donantes === "" ? null : Number(pedido.donantes),
    fecha: pedido.fecha || null,
    slug: campania.slug,
  };
  const enlace = urlCampania(campania.slug);
  const texto = campania.textoGenerado ?? textoParaCompartir(pedido, enlace);
  const descripcion = (f: FormatoPlaca) =>
    `Placa ${f === "1x1" ? "cuadrada" : "vertical"}: se buscan donantes de sangre ${
      datos.grupo ?? "de cualquier grupo"
    } para ${datos.nombre}, con código QR a la página del caso.`;

  // Al llegar a este paso, el foco va al título: quien usa lector de pantalla
  // se entera de que cambió la pantalla, y nadie queda a mitad de la página.
  useEffect(() => {
    titulo.current?.focus();
    return () => {
      if (relojEnlace.current) clearTimeout(relojEnlace.current);
    };
  }, []);

  // ------------------------------------------------------------ Generación
  useEffect(() => {
    let vivo = true;
    const creadas: string[] = [];
    (async () => {
      try {
        // La cuadrada primero: es la pestaña que se ve al entrar.
        const cuadrada = await generarPlaca11(datos);
        const u1 = URL.createObjectURL(cuadrada);
        creadas.push(u1);
        if (!vivo) return;
        setBlobs((b) => ({ ...b, "1x1": cuadrada }));
        setUrls((u) => ({ ...u, "1x1": u1 }));

        const vertical = await generarPlaca916(datos);
        const u2 = URL.createObjectURL(vertical);
        creadas.push(u2);
        if (!vivo) return;
        setBlobs((b) => ({ ...b, "9x16": vertical }));
        setUrls((u) => ({ ...u, "9x16": u2 }));
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : "No pudimos generar las placas.");
      }
    })();
    return () => {
      vivo = false;
      for (const u of creadas) URL.revokeObjectURL(u);
    };
    // El slug identifica la campaña: si no cambió, las placas son las mismas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campania.slug]);

  // ---------------------------------------------- Guardado y registro (backend)
  async function asegurarGuardado(): Promise<boolean> {
    const c = blobs["1x1"];
    const v = blobs["9x16"];
    if (!c || !v) return false;
    const clave = claveDe(campania, pedido);
    let p = guardados.get(clave);
    if (!p) {
      // Con las placas va el texto para compartir (US-06/ST-02).
      p = guardarPlacas(
        campania,
        [
          { formato: "SQUARE_1_1", imagen: c, ancho: 1080, alto: 1080 },
          { formato: "STORY_9_16", imagen: v, ancho: 1080, alto: 1920 },
        ],
        texto,
      );
      guardados.set(clave, p);
    }
    const r = await p;
    if (!r.ok) {
      guardados.delete(clave); // el próximo intento vuelve a pedir
      console.warn(`DonaKit: no se pudieron guardar las placas (${r.error}).`);
      return false;
    }
    return true;
  }

  /** Guardar (si hace falta) y registrar. Nunca bloquea la descarga. */
  function registrar(formatos: FormatoPlaca[], opciones: { zip?: boolean } = {}) {
    void (async () => {
      if (await asegurarGuardado()) {
        await registrarDescarga(campania, formatos.map((f) => A_ASSET[f]), opciones);
      }
    })();
  }

  async function copiarEnlace() {
    const ok = await copiarTexto(enlace);
    if (!ok) {
      avisar("No pudimos copiar. Mantené apretado el enlace para copiarlo.", "error");
      return;
    }
    setEnlaceCopiado(true);
    avisar("Enlace copiado. Pegalo donde quieras compartir el pedido.");
    void asegurarGuardado();
    if (relojEnlace.current) clearTimeout(relojEnlace.current);
    relojEnlace.current = setTimeout(() => setEnlaceCopiado(false), 2000);
  }

  function descargar(f: FormatoPlaca) {
    const blob = blobs[f];
    if (!blob) return;
    descargarArchivo(blob, nombreArchivo(datos, f));
    avisar(`Descarga iniciada: placa ${f === "1x1" ? "cuadrada" : "vertical"}.`);
    registrar([f]);
  }

  const archivosZip =
    blobs["1x1"] && blobs["9x16"]
      ? [
          { nombre: nombreArchivo(datos, "1x1"), datos: blobs["1x1"] },
          { nombre: nombreArchivo(datos, "9x16"), datos: blobs["9x16"] },
          { nombre: "texto-para-compartir.txt", datos: texto },
        ]
      : null;

  const panel = (f: FormatoPlaca) => (
    <TarjetaPlaca
      formato={f}
      url={urls[f]}
      error={error}
      descripcion={descripcion(f)}
      alAmpliar={() => setAmpliado(f)}
      alDescargar={() => descargar(f)}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-text-secondary">Paso 2 de 2</p>
        <h1 ref={titulo} tabIndex={-1} className="mt-2 text-2xl outline-none">
          Tu kit está listo
        </h1>
        <p className="mt-2 text-base leading-relaxed text-text-secondary">
          Revisá las placas, descargalas y compartilas con el texto. El QR lleva
          a la página del caso.
        </p>
      </div>

      <section
        aria-labelledby="titulo-enlace"
        className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4 ring-1 ring-border"
      >
        <div>
          <h2 id="titulo-enlace" className="flex items-center gap-2 text-base font-semibold">
            <Icon name="enlace" size={18} />
            Página del caso
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Ya está activa: es la que abre el QR de las placas.
          </p>
        </div>
        <a
          href={enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-2 text-sm font-semibold text-text-primary underline underline-offset-2 wrap-anywhere"
        >
          <Icon name="enlaceExterno" size={18} className="mt-px shrink-0" />
          {enlace.replace(/^https?:\/\//, "")}
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
        <button
          type="button"
          onClick={() => void copiarEnlace()}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold ring-2 transition-colors ${
            enlaceCopiado
              ? "bg-success-bg text-success ring-success"
              : "bg-surface text-text-primary ring-border-interactive"
          }`}
        >
          <Icon name={enlaceCopiado ? "listo" : "copiar"} size={18} />
          <span aria-live="polite">{enlaceCopiado ? "Enlace copiado" : "Copiar enlace"}</span>
        </button>
      </section>

      <SelectorFormato activo={formato} alCambiar={setFormato} paneles={{ "1x1": panel("1x1"), "9x16": panel("9x16") }} />

      <DescargaZip
        nombreZip={nombreArchivo(datos, "1x1").replace(/-1x1\.png$/, "-kit.zip")}
        archivos={archivosZip}
        alDescargar={() => registrar(["1x1", "9x16"], { zip: true })}
      />

      <BloqueTexto texto={texto} alCopiar={() => void asegurarGuardado()} />

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-base font-semibold">¿Algo está mal?</h2>
        <p className="text-sm text-text-secondary">
          Volvé al formulario con los datos cargados, corregí lo que haga falta y
          generá el kit de nuevo.
        </p>
        <button
          type="button"
          onClick={alCorregir}
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold text-text-primary ring-2 ring-border-interactive"
        >
          <Icon name="editar" size={18} />
          Corregir datos
        </button>
      </section>

      <VisorPlaca
        formato={ampliado}
        url={ampliado ? urls[ampliado] : null}
        descripcion={ampliado ? descripcion(ampliado) : ""}
        alCerrar={() => setAmpliado(null)}
      />
    </div>
  );
}
