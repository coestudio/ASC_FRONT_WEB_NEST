import { useSession } from "@tanstack/react-start/server";

/**
 * Sessão do Portal — cookie httpOnly selado (AES + SHA-256 via `useSession`).
 * Server-only. Ver specs/auth-httponly-cookie-bff.md.
 *
 * O browser nunca vê o conteúdo: só um blob opaco. O `accessToken` do Core
 * (JWT) vai selado aqui; o proxy /api/core (fase 2) lê daqui e anexa o Bearer.
 */

export interface SessionData {
  accessToken: string;
  refreshToken: string | null;
  /** ISO — do `TokenData.expiresAt` do Core. */
  expiresAt: string;
  /** `UserAdminDTO.id` — para revalidar via /api/profile/me. */
  userId: string;
}

const password = process.env.SESSION_SECRET;
if (!password || password.length < 32) {
  throw new Error(
    "SESSION_SECRET ausente ou com menos de 32 chars — ver .env.exemple " +
      "(gerar com: openssl rand -base64 48).",
  );
}

const SESSION_CONFIG = {
  password,
  name: "asc_session",
  // Vida do cookie; a expiração real é o `expiresAt` do token (checado abaixo).
  maxAge: 60 * 60 * 12,
  cookie: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: import.meta.env.PROD,
    path: "/",
  },
};

/** Margem de segurança para considerar o token expirado. */
const EXPIRY_SKEW_MS = 30_000;

export function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() - EXPIRY_SKEW_MS <= Date.now();
}

/** Sessão válida (existe e não expirou) ou `null`. */
export async function readServerSession(): Promise<SessionData | null> {
  const session = await useSession<SessionData>(SESSION_CONFIG);
  const data = session.data;
  if (!data?.accessToken || !data.expiresAt || isExpired(data.expiresAt)) {
    return null;
  }
  return data as SessionData;
}

export async function writeServerSession(data: SessionData): Promise<void> {
  const session = await useSession<SessionData>(SESSION_CONFIG);
  await session.update(data);
}

export async function clearServerSession(): Promise<void> {
  const session = await useSession<SessionData>(SESSION_CONFIG);
  await session.clear();
}
