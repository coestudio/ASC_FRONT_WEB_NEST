import { useForm } from "react-hook-form";
import { Modal, Tab, Tabs } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import { usePatchApiProfileAvatar } from "@/api/generated/endpoints/profile/profile";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { useUser } from "@/hooks";
import { useT } from "@/lib/ui-prefs";
import { InputAvatar } from "@/layouts/Form/Fields/Index";
import { DetailTab } from "./detail-tab";
import { AddressTab } from "./address-tab";
import { PasswordTab } from "./password-tab";

type AvatarForm = { avatarFile: File | null };

/**
 * Modal de perfil — 3 abas (Detalhes, Endereço, Senha) + avatar, via
 * `Profile*` gerado (SPEC-02 §3.3). O upload de avatar é multipart
 * (`patchApiProfileAvatar`), independente das abas de texto.
 */
export function ProfileModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const t = useT();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const avatarForm = useForm<AvatarForm>({ defaultValues: { avatarFile: null } });
  const avatarMutation = usePatchApiProfileAvatar();

  const avatarFile = avatarForm.watch("avatarFile");

  if (!user) return null;

  const fullName = user.profile?.fullName ?? user.userName;
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const handleAvatarChange = async (file: File | null) => {
    if (!file) return;
    try {
      const updated = await avatarMutation.mutateAsync({ data: { avatarFile: file } });
      queryClient.setQueryData(profileMeQueryOptions().queryKey, updated);
      toast.success(t("shell.profileModal.avatarSaved"));
    } catch {
      toast.error(t("shell.profileModal.saveError"));
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0">{t("shell.profileModal.title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-center mb-4">
          <InputAvatar
            methods={avatarForm}
            fieldName="avatarFile"
            previewUrl={user.profile?.avatarFile?.url ?? null}
            initials={initials}
            config={{ label: t("shell.profileModal.avatar") }}
          />
        </div>
        {avatarFile ? (
          <div className="d-flex justify-content-center mb-4">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={avatarMutation.isPending}
              onClick={() => handleAvatarChange(avatarFile)}
            >
              {t("shell.profileModal.uploadAvatar")}
            </button>
          </div>
        ) : null}

        <Tabs defaultActiveKey="detail" className="mb-3">
          <Tab eventKey="detail" title={t("shell.profileModal.detailTab")}>
            <DetailTab user={user} />
          </Tab>
          <Tab eventKey="address" title={t("shell.profileModal.addressTab")}>
            <AddressTab address={user.address} />
          </Tab>
          <Tab eventKey="password" title={t("shell.profileModal.passwordTab")}>
            <PasswordTab />
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );
}
