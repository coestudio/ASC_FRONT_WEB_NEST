import { Controller, FieldValues, Path } from "react-hook-form";
import { Col, Form, Row } from "react-bootstrap";

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";

/**
 * Bloco de endereço (`AddressCreate`/`AddressUpdate` gerados pelo Core) —
 * renderizado como um "grupo" dentro de `RenderFields`
 * (`LayoutField.type === "GroupAddress"`, ver `layouts/Form/Fields/Index.ts`
 * e `map.tsx`), nunca usado direto numa tela (regra 10 do AGENTS.md).
 * `fieldName` é o prefixo do campo aninhado no form pai (ex.: `"address"`
 * em `HarborCreate.address`, SPEC-04 §9) — cada subcampo vira
 * `${fieldName}.postalCode`, `${fieldName}.street` etc. Usa `Controller`
 * direto (como `InputCEP`) em vez dos `Input*` da biblioteca porque o path
 * é dinâmico (`Path<T>` construído em runtime), não um `fieldName` fixo.
 */
function Adress<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  ...colProps
}: InputDTO<T>) {
  const path = (suffix: string) => `${fieldName}.${suffix}` as Path<T>;

  const renderText = (suffix: string, fieldLabel: string, colSize: number, maxLength?: number) => (
    <Col md={colSize} key={suffix}>
      <Controller
        control={control}
        name={path(suffix)}
        render={({ field, fieldState }) => (
          <Form.Group className={default_containerClass}>
            <Form.Label>{fieldLabel}</Form.Label>
            <Form.Control
              type="text"
              value={(field.value as string | null | undefined) ?? ""}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              maxLength={maxLength}
              isInvalid={!!fieldState.error}
            />
            {fieldState.error?.message ? (
              <Form.Control.Feedback type="invalid">
                {fieldState.error.message}
              </Form.Control.Feedback>
            ) : null}
          </Form.Group>
        )}
      />
    </Col>
  );

  return (
    <Col xs={12} {...colProps}>
      <fieldset className="border rounded p-3 mb-3">
        <legend className="h6 mb-2">{label || config.label || "Endereço"}</legend>
        <Row>
          {renderText("postalCode", "CEP", 3, 10)}
          {renderText("street", "Rua", 6, 200)}
          {renderText("number", "Número", 3, 20)}
          {renderText("neighborhood", "Bairro", 5, 100)}
          {renderText("city", "Cidade", 4, 100)}
          {renderText("state", "Estado", 3, 100)}
          {renderText("complement", "Complemento", 4, 100)}
          {renderText("country", "País (UF)", 2, 2)}
        </Row>
      </fieldset>
    </Col>
  );
}

export default Adress;
