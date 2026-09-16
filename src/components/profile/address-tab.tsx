import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, Row } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { z } from "zod";

import { PutApiProfileAddressBody } from "@/api/generated/zod/profile/profile.zod";
import { usePutApiProfileAddress } from "@/api/generated/endpoints/profile/profile";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { InputText, InputCEP, Select } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";
import type { AddressDTO } from "@/api/generated/model";
import { brStateOptions } from "@/data/br-states";
import { countryOptions } from "@/data/countries";

const addressSchema = z.object({
  postalCode: PutApiProfileAddressBody.shape.postalCode,
  country: PutApiProfileAddressBody.shape.country,
  state: PutApiProfileAddressBody.shape.state,
  neighborhood: PutApiProfileAddressBody.shape.neighborhood,
  street: PutApiProfileAddressBody.shape.street,
  number: PutApiProfileAddressBody.shape.number,
  complement: PutApiProfileAddressBody.shape.complement,
  city: PutApiProfileAddressBody.shape.city,
});
type AddressInput = z.infer<typeof addressSchema>;

/**
 * Aba "Endereço" do ProfileModal — PUT /api/profile/address. Botão Salvar
 * mora no `Modal.Footer` (SPEC-30 §6.1) — ver comentário equivalente em
 * `detail-tab.tsx`.
 */
export function AddressTab({
  address,
  onSubmittingChange,
  onSaved,
}: {
  address: AddressDTO;
  onSubmittingChange?: (isSubmitting: boolean) => void;
  onSaved?: () => void;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const methods = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      postalCode: address.postalCode ?? "",
      // Default "BR" (não string vazia — o Zod gerado exige exatamente 2
      // letras quando o campo é preenchido, `""` quebraria a validação).
      country: address.country ?? "BR",
      state: address.state ?? "",
      neighborhood: address.neighborhood ?? "",
      street: address.street ?? "",
      number: address.number ?? "",
      complement: address.complement ?? "",
      city: address.city ?? "",
    },
  });
  const mutation = usePutApiProfileAddress();
  // País ativo do formulário (SPEC-24) — decide se "Estado" continua um
  // dropdown de UF (só faz sentido para o Brasil) ou vira texto livre.
  const isBrazil = (methods.watch("country") || "BR") === "BR";

  useEffect(() => {
    onSubmittingChange?.(methods.formState.isSubmitting);
  }, [methods.formState.isSubmitting, onSubmittingChange]);

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: profileMeQueryOptions().queryKey });
      toast.success(t("shell.profileModal.saved"));
      onSaved?.();
    } catch {
      toast.error(t("shell.profileModal.saveError"));
    }
  });

  return (
    <Form id="profile-address-form" noValidate onSubmit={onSubmit}>
      <Row className="g-3">
        <InputCEP
          methods={methods}
          fieldName="postalCode"
          label={t("shell.profileModal.postalCode")}
          config={{ rules: { required: false } }}
          updateFields={{
            city: "city",
            uf: "state",
            neighborhood: "neighborhood",
            street: "street",
          }}
          md={4}
        />
        <Select
          methods={methods}
          fieldName="country"
          label={t("shell.profileModal.country")}
          config={{ options: countryOptions, placeholder: t("shell.profileModal.selectCountry") }}
          md={4}
        />
        {isBrazil ? (
          <Select
            methods={methods}
            fieldName="state"
            label={t("shell.profileModal.state")}
            config={{ options: brStateOptions, placeholder: t("shell.profileModal.selectState") }}
            md={4}
          />
        ) : (
          <InputText
            methods={methods}
            fieldName="state"
            label={t("shell.profileModal.state")}
            // Core aumentou o limite de `state` pra 100 chars (pedido da
            // SPEC-24 §18, já implementado) — cabe nome de província/
            // distrito por extenso pra endereço fora do Brasil.
            maxLength={100}
            md={4}
          />
        )}
        <InputText methods={methods} fieldName="city" label={t("shell.profileModal.city")} md={4} />
        <InputText
          methods={methods}
          fieldName="neighborhood"
          label={t("shell.profileModal.neighborhood")}
          md={6}
        />
        <InputText
          methods={methods}
          fieldName="street"
          label={t("shell.profileModal.street")}
          md={6}
        />
        <InputText
          methods={methods}
          fieldName="number"
          label={t("shell.profileModal.number")}
          md={4}
        />
        <InputText
          methods={methods}
          fieldName="complement"
          label={t("shell.profileModal.complement")}
          md={8}
        />
      </Row>
    </Form>
  );
}
