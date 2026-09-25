import { useState } from "react";
import { useForm } from "react-hook-form";
import { Spinner } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";

import {
  useDeleteApiClientIdAvatar,
  usePatchApiClientIdAvatar,
} from "@/api/generated/endpoints/client/client";
import type { FileDTO } from "@/api/generated/model";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { InputAvatar } from "@/layouts/Form/Fields/Index";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { invalidateClientQueries } from "@/lib/queries/client-avatar";
import { useT } from "@/lib/ui-prefs";
import {
  CLIENT_AVATAR_ACCEPT,
  CLIENT_AVATAR_MAX_SIZE,
  clientInitials,
} from "./client-avatar-utils";

type AvatarForm = { avatarFile: File | null };

type ClientAvatarFieldProps = {
  /** Sem `clientId` (cliente ainda não criado) o arquivo fica pendente — ver `onPendingFileChange`. */
  clientId?: string;
  name: string;
  avatarFile: FileDTO | null;
  readOnly?: boolean;
  /** Modo criar (SPEC-101 RF5): recebe o arquivo escolhido pra quem cria o cliente enviar depois. */
  onPendingFileChange?: (file: File | null) => void;
  /** Avatar salvo/removido no Core — quem abriu a tela atualiza o próprio estado. */
  onAvatarChange?: (avatarFile: FileDTO | null) => void;
  /** Core recusou com 403 (externo sem permissão, SPEC-101 RF6). */
  onForbidden?: () => void;
};

/**
 * Avatar/logo do Cliente (SPEC-101) — upload e remoção imediatos em
 * `/api/client/{id}/avatar`, mesmo padrão do avatar do `profile-modal`
 * (independente do "Salvar" do formulário de dados). Erro de rede/Core já
 * vira toast no interceptor do `mutator.ts`; aqui só o toast de sucesso.
 */
export function ClientAvatarField({
  clientId,
  name,
  avatarFile,
  readOnly = false,
  onPendingFileChange,
  onAvatarChange,
  onForbidden,
}: ClientAvatarFieldProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const form = useForm<AvatarForm>({ defaultValues: { avatarFile: null } });
  const [confirmRemove, setConfirmRemove] = useState(false);

  const handleError = (error: unknown) => {
    form.setValue("avatarFile", null);
    if (isAxiosError(error) && error.response?.status === 403) onForbidden?.();
  };

  const upload = usePatchApiClientIdAvatar({
    mutation: {
      onSuccess: async (saved) => {
        form.setValue("avatarFile", null);
        onAvatarChange?.(saved);
        toast.success(t("clientAvatar.saved"));
        await invalidateClientQueries(queryClient);
      },
      onError: handleError,
    },
  });

  const remove = useDeleteApiClientIdAvatar({
    mutation: {
      onSuccess: async () => {
        onAvatarChange?.(null);
        toast.success(t("clientAvatar.removed"));
        await invalidateClientQueries(queryClient);
      },
      onError: handleError,
    },
  });

  const handleSelected = (file: File) => {
    if (!clientId) {
      onPendingFileChange?.(file);
      return;
    }
    upload.mutate({ id: clientId, data: { avatarFile: file } });
  };

  const handleRemove = () => {
    // Arquivo só pendente (modo criar) → descarta local, sem chamar o Core.
    if (!clientId) {
      form.setValue("avatarFile", null);
      onPendingFileChange?.(null);
      return;
    }
    setConfirmRemove(true);
  };

  const busy = upload.isPending || remove.isPending;

  return (
    <div className="d-flex align-items-center gap-3 mb-4">
      <InputAvatar
        methods={form}
        fieldName="avatarFile"
        previewUrl={resolveAvatarUrl(avatarFile)}
        initials={clientInitials(name)}
        config={{ label: t("clientAvatar.label") }}
        changeLabel={t("clientAvatar.change")}
        selectLabel={t("clientAvatar.select")}
        onFileSelected={handleSelected}
        onRemove={handleRemove}
        maxSizeBytes={CLIENT_AVATAR_MAX_SIZE}
        maxSizeMessage={t("clientAvatar.tooLarge")}
        accept={CLIENT_AVATAR_ACCEPT}
        readOnly={readOnly || busy}
        xs="auto"
      />
      <div className="overflow-hidden flex-grow-1">
        <div className="fw-semibold text-truncate">{name || t("clientAvatar.label")}</div>
        {readOnly ? null : (
          <div className="small text-body-secondary mt-1">
            <i className="bi bi-info-circle me-1" aria-hidden />
            {t("clientAvatar.hint")}
          </div>
        )}
        {busy ? (
          <div className="small text-body-secondary mt-2">
            <Spinner size="sm" animation="border" className="me-2" />
            {t("clientAvatar.uploading")}
          </div>
        ) : null}
      </div>

      {confirmRemove ? (
        <ConfirmationModal
          show
          title={t("clientAvatar.removeTitle")}
          message={t("clientAvatar.removeMessage", { name })}
          variant="danger"
          onConfirm={async () => {
            setConfirmRemove(false);
            if (clientId) await remove.mutateAsync({ id: clientId }).catch(() => undefined);
          }}
          onCancel={() => setConfirmRemove(false)}
        />
      ) : null}
    </div>
  );
}
