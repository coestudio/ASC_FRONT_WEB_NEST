import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { TranslationKey } from "@/i18n/translate";
import { logoutFn } from "@/lib/auth-fns";
import { isDevToolsEnabled } from "@/lib/dev-tools";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { useT } from "@/lib/ui-prefs";

export type DevToolAction = {
  key: "clearCache" | "debug" | "files";
  icon: string;
  labelKey: TranslationKey;
  onSelect: () => void;
};

/**
 * `/files` do Core — listagem do `wwwroot`, que o Core só liga em
 * Development (`Program/RequestPipeline.cs`, `UseDirectoryBrowser("/files")`).
 * Link direto pro Core (não passa pelo proxy `/api/core`): `VITE_API_URL` é a
 * base pública do Core. Sem a env, a ação não aparece.
 */
const CORE_FILES_URL = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, "")}/files/`
  : null;

/**
 * Ações das ferramentas de desenvolvedor (SPEC-104) — mesma lista no botão
 * flutuante (`DevToolsFab`) e no submenu "Dev mode" do `UserMenu`. Só existe
 * com `VITE_DEVELOPMENT=true` (`isDevToolsEnabled`); fora disso devolve lista
 * vazia. Devolve também o modal de confirmação do "Limpar cache", que quem
 * usa renderiza.
 */
export function useDevTools(): { enabled: boolean; actions: DevToolAction[]; modal: ReactNode } {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmClear, setConfirmClear] = useState(false);

  // Só lê o cache do `profile/me` (nunca busca): o botão flutuante também
  // aparece nas telas de login, onde uma busca real daria 401 e mandaria
  // pro login de novo. `/admin/debug` exige admin — sem admin, some o item.
  const { data: user } = useQuery({ ...profileMeQueryOptions(), enabled: false });
  const isAdmin = !!user?.isAdmin;

  if (!isDevToolsEnabled) return { enabled: false, actions: [], modal: null };

  const handleClearCache = async () => {
    try {
      // Cookie de sessão é httpOnly — não dá pra apagar via document.cookie,
      // precisa da server fn (mesma usada pelo /auth/logout).
      await logoutFn();
    } catch {
      // Segue mesmo se a chamada falhar (ex.: já sem sessão) — o resto da
      // limpeza (storage/cookies não-httpOnly/cache) ainda é útil.
    }
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    queryClient.clear();
    toast.success(t("devTools.clearCacheSuccess"));
    setConfirmClear(false);
    window.location.reload();
  };

  const actions: DevToolAction[] = [
    ...(isAdmin
      ? [
          {
            key: "debug" as const,
            icon: "bi-bug",
            labelKey: "devTools.goToDebug" as TranslationKey,
            onSelect: () => navigate({ to: "/admin/debug" }),
          },
        ]
      : []),
    ...(CORE_FILES_URL
      ? [
          {
            key: "files" as const,
            icon: "bi-folder2-open",
            labelKey: "devTools.openFiles" as TranslationKey,
            onSelect: () => window.open(CORE_FILES_URL, "_blank", "noopener,noreferrer"),
          },
        ]
      : []),
    {
      key: "clearCache",
      icon: "bi-eraser",
      labelKey: "devTools.clearCacheButton",
      onSelect: () => setConfirmClear(true),
    },
  ];

  const modal = (
    <ConfirmationModal
      show={confirmClear}
      title={t("devTools.clearCacheTitle")}
      message={t("devTools.clearCacheMessage")}
      variant="danger"
      onConfirm={handleClearCache}
      onCancel={() => setConfirmClear(false)}
    />
  );

  return { enabled: true, actions, modal };
}
