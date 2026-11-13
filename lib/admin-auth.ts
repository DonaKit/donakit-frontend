/**
 * Utilidades puras (compatibles con Edge y Node) para validar la whitelist de administradores.
 */
export function parseAdminEmails(raw = process.env.ADMIN_EMAILS ?? ""): string[] {
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return parseAdminEmails().includes(normalized);
}

