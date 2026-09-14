import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { logoutFn } from "@/lib/auth-fns";
import { useT } from "@/lib/ui-prefs";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

/**
 * Botão flutuante (estilo "bolha" do WhatsApp, canto inferior direito),
 * presente em todas as páginas — utilitário de desenvolvimento pra limpar
 * `localStorage`/`sessionStorage`/cookies/cache do React Query de uma vez,
 * sem precisar abrir o DevTools manualmente (útil depurando cache velho de
 * SSR, ver SPEC-10).
 *
 * Só renderiza em dev (`import.meta.env.DEV`) — nunca aparece em produção,
 * decisão do agente: expor "apagar todos os meus dados" pra usuário final
 * de um portal de negócio seria uma escolha de UX/segurança arriscada e não
 * foi pedida; se quiser em produção também, é um ajuste de uma linha aqui.
 */
export function DevClearCacheButton() {
  const t = useT();
  const queryClient = useQueryClient();
  const [show, setShow] = useState(false);

  if (!import.meta.env.DEV) return null;

  const handleConfirm = async () => {
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
    setShow(false);
    window.location.reload();
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-danger rounded-circle shadow d-flex align-items-center justify-content-center position-fixed"
        style={{ bottom: "1.5rem", right: "1.5rem", width: 56, height: 56, zIndex: 1050 }}
        aria-label={t("devTools.clearCacheButton")}
        title={t("devTools.clearCacheButton")}
        onClick={() => setShow(true)}
      >
        <i className="bi bi-eraser-fill fs-4" aria-hidden />
      </button>

      <ConfirmationModal
        show={show}
        title={t("devTools.clearCacheTitle")}
        message={t("devTools.clearCacheMessage")}
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setShow(false)}
      />
    </>
  );
}
