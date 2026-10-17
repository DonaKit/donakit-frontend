import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

/* ============================================================================
   US-006/ST-02 — Tipografía corporativa con next/font
   ----------------------------------------------------------------------------
   next/font descarga las fuentes en build y las sirve desde nuestro dominio.
   No hay pedido a Google en tiempo de ejecución: la página carga más rápido y
   no se filtra la IP del visitante a un tercero.

   Cada fuente expone una variable CSS que globals.css consume en @theme.
   ========================================================================== */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DonaKit",
    template: "%s · DonaKit",
  },
  description:
    "Generá en minutos el kit de difusión para conseguir donantes de sangre: " +
    "una página con toda la información y las placas listas para compartir.",
  openGraph: {
    title: "DonaKit",
    description:
      "Generá en minutos el kit de difusión para conseguir donantes de sangre.",
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface font-sans text-text-primary">
        {children}
      </body>
    </html>
  );
}
