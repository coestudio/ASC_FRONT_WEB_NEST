"use client";

import { useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

const CHECK_INTERVAL_MS = 30_000; // 30 segundos — mesmo padrão do Portal

/**
 * Verifica periodicamente se o token do Core expirou. Se expirou, faz
 * signOut e redireciona pro login — mesmo que o usuário esteja parado
 * (sem fazer nenhuma request API).
 *
 * Funciona igual ao RequireAuth do Portal:
 * - setInterval a cada 30s checa expiresAt
 * - Se expirou → signOut + redirect /login?toast=expired
 */
export function TokenExpiryChecker() {
  const { data: session } = useSession();
  const expiresAt = session?.expiresAt;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    function check() {
      const expiresAtMs = new Date(expiresAt!).getTime();
      const nowMs = Date.now();
      // Margem de 30s pra não pegar na borda
      if (expiresAtMs - 30_000 <= nowMs) {
        signOut({
          redirect: true,
          callbackUrl: "/login?toast=expired",
        });
      }
    }

    // Checa imediatamente ao montar
    check();

    // E depois a cada 30s
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresAt]);

  return null;
}
