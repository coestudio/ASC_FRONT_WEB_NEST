import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Modal, Nav, Spinner } from "react-bootstrap";
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
type TabKey = "detail" | "address" | "password";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

/**
 * Modal de perfil — 3 abas (Detalhes, Endereço, Senha) + avatar, via
 * `Profile*` gerado (SPEC-02 §3.3). O upload de avatar é multipart
 * (`patchApiProfileAvatar`), disparado assim que um arquivo é selecionado,
 * independente das abas de texto.
 */
export function ProfileModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const t = useT();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("detail");
  const avatarForm = useForm<AvatarForm>({ defaultValues: { avatarFile: null } });
  const avatarMutation = usePatchApiProfileAvatar();

  if (!user) return null;

  const fullName = user.profile?.fullName ?? user.userName;
  const email = user.profile?.email ?? "";
  const initials = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const handleAvatarSelected = async (file: File) => {
    try {
      const updated = await avatarMutation.mutateAsync({ data: { avatarFile: file } });
      queryClient.setQueryData(profileMeQueryOptions().queryKey, updated);
      avatarForm.setValue("avatarFile", null);
      toast.success(t("shell.profileModal.avatarSaved"));
    } catch {
      avatarForm.setValue("avatarFile", null);
      toast.error(t("shell.profileModal.saveError"));
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg" scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="h6 fw-semibold d-flex align-items-center gap-2">
          <i className="bi bi-person" />
          {t("shell.profileModal.title")}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex align-items-center gap-3 mb-4">
          <InputAvatar
            methods={avatarForm}
            fieldName="avatarFile"
            previewUrl={user.profile?.avatarFile?.url ?? null}
            initials={initials}
            config={{ label: t("shell.profileModal.avatar") }}
            changeLabel={t("shell.profileModal.changeAvatar")}
            selectLabel={t("shell.profileModal.selectAvatar")}
            onFileSelected={handleAvatarSelected}
            onRemove={() => avatarForm.setValue("avatarFile", null)}
            maxSizeBytes={MAX_AVATAR_SIZE}
            maxSizeMessage={t("shell.profileModal.avatarTooLarge")}
          />
          <div className="overflow-hidden flex-grow-1">
            <div className="fw-semibold text-truncate">{fullName}</div>
            <div className="small text-body-secondary text-truncate">{email}</div>
            <div className="small text-body-secondary mt-2">
              <i className="bi bi-info-circle me-1" />
              {t("shell.profileModal.avatarHint")}
            </div>
            {avatarMutation.isPending ? (
              <div className="small text-body-secondary mt-2">
                <Spinner size="sm" animation="border" className="me-2" />
                {t("shell.profileModal.uploadingAvatar")}
              </div>
            ) : null}
          </div>
        </div>

        <Nav
          variant="tabs"
          activeKey={tab}
          className="mb-3"
          onSelect={(k) => setTab((k as TabKey) ?? "detail")}
        >
          <Nav.Item>
            <Nav.Link eventKey="detail">
              <i className="bi bi-person-lines me-1" />
              {t("shell.profileModal.detailTab")}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="address">
              <i className="bi bi-geo-alt me-1" />
              {t("shell.profileModal.addressTab")}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="password">
              <i className="bi bi-shield-lock me-1" />
              {t("shell.profileModal.passwordTab")}
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <div className={tab === "detail" ? "" : "d-none"}>
          <DetailTab user={user} />
        </div>
        <div className={tab === "address" ? "" : "d-none"}>
          <AddressTab address={user.address} />
        </div>
        <div className={tab === "password" ? "" : "d-none"}>
          <PasswordTab />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-primary" onClick={onClose}>
          {t("shell.profileModal.cancel")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
