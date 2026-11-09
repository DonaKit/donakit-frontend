import type { Metadata } from "next";
import { Suspense } from "react";
import { CargandoPedido, LandingCampania } from "@/components/landing/landing-campania";

/* ============================================================================
   US-12/ST-01 — Landing pública del pedido: /c/[slug]
   ----------------------------------------------------------------------------
   Es adonde lleva el QR de las placas y el enlace del texto para compartir.
   Pública: no pide cuenta ni contraseña. La puede abrir cualquiera que tenga
   el enlace, que es justamente la idea.

   Los datos se piden desde el navegador y no desde el servidor de Vercel: el
   backend vive en el plan gratuito de Render y la primera consulta después de
   un rato puede tardar ~40 s. Una función de Vercel cortaría a los 10 s y la
   persona vería un error; en el navegador, en cambio, ve un "cargando" que
   explica la demora.

   Suspense: el proyecto usa `cacheComponents`, y con eso Next exige que leer
   `params` (un dato que solo existe al pedir la página) ocurra dentro de un
   <Suspense>. Así Next prepara de antemano el "cargando" y lo manda al
   instante; sin esto el build de producción falla.

   noindex: la página tiene el nombre de un paciente. Se comparte por enlace
   con quien tiene que verla, pero no tiene por qué aparecer en Google.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Pedido de donantes de sangre",
  description:
    "Requisitos, cómo llegar y cómo sacar turno para donar sangre por este pedido.",
  robots: { index: false, follow: false },
};

export default function PaginaCampania({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; from?: string }>;
}) {
  return (
    <Suspense fallback={<CargandoPedido />}>
      <Contenido params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string; from?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const esPreview =
    query?.preview === "true" ||
    query?.from === "admin" ||
    query?.from === "dashboard";

  return <LandingCampania slug={slug} esPreview={esPreview} />;
}
