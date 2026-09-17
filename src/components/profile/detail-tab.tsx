import { useEffect } from "react";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Row } from "react-bootstrap";
import { z, type ZodType } from "zod";

import { PostApiProfileMeBody } from "@/api/generated/zod/profile/profile.zod";
import { usePostApiProfileMe } from "@/api/generated/endpoints/profile/profile";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  InputText,
  InputEmail,
  InputDate,
  InputDocument,
  InputPhone,
} from "@/layouts/Form/Fields/Index";
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

/**
 * Normaliza `""` pra `null` antes do `zodResolver` validar (mesmo padrão já
 * usado em `crud-record-modal.tsx`/`Containers.tsx`, regra 2 do AGENTS.md —
 * schema não é editado, só o shape de entrada é remapeado). `document`/
 * `phone`/`birthDate` são `.nullish()` no schema gerado (aceitam `null`,
 * não string vazia) — sem isso, apagar o campo trava o submit com erro de
 * `.min()` (SPEC-30 RF2).
 */
function emptyStringsToNull<V>(value: V): V {
  if (value === "") return null as unknown as V;
  if (Array.isArray(value)) return value.map((item) => emptyStringsToNull(item)) as unknown as V;
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        emptyStringsToNull(val),
      ]),
    ) as V;
  }
  return value;
}

function withEmptyStringsAsNull<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  const resolver = zodResolver(schema as never) as unknown as Resolver<T>;
  return (values, context, options) => resolver(emptyStringsToNull(values), context, options);
}

/**
 * Aba "Detalhes" do ProfileModal — POST /api/profile/me.
 *
 * SPEC-30 §6.1: o botão Salvar não fica mais dentro do `<Form>` — ele mora
 * no `Modal.Footer` (ao lado do Cancelar), referenciando este form pelo
 * atributo HTML `form` (recurso nativo: um `<button>` fora do `<form>`
 * ainda o submete, só precisa do `id` batendo). `onSubmittingChange`
 * reporta `formState.isSubmitting` pro modal saber quando desabilitar/
 * mostrar spinner no botão do rodapé, já que o estado do form continua
 * local a este componente (cada aba mantém seu próprio `useForm`).
 */
export function DetailTab({
  user,
  onSubmittingChange,
  onSaved,
}: {
  user: UserDetailDTO;
  onSubmittingChange?: (isSubmitting: boolean) => void;
  onSaved?: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const methods = useForm<DetailInput>({
    resolver: withEmptyStringsAsNull(detailSchema),
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

  useEffect(() => {
    onSubmittingChange?.(methods.formState.isSubmitting);
  }, [methods.formState.isSubmitting, onSubmittingChange]);

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      const updated = await mutation.mutateAsync({
        data: {
          userName: data.userName,
          profile: {
            fullName: data.fullName,
            document: data.document,
            email: data.email,
            phone: data.phone || null,
            birthDate: data.birthDate || null,
          },
        },
      });
      queryClient.setQueryData(profileMeQueryOptions().queryKey, updated);
      toast.success(t("shell.profileModal.saved"));
      onSaved?.();
    } catch {
      toast.error(t("shell.profileModal.saveError"));
    }
  });

  return (
    <Form id="profile-detail-form" noValidate onSubmit={onSubmit}>
      <Row className="g-3">
        <InputText
          methods={methods}
          fieldName="fullName"
          label={t("shell.profileModal.fullName")}
          md={6}
        />
        <InputText
          methods={methods}
          fieldName="userName"
          label={t("shell.profileModal.userName")}
          disabled
          md={6}
        />
        <InputEmail
          methods={methods}
          fieldName="email"
          label={t("shell.profileModal.email")}
          md={6}
        />
        <InputDocument
          methods={methods}
          fieldName="document"
          label={t("shell.profileModal.document")}
          md={6}
        />
        <InputPhone
          methods={methods}
          fieldName="phone"
          label={t("shell.profileModal.phone")}
          md={6}
        />
        <InputDate
          methods={methods}
          fieldName="birthDate"
          label={t("shell.profileModal.birthDate")}
          md={6}
        />
      </Row>
    </Form>
  );
}
