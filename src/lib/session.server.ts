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
  /**
   * `UserAdminDTO.collaborator?.clientId` — só presente pra usuário externo
   * (ele próprio é um `Collaborator`). Persistido aqui porque `UserDetailDTO`
   * (`/api/profile/me`, fonte de `useUser()`) não expõe `collaborator` — ver
   * specs/09-client-area/spec.md §8/D1. `undefined` pra usuário Internal.
   */
  clientId?: string;
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
  // `useSession` é utilitário server-only do TanStack Start (lê/escreve
  // cookie selado), não um hook React de verdade — o nome `useXxx` é só
  // convenção da lib, sem depender de render/componente. Falso positivo
  // do eslint-plugin-react-hooks, que não distingue a origem.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const session = await useSession<SessionData>(SESSION_CONFIG);
  const data = session.data;
  if (!data?.accessToken || !data.expiresAt || isExpired(data.expiresAt)) {
    return null;
  }
  return data as SessionData;
}

export async function writeServerSession(data: SessionData): Promise<void> {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- ver readServerSession acima
  const session = await useSession<SessionData>(SESSION_CONFIG);
  await session.update(data);
}

export async function clearServerSession(): Promise<void> {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- ver readServerSession acima
  const session = await useSession<SessionData>(SESSION_CONFIG);
  await session.clear();
}
