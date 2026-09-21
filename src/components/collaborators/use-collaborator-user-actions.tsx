import { useState, type ReactNode } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "react-toastify";

import {
  usePatchApiUserIdActivate,
  usePatchApiUserIdDeactivate,
  usePostApiUserIdResetPassword,
} from "@/api/generated/endpoints/user/user";
import type { CollaboratorDTO } from "@/api/generated/model";
import type { CrudRowExtraAction } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useT } from "@/lib/ui-prefs";

/**
 * Ações de usuário do colaborador no menu da linha — "Resetar senha" e
 * "Ativar/Desativar" (conforme `user.isActive`), via `/api/user/{id}/
 * reset-password|activate|deactivate` do Core. Devolve os `extraActions`
 * pro `CrudRowActions` e o `dialog` (confirmação do reset) pra renderizar
 * na tela. `invalidateKey` é a query da listagem, refeita após ativar/desativar.
 * Erro de API já vira toast pelo interceptor global do `mutator`.
 */
export function useCollaboratorUserActions(invalidateKey: QueryKey) {
  const t = useT();
  const queryClient = useQueryClient();
  const [pendingReset, setPendingReset] = useState<CollaboratorDTO | null>(null);

  const resetMutation = usePostApiUserIdResetPassword();
  const activateMutation = usePatchApiUserIdActivate();
  const deactivateMutation = usePatchApiUserIdDeactivate();

  const toggleActive = async (c: CollaboratorDTO) => {
    try {
      if (c.user.isActive) {
        await deactivateMutation.mutateAsync({ id: c.userId });
        toast.success(t("client.collaborators.toast.deactivated"));
      } else {
        await activateMutation.mutateAsync({ id: c.userId });
        toast.success(t("client.collaborators.toast.activated"));
      }
      await queryClient.invalidateQueries({ queryKey: invalidateKey });
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro
    }
  };

  const confirmReset = async () => {
    if (!pendingReset) return;
    try {
      await resetMutation.mutateAsync({ id: pendingReset.userId });
      toast.success(t("client.collaborators.toast.passwordReset"));
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro
    }
    setPendingReset(null);
  };

  const extraActions = (c: CollaboratorDTO): CrudRowExtraAction[] => [
    {
      key: "reset-password",
      icon: "bi-key",
      label: t("client.collaborators.actionResetPassword"),
      onClick: () => setPendingReset(c),
    },
    {
      key: "toggle-active",
      icon: c.user.isActive ? "bi-person-x" : "bi-person-check",
      label: t(
        c.user.isActive
          ? "client.collaborators.actionDeactivate"
          : "client.collaborators.actionActivate",
      ),
      onClick: () => void toggleActive(c),
    },
  ];

  const dialog: ReactNode = pendingReset ? (
    <ConfirmationModal
      show
      title={t("client.collaborators.confirm.resetTitle")}
      message={t("client.collaborators.confirm.resetMessage", {
        name: pendingReset.user.profile.fullName ?? pendingReset.user.userName,
      })}
      onConfirm={confirmReset}
      onCancel={() => setPendingReset(null)}
    />
  ) : null;

  return { extraActions, dialog };
}
