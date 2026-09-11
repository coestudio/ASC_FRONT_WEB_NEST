import { createServerFn } from "@tanstack/react-start";
import axios from "axios";

import { coreClient } from "@/lib/core-client";
import type {
  AuthControllerLoginRequest,
  AuthControllerLoginResponse,
  UserAdminDTO,
  UserDetailDTO,
} from "@/api/generated/model";
import { readServerSession, writeServerSession, clearServerSession } from "@/lib/session.server";
import { getRequestLocale } from "@/lib/locale.server";

/**
 * Server functions de auth. Ver specs/auth-httponly-cookie-bff.md §9.
 * Chamam o Core direto (server→server, sem passar pelo browser) e selam a
 * sessão no cookie httpOnly.
 */

function coreErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    const msg =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.title === "string" && data.title) ||
      (typeof data?.error === "string" && data.error);
    if (msg) return msg;
    if (err.response?.status === 401) return "Usuário ou senha inválidos.";
  }
  return fallback;
}

/** POST /api/auth/login no Core → sela o cookie → devolve só `{ user }`. */
export const loginFn = createServerFn({ method: "POST" })
  .validator((data: AuthControllerLoginRequest) => data)
  .handler(async ({ data }): Promise<{ user: UserAdminDTO }> => {
    let res;
    try {
      res = await coreClient.post<AuthControllerLoginResponse>("/api/auth/login", data, {
        headers: { "x-locale": getRequestLocale() },
      });
    } catch (err) {
      throw new Error(coreErrorMessage(err, "Não foi possível entrar. Tente novamente."));
    }
    const { user, tokenData } = res.data;
    await writeServerSession({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken ?? null,
      expiresAt: tokenData.expiresAt,
      userId: user.id,
    });
    return { user };
  });

/** Limpa o cookie. Sem chamada ao Core (não há endpoint de logout). */
export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await clearServerSession();
});

/** Checagem barata do cookie para o guard de rota (não chama o Core). */
export const isAuthedFn = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  return (await readServerSession()) !== null;
});

/**
 * Identidade fresca do usuário para o SSR seedar o cache do React Query.
 * `null` se não há sessão ou o Core recusa. Ver __root.loader.
 */
export const fetchMeFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserDetailDTO | null> => {
    const session = await readServerSession();
    if (!session) return null;
    try {
      const res = await coreClient.get<UserDetailDTO>("/api/profile/me", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "x-locale": getRequestLocale(),
        },
      });
      return res.data;
    } catch {
      return null;
    }
  },
);
