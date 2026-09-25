/** Mesmos limites do Core SPEC-57 (§3.3) — o Core continua sendo quem valida de verdade. */
export const CLIENT_AVATAR_MAX_SIZE = 5 * 1024 * 1024;
export const CLIENT_AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

/** Iniciais do nome do cliente (primeira letra do primeiro + último nome). */
export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
