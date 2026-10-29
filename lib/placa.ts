import QRCode from "qrcode";
import { INSTITUCION } from "./institucion";

/* ============================================================================
   US-03/ST-03 — Generador de la placa 1:1 en el navegador
   ----------------------------------------------------------------------------
   Dibuja la placa de 1080×1080 con el canvas nativo, siguiendo la
   especificación de US-03/ST-02. Las medidas de MEDIDAS salen de ahí.

   POR QUÉ CANVAS Y NO CAPTURAR EL HTML A IMAGEN
   La especificación está escrita en coordenadas justamente para que un
   generador la reproduzca sin interpretar nada. Con canvas es traducción
   directa. Un capturador de HTML (html2canvas y parientes) es una
   *aproximación* de cómo el navegador dibuja: hay que incrustarle las fuentes
   aparte, falla con bordes redondeados y sombras, y pesa bastante más que
   esto.

   El resultado es un Blob PNG, que sirve igual para descargar, para
   previsualizar y para subir al backend (US-03/ST-04).
   ========================================================================== */

export interface DatosPlaca {
  /** Nombre del paciente, tal como lo escribió el difusor. */
  nombre: string;
  /** Grupo sanguíneo, o null si el pedido acepta cualquiera. */
  grupo: string | null;
  /** Cantidad de donantes, o null si no se informó. */
  donantes: number | null;
  /** Fecha límite en formato AAAA-MM-DD, o null. */
  fecha: string | null;
  /** Slug que devolvió el backend. Sin él no hay QR posible. */
  slug: string;
}

/* ----------------------------------------------------------------- Medidas */

const M = {
  lienzo: 1080,
  margen: 80,

  logo: 46,
  pill: { texto: 26, padX: 28, padY: 14 },

  grupo: {
    arriba: 52,
    padX: 56,
    padY: 34,
    radio: 28,
    etiqueta: 30,
    valor: 168,
  },

  quien: {
    arriba: 48,
    etiqueta: 26,
    nombre: 72,
    /** Cuando el nombre necesita dos líneas se achica hasta entrar. */
    nombreMinimo: 52,
    interlineado: 1.05,
  },

  /* La sede se ancla HACIA ARRIBA desde el pie, no hacia abajo desde el
     nombre. Es la diferencia entre que un nombre de dos líneas empuje el
     hospital encima del QR y que simplemente se coma el aire del medio. */
  sede: { nombre: 38, detalle: 34, sobreElPie: 46, entreLineas: 46 },

  pie: {
    qr: 220,
    qrRadio: 20,
    qrPad: 14,
    texto: 32,
    /** Por debajo de esto la URL no se achica más: deja de leerse. */
    textoMinimo: 22,
    separacion: 32,
  },
} as const;

/* Los colores son los tokens del design system. El canvas no lee CSS, así que
   van literales — es el mismo motivo por el que la especificación los lista.
   El token de origen va al lado para que se pueda verificar contra
   globals.css: si alguien cambia la paleta, acá se ve qué hay que tocar. */
const C = {
  fondo: "#283e60", //      --color-surface-brand
  rojo: "#c62540", //       --color-red-600
  blanco: "#ffffff", //     --color-text-on-brand
  rosaSuave: "#fac6cc", //  --color-red-200
  acento: "#f59ca7", //     --color-red-300
  secundario: "#bfd0e6", // --color-navy-200
  qrOscuro: "#0f172a", //   más oscuro que navy-900 a propósito: el contraste
  //                           del QR lo leen cámaras, no personas.
} as const;

/* ------------------------------------------------------------- Tipografías */

/* next/font descarga las fuentes en build y las registra con un nombre
   GENERADO: en el navegador no existe ninguna familia llamada "Outfit", sino
   una tipo `__Outfit_a1b2c3`. El nombre real queda en la variable CSS que
   layout.tsx expone, así que hay que leerlo de ahí.

   Esto importa más de lo que parece: cuando el canvas no encuentra la familia
   que le pedís, no avisa. Dibuja con la de reserva y sigue como si nada. La
   placa saldría con otra letra y el error recién se vería en la imagen. */
function familiaDe(variable: string, respaldo: string): string {
  if (typeof window === "undefined") return respaldo;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return v === "" ? respaldo : v;
}

/** `document.fonts.load` quiere una familia sola, no una lista separada por comas. */
function primeraFamilia(lista: string): string {
  return lista.split(",")[0].trim();
}

/* ------------------------------------------------------------------ Apoyo */

/** Parte un texto en líneas que entren en `ancho`, cortando por palabra. */
function envolver(
  ctx: CanvasRenderingContext2D,
  texto: string,
  ancho: number,
  maxLineas: number,
): string[] {
  const palabras = texto.trim().split(/\s+/).filter((p) => p !== "");
  if (palabras.length === 0) return [];

  const lineas: string[] = [];
  let actual = "";
  let i = 0;

  for (; i < palabras.length; i++) {
    const p = palabras[i];
    const prueba = actual === "" ? p : `${actual} ${p}`;
    if (ctx.measureText(prueba).width <= ancho || actual === "") {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = p;
      if (lineas.length === maxLineas) break;
    }
  }
  if (lineas.length < maxLineas && actual !== "") {
    lineas.push(actual);
    i = palabras.length;
  }

  // Si quedó texto afuera, la última línea termina en puntos suspensivos.
  if (i < palabras.length && lineas.length > 0) {
    let u = lineas[lineas.length - 1];
    while (u.length > 1 && ctx.measureText(`${u}…`).width > ancho) {
      u = u.slice(0, -1);
    }
    lineas[lineas.length - 1] = `${u}…`;
  }
  return lineas;
}

