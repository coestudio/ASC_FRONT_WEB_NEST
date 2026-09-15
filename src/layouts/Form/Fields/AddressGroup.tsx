import { FieldValues, Path } from "react-hook-form";
import { Col, Row } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";
import InputCEP from "layouts/Form/Fields/InputCEP";
import InputText from "layouts/Form/Fields/InputText";
import type { AddressCreate } from "@/api/generated/model";

/**
 * Bloco de campos de endereço — cobre 1:1 o shape gerado `AddressCreate`
 * (`postalCode`, `street`, `number`, `complement`, `neighborhood`, `city`,
 * `state`, `country`), renderizado como bloco único dentro do form em vez
 * de `Input*` soltos repetidos em cada tela que tem `address` (RF4/CA3 da
 * SPEC-SHARE-01 — se o Core mudar o shape e `just map` regenerar diferente,
 * `path()` abaixo quebra em `tsc --noEmit`, não silenciosamente em runtime).
 *
 * `fieldName` é o nó do objeto dentro do form (ex.: `"address"`); os
 * subcampos reusam `InputCEP`/`InputText` já existentes apontando pra
 * `${fieldName}.campo`. `InputCEP.updateFields` já preenche cidade/estado/
 * bairro/logradouro ao digitar o CEP (`layouts/Form/Services/Viacep`).
 */
function AddressGroup<T extends FieldValues>({
  fieldName,
  methods,
  label,
  config = {},
  ...colProps
}: InputDTO<T>) {
  // `Path<T>` é dinâmico por string — o cast aqui é o idiom padrão do
  // react-hook-form pra endereçar um subcampo de um nó de objeto genérico;
  // o `keyof AddressCreate` em `suffix` é quem garante que os 8 campos do
  // shape gerado estão todos cobertos (RF4), sem `any`.
  const path = (suffix: keyof AddressCreate): Path<T> => `${fieldName}.${suffix}` as Path<T>;

  return (
    <Col {...colProps}>
      <fieldset className={config.containerClass || default_containerClass}>
        {label || config.label ? (
          <legend className="fs-6 mb-2">{label || config.label}</legend>
        ) : null}
        <Row>
          <InputCEP
            methods={methods}
            fieldName={path("postalCode")}
            label="CEP"
            md={4}
            updateFields={{
              city: path("city"),
              state: path("state"),
              neighborhood: path("neighborhood"),
              street: path("street"),
            }}
          />
          <InputText methods={methods} fieldName={path("street")} label="Logradouro" md={8} />
          <InputText methods={methods} fieldName={path("number")} label="Número" md={3} />
          <InputText methods={methods} fieldName={path("complement")} label="Complemento" md={5} />
          <InputText methods={methods} fieldName={path("neighborhood")} label="Bairro" md={4} />
          <InputText methods={methods} fieldName={path("city")} label="Cidade" md={5} />
          <InputText methods={methods} fieldName={path("state")} label="Estado" md={4} />
          <InputText
            methods={methods}
            fieldName={path("country")}
            label="País"
            placeholder="BR"
            maxLength={2}
            md={3}
          />
        </Row>
      </fieldset>
    </Col>
  );
}

export default AddressGroup;
