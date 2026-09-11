import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import { PutApiProfilePasswordBody } from "@/api/generated/zod/profile/profile.zod";
import { usePutApiProfilePassword } from "@/api/generated/endpoints/profile/profile";
import { InputPassword } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";

const passwordSchema = z.object({
  currentPassword: PutApiProfilePasswordBody.shape.currentPassword,
  newPassword: PutApiProfilePasswordBody.shape.newPassword,
  newPasswordConfirm: PutApiProfilePasswordBody.shape.newPasswordConfirm,
});
type PasswordInput = z.infer<typeof passwordSchema>;

/**
 * Aba "Senha" do ProfileModal — PUT /api/profile/password. A comparação
 * "nova senha" === "confirmar" fica fora do schema (regra 2 do AGENTS.md) —
 * validação manual no onSubmit, igual ao passo 3 do forgot-password.
 */
export function PasswordTab() {
  const t = useT();
  const methods = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", newPasswordConfirm: "" },
  });
  const mutation = usePutApiProfilePassword();

  const onSubmit = methods.handleSubmit(async (data) => {
    if (data.newPassword !== data.newPasswordConfirm) {
      methods.setError("newPasswordConfirm", { message: t("auth.passwordsDontMatch") });
      return;
    }
    try {
      await mutation.mutateAsync({ data });
      methods.reset({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      toast.success(t("shell.profileModal.saved"));
    } catch {
      toast.error(t("shell.profileModal.saveError"));
    }
  });

  return (
    <Form noValidate onSubmit={onSubmit}>
      <InputPassword
        methods={methods}
        fieldName="currentPassword"
        label={t("shell.profileModal.currentPassword")}
        md={12}
      />
      <InputPassword
        methods={methods}
        fieldName="newPassword"
        label={t("shell.profileModal.newPassword")}
        md={6}
      />
      <InputPassword
        methods={methods}
        fieldName="newPasswordConfirm"
        label={t("shell.profileModal.confirmPassword")}
        md={6}
      />
      <div className="d-flex justify-content-end mt-3">
        <Button type="submit" disabled={methods.formState.isSubmitting}>
          {methods.formState.isSubmitting ? (
            <Spinner size="sm" animation="border" className="me-2" />
          ) : null}
          {t("shell.profileModal.save")}
        </Button>
      </div>
    </Form>
  );
}
