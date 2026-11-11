import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-auth";
import { getAdminJwtSecret, signAdminJwt } from "@/lib/admin-jwt.server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
};

/**
 * GET /api/admin/token
 * Emite un JWT HS256 de corta duración para que el panel administrativo en el cliente
 * pueda autenticarse directamente contra el backend en NestJS sin timeout intermedio.
 */
export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json(
      { error: "No autenticado." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: "Acceso denegado: tu cuenta no está autorizada." },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  if (!getAdminJwtSecret()) {
    console.error(
      "[api/admin/token] JWT_SECRET (ni AUTH_SECRET) está configurado en el servidor.",
    );
    return NextResponse.json(
      { error: "Error de configuración de autenticación en el servidor." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  const signed = signAdminJwt({
    email,
    name: session.user?.name,
  });

  return NextResponse.json(signed, {
    status: 200,
    headers: NO_STORE_HEADERS,
  });
}

