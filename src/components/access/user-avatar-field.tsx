import { useForm } from "react-hook-form";
import { Spinner } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import {
  getGetApiUserQueryKey,
  usePatchApiUserIdAvatar,
} from "@/api/generated/endpoints/user/user";
import type { FileDTO } from "@/api/generated/model";
import { InputAvatar } from "@/layouts/Form/Fields/Index";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { useT } from "@/lib/ui-prefs";

type AvatarForm = { avatarFile: File | null };

/** Mesmo limite do avatar do perfil (`profile-modal`). */
export const USER_AVATAR_MAX_SIZE = 2 * 1024 * 1024;

type UserAvatarFieldProps = {
  /** Sem `userId` (usuário ainda não criado) o arquivo fica pendente — ver `onPendingFileChange`. */
  userId?: string;
  name: string;
  email?: string | null;
  avatarFile: FileDTO | null;
  readOnly?: boolean;
  /** Modo criar: recebe o arquivo pra quem cria o usuário enviar depois do `POST`. */
  onPendingFileChange?: (file: File | null) => void;
  /** Avatar salvo no Core — quem abriu o modal atualiza o próprio estado. */
  onAvatarChange?: (avatarFile: FileDTO) => void;
};

/**
 * Avatar do usuário no CRUD de Acesso (SPEC-102) — mesmo padrão do
 * `profile-modal`: upload imediato em `PATCH /api/user/{id}/avatar`,
 * independente do "Salvar". O Core não tem rota de remover avatar de
 * usuário, então o "x" só descarta um arquivo ainda pendente (modo criar).
 */
export function UserAvatarField({
  userId,
  name,
  email,
  avatarFile,
  readOnly = false,
  onPendingFileChange,
  onAvatarChange,
}: UserAvatarFieldProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const form = useForm<AvatarForm>({ defaultValues: { avatarFile: null } });

  const upload = usePatchApiUserIdAvatar({
    mutation: {
      onSuccess: async (saved) => {
        form.setValue("avatarFile", null);
        onAvatarChange?.(saved);
        toast.success(t("shell.profileModal.avatarSaved"));
        await queryClient.invalidateQueries({ queryKey: getGetApiUserQueryKey() });
      },
      // interceptor global (mutator.ts) já mostra o toast de erro — só reseta o campo
      onError: () => form.setValue("avatarFile", null),
    },
  });

  const handleSelected = (file: File) => {
    if (!userId) {
      onPendingFileChange?.(file);
      return;
    }
    upload.mutate({ id: userId, data: { avatarFile: file } });
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="d-flex align-items-center gap-3 mb-4">
      <InputAvatar
        methods={form}
        fieldName="avatarFile"
        previewUrl={resolveAvatarUrl(avatarFile)}
        initials={initials}
        config={{ label: t("shell.profileModal.avatar") }}
        changeLabel={t("shell.profileModal.changeAvatar")}
        selectLabel={t("shell.profileModal.selectAvatar")}
        onFileSelected={handleSelected}
        onRemove={
          userId
            ? undefined
            : () => {
                form.setValue("avatarFile", null);
                onPendingFileChange?.(null);
              }
        }
        maxSizeBytes={USER_AVATAR_MAX_SIZE}
        maxSizeMessage={t("shell.profileModal.avatarTooLarge")}
        readOnly={readOnly || upload.isPending}
        xs="auto"
      />
      <div className="overflow-hidden flex-grow-1">
        <div className="fw-semibold text-truncate">{name || t("shell.profileModal.avatar")}</div>
        {email ? <div className="small text-body-secondary text-truncate">{email}</div> : null}
        {readOnly ? null : (
          <div className="small text-body-secondary mt-2">
            <i className="bi bi-info-circle me-1" aria-hidden />
            {t("shell.profileModal.avatarHint")}
          </div>
        )}
        {upload.isPending ? (
          <div className="small text-body-secondary mt-2">
            <Spinner size="sm" animation="border" className="me-2" />
            {t("shell.profileModal.uploadingAvatar")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
