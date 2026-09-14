import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Spinner } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { z } from "zod";

import { PutApiProfileAddressBody } from "@/api/generated/zod/profile/profile.zod";
import { usePutApiProfileAddress } from "@/api/generated/endpoints/profile/profile";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { InputText } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";
import type { AddressDTO } from "@/api/generated/model";

const addressSchema = z.object({
  postalCode: PutApiProfileAddressBody.shape.postalCode,
  state: PutApiProfileAddressBody.shape.state,
  neighborhood: PutApiProfileAddressBody.shape.neighborhood,
  street: PutApiProfileAddressBody.shape.street,
  number: PutApiProfileAddressBody.shape.number,
  complement: PutApiProfileAddressBody.shape.complement,
  city: PutApiProfileAddressBody.shape.city,
});
type AddressInput = z.infer<typeof addressSchema>;

/** Aba "Endereço" do ProfileModal — PUT /api/profile/address. */
export function AddressTab({ address }: { address: AddressDTO }) {
  const t = useT();
  const queryClient = useQueryClient();
  const methods = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      postalCode: address.postalCode ?? "",
      state: address.state ?? "",
      neighborhood: address.neighborhood ?? "",
      street: address.street ?? "",
      number: address.number ?? "",
      complement: address.complement ?? "",
      city: address.city ?? "",
    },
  });
  const mutation = usePutApiProfileAddress();

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      await mutation.mutateAsync({ data });
      await queryClient.invalidateQueries({ queryKey: profileMeQueryOptions().queryKey });
      toast.success(t("shell.profileModal.saved"));
    } catch {
      toast.error(t("shell.profileModal.saveError"));
    }
  });

  return (
    <Form noValidate onSubmit={onSubmit}>
      <InputText
        methods={methods}
        fieldName="postalCode"
        label={t("shell.profileModal.postalCode")}
        md={4}
      />
      <InputText methods={methods} fieldName="state" label={t("shell.profileModal.state")} md={4} />
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
