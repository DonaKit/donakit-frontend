import { createHmac } from "node:crypto";

export interface SignAdminJwtInput {
  email: string;
  name?: string | null;
  ttlSeconds?: number;
}

export interface SignedAdminJwtResult {
  token: string;
  expiresAt: number;
}

/**
 * Obtiene el secreto compartido para firmar tokens HS256 hacia el backend NestJS.
 * Prioriza `JWT_SECRET` y utiliza `AUTH_SECRET` como respaldo si comparten el mismo valor.
 */
export function getAdminJwtSecret(): string {
  return process.env.JWT_SECRET?.trim() || process.env.AUTH_SECRET?.trim() || "";
}

/**
 * Emite un JWT HS256 estándar de corta duración consumible por AdminAuthGuard en NestJS.
 * (Auth.js v5 cifra sus cookies de sesión como JWE, por lo que no pueden enviarse directo al backend).
 */
export function signAdminJwt(input: SignAdminJwtInput): SignedAdminJwtResult {
  const secret = getAdminJwtSecret();
  if (!secret) {
    throw new Error(
      "Falta configurar JWT_SECRET (o AUTH_SECRET) en las variables de entorno del servidor.",
    );
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("El email del usuario autenticado es obligatorio.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlSeconds = input.ttlSeconds ?? 300;
  const expSeconds = nowSeconds + ttlSeconds;

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: normalizedEmail,
    email: normalizedEmail,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    role: "ADMIN",
    iss: "donakit-frontend",
    aud: "donakit-backend",
    iat: nowSeconds,
    exp: expSeconds,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");

  return {
    token: `${signingInput}.${signature}`,
    expiresAt: expSeconds * 1000,
  };
}

