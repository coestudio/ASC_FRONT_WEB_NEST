import { FieldValues, Path } from "react-hook-form";
import { Col, Row } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";
import InputCEP from "layouts/Form/Fields/InputCEP";
import InputText from "layouts/Form/Fields/InputText";
import Select from "layouts/Form/Fields/Select";
import type { AddressCreate } from "@/api/generated/model";
import { brStateOptions } from "@/data/br-states";
import { countryOptions } from "@/data/countries";

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
 *
 * SPEC-24: "País" vira dropdown (`countryOptions`, código ISO alpha-2, o
 * mesmo formato que o Zod gerado exige). "Estado" e o campo de código
 * postal mudam de comportamento conforme o país selecionado — Brasil
 * mantém o dropdown de UF e o `InputCEP` com máscara/lookup ViaCEP; outro
 * país vira texto livre (sem máscara brasileira, sem exigir preenchimento),
 * permitindo cadastrar um endereço fora do Brasil (ex.: um porto em
 * Portugal, usado em operação de importação/exportação).
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

  // Sem país selecionado (registro antigo sem o campo), assume Brasil —
  // mantém o comportamento anterior (CEP mascarado, UF em dropdown) como
  // default, só muda quando o usuário escolhe outro país explicitamente.
  const countryValue = methods.watch(path("country")) as string | undefined;
  const isBrazil = (countryValue || "BR") === "BR";

  return (
    <Col {...colProps}>
      <fieldset className={config.containerClass || default_containerClass}>
        {label || config.label ? (
          <legend className="fs-6 mb-2">{label || config.label}</legend>
        ) : null}
        <Row>
          {isBrazil ? (
            <InputCEP
              methods={methods}
              fieldName={path("postalCode")}
              label="CEP"
              // O Core modela `postalCode` como nullable (`AddressCreate`) —
              // `InputCEP` sozinho tornaria obrigatório por padrão; aqui
              // isso é sempre desligado, coerente com o contrato gerado.
              config={{ rules: { required: false } }}
              md={4}
              updateFields={{
                city: path("city"),
                state: path("state"),
                neighborhood: path("neighborhood"),
                street: path("street"),
              }}
            />
          ) : (
            <InputText
              methods={methods}
              fieldName={path("postalCode")}
              label="Código postal"
              maxLength={10}
              md={4}
            />
          )}
          <InputText methods={methods} fieldName={path("street")} label="Logradouro" md={8} />
          <InputText methods={methods} fieldName={path("number")} label="Número" md={3} />
          <InputText methods={methods} fieldName={path("complement")} label="Complemento" md={5} />
          <InputText methods={methods} fieldName={path("neighborhood")} label="Bairro" md={4} />
          <InputText methods={methods} fieldName={path("city")} label="Cidade" md={5} />
          {isBrazil ? (
            <Select
              methods={methods}
              fieldName={path("state")}
              label="Estado"
              config={{ options: brStateOptions, placeholder: "Selecione..." }}
              md={4}
            />
          ) : (
            <InputText
              methods={methods}
              fieldName={path("state")}
              label="Estado"
              // Core aumentou o limite de `state` pra 100 chars (pedido da
              // SPEC-24 §18, já implementado) — cabe nome de província/
              // distrito por extenso pra endereço fora do Brasil.
              maxLength={100}
              md={4}
            />
          )}
          <Select
            methods={methods}
            fieldName={path("country")}
            label="País"
            config={{ options: countryOptions, placeholder: "Selecione..." }}
            md={3}
          />
        </Row>
      </fieldset>
    </Col>
  );
}

export default AddressGroup;
