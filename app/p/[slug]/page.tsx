import { Suspense } from "react";
import { redirect } from "next/navigation";

/* US-12/ST-01 nombra la ruta como /p/[slug]; las placas usan /c/[slug]. Esta
   redirección hace que las dos funcionen: si alguien arma un enlace con /p/,
   llega igual a la misma landing.

   Suspense por el mismo motivo que en /c/[slug]: con `cacheComponents`, leer
   `params` fuera de un <Suspense> hace fallar el build. */
export default function RedirigirACampania({ params }: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Redirigir params={params} />
    </Suspense>
  );
}

async function Redirigir({ params }: { params: PageProps<"/p/[slug]">["params"] }) {
  const { slug } = await params;
  return redirect(`/c/${encodeURIComponent(slug)}`);
}