/** Rectángulo con esquinas redondeadas. */
function caja(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** `AAAA-MM-DD` a `DD/MM`, o `DD/MM/AA` si cae en otro año. */
function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  const esteAnio = new Date().getFullYear().toString();
  return a === esteAnio ? `${d}/${m}` : `${d}/${m}/${a.slice(2)}`;
}

/** Etiqueta de urgencia. Lleva el número solo si el pedido lo informó. */
function textoUrgencia(donantes: number | null): string {
  return donantes && donantes > 0
    ? `SE NECESITAN ${donantes} DONANTES`
    : "SE NECESITAN DONANTES";
}

/* -------------------------------------------------------------- Generador */

export async function generarPlaca11(d: DatosPlaca): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("La placa se genera en el navegador, no en el servidor.");
  }

  const fTitulo = familiaDe("--font-outfit", "sans-serif");
  const fTexto = familiaDe("--font-inter", "sans-serif");

  // Sin esta espera el canvas dibuja con la tipografía de reserva.
  await Promise.all([
    document.fonts.load(`700 ${M.grupo.valor}px ${primeraFamilia(fTitulo)}`),
    document.fonts.load(`700 ${M.quien.nombre}px ${primeraFamilia(fTitulo)}`),
    document.fonts.load(`600 ${M.pie.texto}px ${primeraFamilia(fTexto)}`),
    document.fonts.load(`400 ${M.sede.detalle}px ${primeraFamilia(fTexto)}`),
  ]);

  const cv = document.createElement("canvas");
  cv.width = M.lienzo;
  cv.height = M.lienzo;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió crear el lienzo.");

  const util = M.lienzo - M.margen * 2;
  ctx.textBaseline = "alphabetic";

  // ---------------------------------------------------------------- Fondo
  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, M.lienzo, M.lienzo);

  // ------------------------------------------------------------ Fila alta
  const yLogo = M.margen + M.logo;

  ctx.font = `700 ${M.logo}px ${fTitulo}`;
  ctx.fillStyle = C.blanco;
  ctx.fillText("Dona", M.margen, yLogo);
  const anchoDona = ctx.measureText("Dona").width;
  ctx.fillStyle = C.acento;
  ctx.fillText("Kit", M.margen + anchoDona, yLogo);

  const urgencia = textoUrgencia(d.donantes);
  ctx.font = `600 ${M.pill.texto}px ${fTexto}`;
  const anchoPill = ctx.measureText(urgencia).width + M.pill.padX * 2;
  const altoPill = M.pill.texto + M.pill.padY * 2;
  const xPill = M.lienzo - M.margen - anchoPill;
  const yPill = yLogo - M.logo * 0.78;

  ctx.fillStyle = C.rojo;
  caja(ctx, xPill, yPill, anchoPill, altoPill, altoPill / 2);
  ctx.fillStyle = C.blanco;
  ctx.fillText(urgencia, xPill + M.pill.padX, yPill + altoPill * 0.68);

  // --------------------------------------------------- Bloque del grupo
  const yGrupo = yPill + altoPill + M.grupo.arriba;
  const altoGrupo = M.grupo.valor + M.grupo.padY * 2;

  ctx.fillStyle = C.rojo;
  caja(ctx, M.margen, yGrupo, util, altoGrupo, M.grupo.radio);

  ctx.font = `600 ${M.grupo.etiqueta}px ${fTexto}`;
  ctx.fillStyle = C.rosaSuave;
  const medioGrupo = yGrupo + altoGrupo / 2;
  ctx.fillText("GRUPO", M.margen + M.grupo.padX, medioGrupo - 6);
  ctx.fillText(
    "Y FACTOR",
    M.margen + M.grupo.padX,
    medioGrupo + M.grupo.etiqueta + 2,
  );

  // "TODOS" tiene cinco letras y no entra al mismo cuerpo que "0+".
  const valor = d.grupo ?? "TODOS";
  const cuerpo = valor.length > 3 ? M.grupo.valor * 0.62 : M.grupo.valor;
  ctx.font = `700 ${cuerpo}px ${fTitulo}`;
  ctx.fillStyle = C.blanco;
  const anchoValor = ctx.measureText(valor).width;
  ctx.fillText(
    valor,
    M.lienzo - M.margen - M.grupo.padX - anchoValor,
    medioGrupo + cuerpo * 0.34,
  );

  /* El pie se calcula ACÁ aunque se dibuje último: es el ancla del resto. */
  const yPie = M.lienzo - M.margen - M.pie.qr;

  // La sede cuelga del pie hacia arriba, así el nombre no la empuja.
  const ySedeDetalle = yPie - M.sede.sobreElPie;
  const ySedeNombre = ySedeDetalle - M.sede.entreLineas;

  // ------------------------------------------------------ Quién y dónde
  let y = yGrupo + altoGrupo + M.quien.arriba + M.quien.etiqueta;

  ctx.font = `600 ${M.quien.etiqueta}px ${fTexto}`;
  ctx.fillStyle = C.secundario;
  ctx.fillText("DONÁ POR", M.margen, y);

  /* La fecha límite va en esta fila, a la derecha, y no en el pie.
     Dos motivos: el pie lo necesita entero para la URL, y la fecha es
     información de urgencia — pertenece arriba, con el resto. */
  if (d.fecha) {
    const hasta = `HASTA EL ${formatearFecha(d.fecha)}`;
    ctx.fillText(hasta, M.lienzo - M.margen - ctx.measureText(hasta).width, y);
  }

  /* El nombre se achica hasta que el bloque entre entre la etiqueta y la
     sede. Un nombre de dos líneas a cuerpo completo se monta sobre el
     hospital; bajarle el cuerpo cuesta menos que recortar el apellido. */
  const pisoNombre = ySedeNombre - M.sede.nombre - 18;
  let cuerpoNombre = M.quien.nombre;
  let lineasNombre: string[] = [];

  for (;;) {
    ctx.font = `700 ${cuerpoNombre}px ${fTitulo}`;
    lineasNombre = envolver(ctx, d.nombre, util, 2);
    const alto =
      cuerpoNombre * 1.1 +
      (lineasNombre.length - 1) * cuerpoNombre * M.quien.interlineado;
    if (y + alto <= pisoNombre || cuerpoNombre <= M.quien.nombreMinimo) break;
    cuerpoNombre -= 2;
  }

  ctx.fillStyle = C.blanco;
  y += cuerpoNombre * 1.1;
  for (const linea of lineasNombre) {
    ctx.fillText(linea, M.margen, y);
    y += cuerpoNombre * M.quien.interlineado;
  }

  ctx.font = `600 ${M.sede.nombre}px ${fTexto}`;
  ctx.fillStyle = C.blanco;
  ctx.fillText(INSTITUCION.nombre, M.margen, ySedeNombre);

  ctx.font = `400 ${M.sede.detalle}px ${fTexto}`;
  ctx.fillStyle = C.secundario;
  ctx.fillText(
    `${INSTITUCION.servicio} · ${INSTITUCION.ciudad}`,
    M.margen,
    ySedeDetalle,
  );

  // ------------------------------------------------------------- Pie
  const url = `donakit.app/c/${d.slug}`;

  /* El QR se dibuja sobre una placa blanca con su propio margen. Sin zona
     clara alrededor muchas cámaras no lo reconocen: el borde es parte del
     código, no decoración. */
  const lienzoQr = document.createElement("canvas");
  await QRCode.toCanvas(lienzoQr, `https://${url}`, {
    margin: 0,
    width: M.pie.qr - M.pie.qrPad * 2,
    color: { dark: C.qrOscuro, light: C.blanco },
  });

  ctx.fillStyle = C.blanco;
  caja(ctx, M.margen, yPie, M.pie.qr, M.pie.qr, M.pie.qrRadio);
  ctx.drawImage(lienzoQr, M.margen + M.pie.qrPad, yPie + M.pie.qrPad);

  const xTexto = M.margen + M.pie.qr + M.pie.separacion;
  const anchoTexto = M.lienzo - M.margen - xTexto;

  ctx.font = `400 ${M.pie.texto}px ${fTexto}`;
  ctx.fillStyle = C.secundario;
  ctx.fillText("Requisitos, horarios y cómo llegar", xTexto, yPie + 96);

  /* La URL se achica hasta entrar. El largo depende del nombre del paciente,
     que no controlamos: "donantes-ruiz-c40982" y
     "donantes-maria-de-los-angeles-rodriguez-9f03de" son el mismo campo.
     Recortarla no es opción — una dirección a medias no lleva a ningún lado. */
  let cuerpoUrl = M.pie.texto;
  ctx.font = `600 ${cuerpoUrl}px ${fTexto}`;
  while (
    ctx.measureText(url).width > anchoTexto &&
    cuerpoUrl > M.pie.textoMinimo
  ) {
    cuerpoUrl -= 1;
    ctx.font = `600 ${cuerpoUrl}px ${fTexto}`;
  }
  ctx.fillStyle = C.acento;
  ctx.fillText(url, xTexto, yPie + 96 + M.pie.texto + 16);

  // ------------------------------------------------------------ Salida
  return new Promise<Blob>((resolver, rechazar) => {
    cv.toBlob(
      (b) => (b ? resolver(b) : rechazar(new Error("No se pudo generar la imagen."))),
      "image/png",
    );
  });
}

/** Nombre del archivo con el que se descarga. */
export function nombreArchivo(d: DatosPlaca): string {
  const limpio = d.nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `donakit-${limpio || d.slug}-1x1.png`;
}
