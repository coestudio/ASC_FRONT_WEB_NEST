import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Spinner } from "react-bootstrap";
import { z } from "zod";

import { PostApiProfileMeBody } from "@/api/generated/zod/profile/profile.zod";
import { usePostApiProfileMe } from "@/api/generated/endpoints/profile/profile";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { InputText, InputEmail, InputDate } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";
import type { UserDetailDTO } from "@/api/generated/model";

const detailSchema = z.object({
  userName: PostApiProfileMeBody.shape.userName,
  fullName: PostApiProfileMeBody.shape.profile.shape.fullName,
  document: PostApiProfileMeBody.shape.profile.shape.document,
  email: PostApiProfileMeBody.shape.profile.shape.email,
  phone: PostApiProfileMeBody.shape.profile.shape.phone,
  birthDate: PostApiProfileMeBody.shape.profile.shape.birthDate,
});
type DetailInput = z.infer<typeof detailSchema>;

/** Aba "Detalhes" do ProfileModal — POST /api/profile/me. */
export function DetailTab({ user }: { user: UserDetailDTO }) {
  const t = useT();
  const queryClient = useQueryClient();
  const methods = useForm<DetailInput>({
    resolver: zodResolver(detailSchema),
    defaultValues: {
      userName: user.userName,
      fullName: user.profile.fullName ?? "",
      document: user.profile.document ?? "",
      email: user.profile.email ?? "",
      phone: user.profile.phone ?? "",
      birthDate: user.profile.birthDate ?? "",
    },
  });
  const mutation = usePostApiProfileMe();

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      const updated = await mutation.mutateAsync({
        data: {
          userName: data.userName,
          profile: {
            fullName: data.fullName,
            document: data.document || null,
            email: data.email,
            phone: data.phone || null,
            birthDate: data.birthDate || null,
          },
        },
      });
      queryClient.setQueryData(profileMeQueryOptions().queryKey, updated);
      toast.success(t("shell.profileModal.saved"));
    } catch {
      toast.error(t("shell.profileModal.saveError"));
    }
  });

  return (
    <Form noValidate onSubmit={onSubmit}>
      <InputText
        methods={methods}
        fieldName="fullName"
        label={t("shell.profileModal.fullName")}
        md={12}
      />
      <InputText
        methods={methods}
        fieldName="userName"
        label={t("shell.profileModal.userName")}
        md={6}
      />
      <InputEmail
        methods={methods}
        fieldName="email"
        label={t("shell.profileModal.email")}
        md={6}
      />
      <InputText
        methods={methods}
        fieldName="document"
        label={t("shell.profileModal.document")}
        md={6}
      />
      <InputText methods={methods} fieldName="phone" label={t("shell.profileModal.phone")} md={6} />
      <InputDate
        methods={methods}
        fieldName="birthDate"
        label={t("shell.profileModal.birthDate")}
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
