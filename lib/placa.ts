import QRCode from "qrcode";
import { INSTITUCION } from "./institucion";

/* ============================================================================
   US-03/ST-03 — Generador de la placa 1:1 en el navegador
   ----------------------------------------------------------------------------
   Dibuja la placa de 1080×1080 con el canvas nativo. El diseño sigue el
   modelo que propuso Adán (fondo claro, grupo sanguíneo dominante, lista con
   íconos, requisitos y franja institucional con el QR), con tres ajustes:

   - El QR es más grande que en el modelo. Medido: al 15% del ancho deja de
     leerse cuando WhatsApp reduce la imagen; a este tamaño aguanta hasta
     ~640 px con compresión JPEG.
   - La etiqueta de arriba dice cuántos donantes se necesitan cuando el pedido
     lo informa. Si no, dice "Pedido de donación", como en el modelo.
   - Se agrega una fila con la fecha límite cuando existe. El formulario la
     pide; si la placa no la muestra, el dato no sirve para nada.

   POR QUÉ CANVAS Y NO CAPTURAR EL HTML A IMAGEN
   Un capturador de HTML (html2canvas y parientes) es una *aproximación* de
   cómo el navegador dibuja: hay que incrustarle las fuentes aparte, falla con
   bordes redondeados y sombras, y pesa bastante más que esto. Con canvas cada
   medida es exacta y el resultado es el mismo en cualquier navegador.

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
  /** Borde izquierdo y derecho del contenido. */
  x0: 86,
  x1: 994,

  tarjeta: { margen: 36, radio: 32, borde: 2 },

  logo: { gota: 56, texto: 58, base: 142 },
  pill: { texto: 26, alto: 64, padX: 26, gota: 24 },

  grupo: { arriba: 200, alto: 214, radio: 22, etiqueta: 70, valor: 196 },

  lista: {
    /** Línea base de la primera fila. */
    primera: 486,
    /** Línea base máxima de la última fila: abajo están los requisitos. */
    ultima: 742,
    espacioMax: 72,
    icono: 42,
    xIcono: 134,
    xTexto: 204,
    texto: 40,
    textoMinimo: 30,
  },

  requisitos: { arriba: 772, alto: 62, texto: 28, textoMinimo: 22 },

  pie: {
    franja: 970,
    qr: 210,
    qrPad: 12,
    qrX: 72,
    qrAbajo: 16,
    texto: 38,
    textoMinimo: 28,
  },
} as const;

/* Los colores son los tokens del design system. El canvas no lee CSS, así que
   van literales. El token de origen va al lado para que se pueda verificar
   contra globals.css: si alguien cambia la paleta, acá se ve qué tocar. */
const C = {
  fondo: "#f1f5fa", //       --color-navy-50
  tarjeta: "#ffffff", //     --color-surface
  borde: "#e2e8f0", //       --color-border
  bordeFuerte: "#cbd5e1", // --color-ink-300
  rojo: "#a41b33", //        --color-red-700
  rojoSuave: "#fef2f3", //   --color-red-50
  rojoBorde: "#e03e54", //   --color-red-500
  marca: "#1e293b", //       --color-ink-800 (mismo "Dona" que el logo web)
  texto: "#0f172a", //       --color-text-primary
  textoSuave: "#334155", //  --color-ink-700
  icono: "#1d2e48", //       --color-navy-800
  franja: "#1d2e48", //      --color-navy-800
  blanco: "#ffffff",
  qrOscuro: "#0f172a", //    --color-ink-900: el QR lo leen cámaras, no personas
} as const;

/* ------------------------------------------------------------------ Íconos */

/* Los mismos íconos que usa la web (lucide-react, licencia ISC), copiados
   como trazos para dibujarlos en el canvas. Coordenadas en una grilla de
   24×24, igual que en la librería. */
type Trazo =
  | { d: string }
  | { c: [number, number, number] }
  | { r: [number, number, number, number, number] }; // x, y, ancho, alto, radio

const ICONOS = {
  paciente: [
    { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" },
    { c: [12, 7, 4] },
  ],
  hospital: [
    { d: "M12 7v4" },
    { d: "M14 21v-3a2 2 0 0 0-4 0v3" },
    { d: "M14 9h-4" },
    { d: "M18 11h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2" },
    { d: "M18 21V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16" },
  ],
  sede: [
    { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" },
    { c: [12, 10, 3] },
  ],
  horario: [{ c: [12, 12, 10] }, { d: "M12 6v6l4 2" }],
  fecha: [
    { d: "M16 14v2.2l1.6 1" },
    { d: "M16 2v3" },
    { d: "M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338" },
    { d: "M3 9h5.859" },
    { d: "M8 2v3" },
    { c: [16, 16, 6] },
  ],
  requisitos: [
    { r: [8, 2, 8, 4, 1] },
    { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" },
    { d: "m9 14 2 2 4-4" },
  ],
} satisfies Record<string, Trazo[]>;

const GOTA =
  "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z";

function dibujarIcono(
  ctx: CanvasRenderingContext2D,
  trazos: Trazo[],
  x: number,
  y: number,
  lado: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lado / 24, lado / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const t of trazos) {
    if ("d" in t) {
      ctx.stroke(new Path2D(t.d));
    } else if ("c" in t) {
      ctx.beginPath();
      ctx.arc(t.c[0], t.c[1], t.c[2], 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.roundRect(t.r[0], t.r[1], t.r[2], t.r[3], t.r[4]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** La gota del logo, rellena. Su caja útil es ~14×20 dentro de la grilla. */
function dibujarGota(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alto: number,
  color: string,
) {
  const s = alto / 20;
  ctx.save();
  ctx.translate(x - 5 * s, y - 2 * s);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(GOTA));
  ctx.restore();
  return 14 * s; // ancho dibujado
}

/* ------------------------------------------------------------- Tipografías */

/* next/font registra las fuentes y expone el nombre de la familia en una
   variable CSS. Se lee de ahí en vez de escribir "Outfit" a mano: el nombre
   lo decide Next, no nosotros, y cuando el canvas no encuentra la familia no
   avisa — dibuja con la de reserva y sigue. */
function familiaDe(variable: string, respaldo: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return v === "" ? respaldo : v;
}

/** `document.fonts.load` quiere una familia sola, no una lista. */
function primeraFamilia(lista: string): string {
  return lista.split(",")[0].trim();
}

/* ------------------------------------------------------------------ Apoyo */

/**
 * Elige el cuerpo más grande, entre `max` y `min`, con el que `texto` entra
 * en `ancho`. Si ni al mínimo entra, lo recorta con puntos suspensivos.
 * Deja `ctx.font` configurado y devuelve el texto a dibujar.
 */
function ajustar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  ancho: number,
  max: number,
  min: number,
  fuente: (cuerpo: number) => string,
): string {
  let cuerpo = max;
  ctx.font = fuente(cuerpo);
  while (ctx.measureText(texto).width > ancho && cuerpo > min) {
    cuerpo -= 1;
    ctx.font = fuente(cuerpo);
  }
  if (ctx.measureText(texto).width <= ancho) return texto;

  let recorte = texto;
  while (recorte.length > 1 && ctx.measureText(`${recorte}…`).width > ancho) {
    recorte = recorte.slice(0, -1);
  }
  return `${recorte.trimEnd()}…`;
}

function rectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** `AAAA-MM-DD` a `DD/MM`, o `DD/MM/AA` si cae en otro año. */
function formatearFecha(iso: string): string {
  const [a, m, d] = iso.split("-");
  const esteAnio = new Date().getFullYear().toString();
  return a === esteAnio ? `${d}/${m}` : `${d}/${m}/${a.slice(2)}`;
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
    document.fonts.load(`700 ${M.lista.texto}px ${primeraFamilia(fTexto)}`),
    document.fonts.load(`400 ${M.lista.texto}px ${primeraFamilia(fTexto)}`),
  ]);

  const cv = document.createElement("canvas");
  cv.width = M.lienzo;
  cv.height = M.lienzo;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió crear el lienzo.");
  ctx.textBaseline = "alphabetic";

  const ancho = M.x1 - M.x0;

  // ------------------------------------------------------- Fondo y tarjeta
  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, M.lienzo, M.lienzo);

  const t = M.tarjeta.margen;
  rectRedondeado(ctx, t, t, M.lienzo - t * 2, M.lienzo, M.tarjeta.radio);
  ctx.fillStyle = C.tarjeta;
  ctx.fill();
  ctx.lineWidth = M.tarjeta.borde;
  ctx.strokeStyle = C.borde;
  ctx.stroke();

  // ------------------------------------------------------------- Logo
  const anchoGota = dibujarGota(
    ctx,
    M.x0,
    M.logo.base - M.logo.gota + 6,
    M.logo.gota,
    C.rojo,
  );
  const xMarca = M.x0 + anchoGota + 14;
  ctx.font = `700 ${M.logo.texto}px ${fTitulo}`;
  ctx.fillStyle = C.marca;
  ctx.fillText("Dona", xMarca, M.logo.base);
  ctx.fillStyle = C.rojo;
  ctx.fillText("Kit", xMarca + ctx.measureText("Dona").width, M.logo.base);

  // ------------------------------------------------- Etiqueta de pedido
  const etiqueta =
    d.donantes && d.donantes > 0
      ? `SE NECESITAN ${d.donantes} DONANTES`
      : "PEDIDO DE DONACIÓN";
  ctx.font = `700 ${M.pill.texto}px ${fTexto}`;
  const anchoEtq = ctx.measureText(etiqueta).width;
  const anchoPill = M.pill.padX * 2 + M.pill.gota * 0.7 + 12 + anchoEtq;
  const xPill = M.x1 - anchoPill;
  const yPill = M.logo.base - M.logo.texto * 0.5 - M.pill.alto / 2 + 4;

  rectRedondeado(ctx, xPill, yPill, anchoPill, M.pill.alto, M.pill.alto / 2);
  ctx.fillStyle = C.rojoSuave;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = C.rojoBorde;
  ctx.stroke();

  const anchoGotita = dibujarGota(
    ctx,
    xPill + M.pill.padX,
    yPill + (M.pill.alto - M.pill.gota) / 2,
    M.pill.gota,
    C.rojo,
  );
  ctx.fillStyle = C.rojo;
  ctx.fillText(
    etiqueta,
    xPill + M.pill.padX + anchoGotita + 12,
    yPill + M.pill.alto / 2 + M.pill.texto * 0.36,
  );

  // ----------------------------------------------------- Grupo y factor
  const g = M.grupo;
  rectRedondeado(ctx, M.x0, g.arriba, ancho, g.alto, g.radio);
  ctx.fillStyle = C.rojo;
  ctx.fill();

  const medio = g.arriba + g.alto / 2;
  ctx.fillStyle = C.blanco;
  ctx.font = `700 ${g.etiqueta}px ${fTitulo}`;
  ctx.fillText("GRUPO Y", M.x0 + 56, medio - 8);
  ctx.fillText("FACTOR:", M.x0 + 56, medio + g.etiqueta * 0.86);

  // "TODOS" tiene cinco letras y no entra al mismo cuerpo que "0+".
  const valor = d.grupo ?? "TODOS";
  const anchoEtiquetaGrupo = ctx.measureText("FACTOR:").width;
  // 80 px de aire mínimo entre "FACTOR:" y el valor, para que no se lean
  // como una sola palabra.
  const espacioValor = ancho - 56 - anchoEtiquetaGrupo - 80 - 56;
  const valorAjustado = ajustar(
    ctx,
    valor,
    espacioValor,
    valor.length > 3 ? g.valor * 0.66 : g.valor,
    g.valor * 0.45,
    (c) => `700 ${c}px ${fTitulo}`,
  );
  const cuerpoValor = parseFloat(ctx.font.match(/(\d+(\.\d+)?)px/)?.[1] ?? "0");
  ctx.fillText(
    valorAjustado,
    M.x1 - 56 - ctx.measureText(valorAjustado).width,
    medio + cuerpoValor * 0.36,
  );

  // ---------------------------------------------------------- Lista
  /* `alternativa` se usa cuando `texto` no entra ni al cuerpo mínimo: antes
     de cortar el apellido del paciente se saca el "Paciente:", que el ícono
     ya comunica. Un apellido cortado puede hacer que en el hospital no
     encuentren a la persona. */
  type Fila = { icono: Trazo[]; texto: string; negrita: boolean; alternativa?: string };
  const filas: Fila[] = [
    {
      icono: ICONOS.paciente,
      texto: `Paciente: ${d.nombre}`,
      negrita: true,
      alternativa: d.nombre,
    },
    {
      icono: ICONOS.hospital,
      texto: `${INSTITUCION.nombre} - ${INSTITUCION.servicioCorto}`,
      negrita: true,
    },
    {
      icono: ICONOS.sede,
      texto: `${INSTITUCION.direccion}, ${INSTITUCION.ciudad}`,
      negrita: false,
    },
  ];
  if (INSTITUCION.horario) {
    filas.push({ icono: ICONOS.horario, texto: INSTITUCION.horario, negrita: false });
  }
  if (d.fecha) {
    filas.push({
      icono: ICONOS.fecha,
      texto: `Donar hasta el ${formatearFecha(d.fecha)}`,
      negrita: false,
    });
  }

  const L = M.lista;
  const espacio = Math.min(
    L.espacioMax,
    filas.length > 1 ? (L.ultima - L.primera) / (filas.length - 1) : L.espacioMax,
  );
  const anchoFila = M.x1 - L.xTexto;

  filas.forEach((f, i) => {
    const base = L.primera + i * espacio;
    dibujarIcono(ctx, f.icono, L.xIcono, base - L.icono * 0.82, L.icono, C.icono);
    const peso = f.negrita ? 700 : 400;
    const fuente = (c: number) => `${peso} ${c}px ${fTexto}`;
    let texto = ajustar(ctx, f.texto, anchoFila, L.texto, L.textoMinimo, fuente);
    if (texto.endsWith("…") && f.alternativa) {
      texto = ajustar(ctx, f.alternativa, anchoFila, L.texto, L.textoMinimo, fuente);
    }
    ctx.fillStyle = f.negrita ? C.texto : C.textoSuave;
    ctx.fillText(texto, L.xTexto, base);
  });

  // ----------------------------------------------------- Requisitos
  const R = M.requisitos;
  const xReq = M.x0 + 30;
  const anchoReq = ancho - 60;
  rectRedondeado(ctx, xReq, R.arriba, anchoReq, R.alto, 14);
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.bordeFuerte;
  ctx.stroke();

  const requisitos = ajustar(
    ctx,
    INSTITUCION.requisitos.join(" · "),
    anchoReq - 48,
    R.texto,
    R.textoMinimo,
    (c) => `500 ${c}px ${fTexto}`,
  );
  ctx.fillStyle = C.textoSuave;
  ctx.fillText(
    requisitos,
    xReq + (anchoReq - ctx.measureText(requisitos).width) / 2,
    R.arriba + R.alto / 2 + 10,
  );

  // ------------------------------------------------------------ Pie
  const P = M.pie;
  ctx.fillStyle = C.franja;
  ctx.fillRect(0, P.franja, M.lienzo, M.lienzo - P.franja);

  /* El QR va sobre una placa blanca con margen propio: sin zona clara
     alrededor muchas cámaras no lo reconocen. */
  const url = `https://donakit.app/c/${d.slug}`;
  const yQr = M.lienzo - P.qrAbajo - P.qr;
  rectRedondeado(ctx, P.qrX, yQr, P.qr, P.qr, 18);
  ctx.fillStyle = C.blanco;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.borde;
  ctx.stroke();

  const lienzoQr = document.createElement("canvas");
  await QRCode.toCanvas(lienzoQr, url, {
    margin: 0,
    width: P.qr - P.qrPad * 2,
    color: { dark: C.qrOscuro, light: C.blanco },
  });
  ctx.drawImage(lienzoQr, P.qrX + P.qrPad, yQr + P.qrPad);

  // "donakit.app" en negrita y el lema en regular, centrados en la franja.
  const xLema = P.qrX + P.qr + 36;
  const anchoLema = M.lienzo - xLema - 48;
  const dominio = "donakit.app";
  const lema = "  ·  Doná sangre, salvá vidas";
  let cuerpoLema: number = P.texto;
  const medirLema = () => {
    ctx.font = `700 ${cuerpoLema}px ${fTexto}`;
    const a = ctx.measureText(dominio).width;
    ctx.font = `400 ${cuerpoLema}px ${fTexto}`;
    return a + ctx.measureText(lema).width;
  };
  while (medirLema() > anchoLema && cuerpoLema > P.textoMinimo) cuerpoLema -= 1;

  const baseLema = P.franja + (M.lienzo - P.franja) / 2 + cuerpoLema * 0.36;
  ctx.fillStyle = C.blanco;
  ctx.font = `700 ${cuerpoLema}px ${fTexto}`;
  ctx.fillText(dominio, xLema, baseLema);
  const anchoDominio = ctx.measureText(dominio).width;
  ctx.font = `400 ${cuerpoLema}px ${fTexto}`;
  ctx.fillText(lema, xLema + anchoDominio, baseLema);

  // ---------------------------------------------------------- Salida
  return new Promise<Blob>((resolver, rechazar) => {
    cv.toBlob(
      (b) => (b ? resolver(b) : rechazar(new Error("No se pudo generar la imagen."))),
      "image/png",
    );
  });
}

/* ============================================================================
   US-04 — Placa vertical 9:16 (1080×1920) para Historias
   ----------------------------------------------------------------------------
   Sigue el modelo vertical de Adán: el grupo arriba en un bloque rojo, una
   tarjeta blanca con los datos y los requisitos, y abajo un QR grande con la
   invitación a escanearlo.

   En una historia el QR se escanea desde otro teléfono o se toca: por eso acá
   es mucho más grande que en la cuadrada, y va acompañado de un texto que
   dice para qué sirve.

   ZONA SEGURA: en Instagram y WhatsApp la historia se ve con la barra de
   progreso y el nombre de la cuenta encima de los primeros ~190 px, y la caja
   de "Enviar mensaje" encima de los últimos ~230 px. Todo el contenido vive
   entre esas dos franjas. En el modelo original el QR quedaba debajo de la
   caja de respuesta, que es justo donde nadie lo puede escanear.
   ========================================================================== */

const V = {
  ancho: 1080,
  alto: 1920,
  x0: 84,
  x1: 996,

  /** Franjas que tapa la interfaz de la app al mostrar la historia. */
  zonaSegura: { arriba: 190, abajo: 1690 },

  logo: { gota: 60, texto: 62, base: 252 },
  pill: { texto: 28, alto: 70, padX: 28, gota: 26 },

  grupo: { arriba: 300, alto: 320, radio: 30, padX: 80, etiqueta: 42, valor: 210 },

  tarjeta: { arriba: 660, radio: 30, padY: 64 },
  lista: {
    icono: 48,
    xIcono: 132,
    xTexto: 214,
    texto: 46,
    textoMinimo: 34,
    espacio: 96,
    espacioMinimo: 70,
  },
  requisitos: { titulo: 30, texto: 38, interlineado: 50 },

  /** El QR se apoya sobre el borde inferior de la zona segura. */
  pie: { qrArriba: 1690 - 330, qr: 330, qrPad: 22, texto: 42 },
} as const;

/** Arma las líneas de requisitos cortando entre ítems, nunca a mitad de uno. */
function lineasDeRequisitos(
  ctx: CanvasRenderingContext2D,
  items: readonly string[],
  ancho: number,
): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const item of items) {
    const prueba = actual ? `${actual} · ${item}` : item;
    if (!actual || ctx.measureText(prueba).width <= ancho) {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = item;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export async function generarPlaca916(d: DatosPlaca): Promise<Blob> {
  if (typeof window === "undefined") {
    throw new Error("La placa se genera en el navegador, no en el servidor.");
  }

  const fTitulo = familiaDe("--font-outfit", "sans-serif");
  const fTexto = familiaDe("--font-inter", "sans-serif");
  await Promise.all([
    document.fonts.load(`700 ${V.grupo.valor}px ${primeraFamilia(fTitulo)}`),
    document.fonts.load(`700 ${V.lista.texto}px ${primeraFamilia(fTexto)}`),
    document.fonts.load(`400 ${V.lista.texto}px ${primeraFamilia(fTexto)}`),
  ]);

  const cv = document.createElement("canvas");
  cv.width = V.ancho;
  cv.height = V.alto;
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió crear el lienzo.");
  ctx.textBaseline = "alphabetic";

  const ancho = V.x1 - V.x0;

  // ---------------------------------------------------------------- Fondo
  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, V.ancho, V.alto);

  // ----------------------------------------------------------------- Logo
  const anchoGota = dibujarGota(ctx, V.x0, V.logo.base - V.logo.gota + 6, V.logo.gota, C.rojo);
  const xMarca = V.x0 + anchoGota + 16;
  ctx.font = `700 ${V.logo.texto}px ${fTitulo}`;
  ctx.fillStyle = C.marca;
  ctx.fillText("Dona", xMarca, V.logo.base);
  ctx.fillStyle = C.rojo;
  ctx.fillText("Kit", xMarca + ctx.measureText("Dona").width, V.logo.base);

  // ------------------------------------------------------------- Etiqueta
  const etiqueta =
    d.donantes && d.donantes > 0
      ? `SE NECESITAN ${d.donantes} DONANTES`
      : "PEDIDO DE DONACIÓN";
  ctx.font = `700 ${V.pill.texto}px ${fTexto}`;
  const anchoPill =
    V.pill.padX * 2 + V.pill.gota * 0.7 + 12 + ctx.measureText(etiqueta).width;
  const xPill = V.x1 - anchoPill;
  const yPill = V.logo.base - V.logo.texto * 0.5 - V.pill.alto / 2 + 4;
  rectRedondeado(ctx, xPill, yPill, anchoPill, V.pill.alto, V.pill.alto / 2);
  ctx.fillStyle = C.rojoSuave;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = C.rojoBorde;
  ctx.stroke();
  const anchoGotita = dibujarGota(
    ctx,
    xPill + V.pill.padX,
    yPill + (V.pill.alto - V.pill.gota) / 2,
    V.pill.gota,
    C.rojo,
  );
  ctx.fillStyle = C.rojo;
  ctx.fillText(
    etiqueta,
    xPill + V.pill.padX + anchoGotita + 12,
    yPill + V.pill.alto / 2 + V.pill.texto * 0.36,
  );

  // ------------------------------------------------------- Grupo y factor
  const g = V.grupo;
  rectRedondeado(ctx, V.x0, g.arriba, ancho, g.alto, g.radio);
  ctx.fillStyle = C.rojo;
  ctx.fill();

  ctx.fillStyle = C.blanco;
  ctx.font = `700 ${g.etiqueta}px ${fTexto}`;
  ctx.fillText("GRUPO Y FACTOR:", V.x0 + g.padX, g.arriba + 86);

  const valor = ajustar(
    ctx,
    d.grupo ?? "TODOS",
    ancho - g.padX * 2,
    g.valor,
    g.valor * 0.5,
    (c) => `700 ${c}px ${fTitulo}`,
  );
  ctx.fillText(valor, V.x0 + g.padX, g.arriba + g.alto - 52);

  // -------------------------------------------------------- Tarjeta blanca
  /* `alternativa` se usa cuando `texto` no entra ni al cuerpo mínimo: antes
     de cortar el apellido del paciente se saca el "Paciente:", que el ícono
     ya comunica. Un apellido cortado puede hacer que en el hospital no
     encuentren a la persona. */
  type Fila = { icono: Trazo[]; texto: string; negrita: boolean; alternativa?: string };
  const filas: Fila[] = [
    {
      icono: ICONOS.paciente,
      texto: `Paciente: ${d.nombre}`,
      negrita: true,
      alternativa: d.nombre,
    },
    {
      icono: ICONOS.hospital,
      texto: `${INSTITUCION.nombre} - ${INSTITUCION.servicioCorto}`,
      negrita: true,
    },
    {
      icono: ICONOS.sede,
      texto: `${INSTITUCION.direccion}, ${INSTITUCION.ciudad}`,
      negrita: false,
    },
  ];
  if (INSTITUCION.horario) {
    filas.push({ icono: ICONOS.horario, texto: INSTITUCION.horario, negrita: false });
  }
  if (d.fecha) {
    filas.push({
      icono: ICONOS.fecha,
      texto: `Donar hasta el ${formatearFecha(d.fecha)}`,
      negrita: false,
    });
  }

  const L = V.lista;
  const anchoFila = V.x1 - 48 - L.xTexto;
  const R = V.requisitos;

  // Requisitos: se miden antes de dibujar para saber cuánto ocupa la tarjeta.
  ctx.font = `400 ${R.texto}px ${fTexto}`;
  const lineasReq = lineasDeRequisitos(ctx, INSTITUCION.requisitos, anchoFila);

  /* La tarjeta tiene que terminar antes del QR. Si con cinco filas y tres
     líneas de requisitos no entra, se acorta el espacio entre filas. */
  const limiteTarjeta = V.pie.qrArriba - 40;
  const altoFijo =
    V.tarjeta.padY + L.texto + // primera fila
    56 + R.titulo + 30 + // separador y título de requisitos
    lineasReq.length * R.interlineado + V.tarjeta.padY - 14;
  const espacio = Math.max(
    L.espacioMinimo,
    Math.min(
      L.espacio,
      (limiteTarjeta - V.tarjeta.arriba - altoFijo) / Math.max(1, filas.length - 1),
    ),
  );

  const primeraBase = V.tarjeta.arriba + V.tarjeta.padY + L.texto - 6;
  const ultimaBase = primeraBase + (filas.length - 1) * espacio;
  const ySeparador = ultimaBase + 50;
  const yTitulo = ySeparador + 26 + R.titulo;
  const yPrimerReq = yTitulo + 30 + R.texto;
  const abajoTarjeta = Math.min(
    limiteTarjeta,
    yPrimerReq + (lineasReq.length - 1) * R.interlineado + V.tarjeta.padY - 14,
  );

  rectRedondeado(ctx, V.x0, V.tarjeta.arriba, ancho, abajoTarjeta - V.tarjeta.arriba, V.tarjeta.radio);
  ctx.fillStyle = C.tarjeta;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.borde;
  ctx.stroke();

  filas.forEach((f, i) => {
    const base = primeraBase + i * espacio;
    dibujarIcono(ctx, f.icono, L.xIcono, base - L.icono * 0.82, L.icono, C.icono);
    const peso = f.negrita ? 700 : 400;
    const fuente = (c: number) => `${peso} ${c}px ${fTexto}`;
    let texto = ajustar(ctx, f.texto, anchoFila, L.texto, L.textoMinimo, fuente);
    if (texto.endsWith("…") && f.alternativa) {
      texto = ajustar(ctx, f.alternativa, anchoFila, L.texto, L.textoMinimo, fuente);
    }
    ctx.fillStyle = f.negrita ? C.texto : C.textoSuave;
    ctx.fillText(texto, L.xTexto, base);
  });

  ctx.strokeStyle = C.borde;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(V.x0 + 44, ySeparador);
  ctx.lineTo(V.x1 - 44, ySeparador);
  ctx.stroke();

  ctx.font = `600 ${R.titulo}px ${fTexto}`;
  ctx.fillStyle = C.textoSuave;
  ctx.fillText("Requisitos para donar", V.x0 + 48, yTitulo);

  dibujarIcono(ctx, ICONOS.requisitos, L.xIcono, yPrimerReq - L.icono * 0.82, L.icono, C.icono);
  ctx.font = `400 ${R.texto}px ${fTexto}`;
  ctx.fillStyle = C.texto;
  lineasReq.forEach((linea, i) => {
    ctx.fillText(linea, L.xTexto, yPrimerReq + i * R.interlineado);
  });

  // ------------------------------------------------------------------ Pie
  const P = V.pie;
  rectRedondeado(ctx, V.x0, P.qrArriba, P.qr, P.qr, 28);
  ctx.fillStyle = C.blanco;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.borde;
  ctx.stroke();

  const lienzoQr = document.createElement("canvas");
  await QRCode.toCanvas(lienzoQr, `https://donakit.app/c/${d.slug}`, {
    margin: 0,
    width: P.qr - P.qrPad * 2,
    color: { dark: C.qrOscuro, light: C.blanco },
  });
  ctx.drawImage(lienzoQr, V.x0 + P.qrPad, P.qrArriba + P.qrPad);

  const xDer = V.x0 + P.qr + 48;
  const anchoDer = V.x1 - xDer;

  // "Escaneá" en negrita y el resto en regular, en dos líneas.
  ctx.fillStyle = C.texto;
  ctx.font = `700 ${P.texto}px ${fTexto}`;
  ctx.fillText("Escaneá", xDer, P.qrArriba + 96);
  const anchoEscanea = ctx.measureText("Escaneá ").width;
  ctx.font = `400 ${P.texto}px ${fTexto}`;
  ctx.fillText("para ver", xDer + anchoEscanea, P.qrArriba + 96);
  ctx.fillText(
    ajustar(ctx, "requisitos y cómo llegar", anchoDer, P.texto, 30, (c) => `400 ${c}px ${fTexto}`),
    xDer,
    P.qrArriba + 96 + P.texto + 14,
  );

  // Franja institucional, como cápsula, alineada con el borde inferior del QR.
  const altoCapsula = 84;
  const yCapsula = P.qrArriba + P.qr - altoCapsula;
  rectRedondeado(ctx, xDer, yCapsula, anchoDer, altoCapsula, 18);
  ctx.fillStyle = C.franja;
  ctx.fill();

  const dominio = "donakit.app";
  const lema = " · Doná sangre, salvá vidas";
  let cuerpo = 30;
  const medir = () => {
    ctx.font = `700 ${cuerpo}px ${fTexto}`;
    const a = ctx.measureText(dominio).width;
    ctx.font = `400 ${cuerpo}px ${fTexto}`;
    return a + ctx.measureText(lema).width;
  };
  while (medir() > anchoDer - 40 && cuerpo > 20) cuerpo -= 1;
  const total = medir();
  const xTexto = xDer + (anchoDer - total) / 2;
  const base = yCapsula + altoCapsula / 2 + cuerpo * 0.36;
  ctx.fillStyle = C.blanco;
  ctx.font = `700 ${cuerpo}px ${fTexto}`;
  ctx.fillText(dominio, xTexto, base);
  const anchoDominio = ctx.measureText(dominio).width;
  ctx.font = `400 ${cuerpo}px ${fTexto}`;
  ctx.fillText(lema, xTexto + anchoDominio, base);

  // -------------------------------------------------------------- Salida
  return new Promise<Blob>((resolver, rechazar) => {
    cv.toBlob(
      (b) => (b ? resolver(b) : rechazar(new Error("No se pudo generar la imagen."))),
      "image/png",
    );
  });
}

export type FormatoPlaca = "1x1" | "9x16";

/** Nombre del archivo con el que se descarga. */
export function nombreArchivo(d: DatosPlaca, formato: FormatoPlaca = "1x1"): string {
  const limpio = d.nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `donakit-${limpio || d.slug}-${formato}.png`;
}
