import { Controller, FieldValues } from "react-hook-form";
import { Col, Form } from "react-bootstrap";

import InputDTO, { default_containerClass, type FieldOption } from "layouts/Form/types/Input";

/**
 * Dropdown único com seleção múltipla (`<Form.Select multiple>` do
 * Bootstrap) — valor sempre um array de `string | number`, casado com o
 * tipo de `config.options` (ex.: `roles: InternalRole[]`, SPEC-03 decisão
 * D3). Primeiro Field de seleção da biblioteca; opções vêm de
 * `config.options` (não hardcoded aqui), pensado pra ser reaproveitado por
 * qualquer enum/lookup do Core nas próximas SPECs.
 */
function InputMultiSelect<T extends FieldValues>({
  fieldName,
  methods: { control },
  label,
  config = {},
  ...colProps
}: InputDTO<T>) {
  const options: FieldOption[] = config.options ?? [];

  return (
    <Col {...colProps}>
      <Controller
        control={control}
        name={fieldName}
        rules={config.rules}
        render={({ field, fieldState }) => {
          const selected = ((field.value as Array<string | number> | undefined) ?? []).map(String);

          return (
            <Form.Group
              className={`${config.containerClass || default_containerClass}${fieldState.error ? " field-invalid" : ""}`}
            >
              <Form.Label>{label || config.label || "Selecione"}</Form.Label>
              <Form.Select
                multiple
                value={selected}
                isInvalid={!!fieldState.error}
                className={config.className ?? ""}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((opt) =>
                    Number.isNaN(Number(opt.value)) ? opt.value : Number(opt.value),
                  );
                  field.onChange(values);
                }}
              >
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Form.Select>
              {fieldState.error?.message ? (
                <Form.Control.Feedback type="invalid" className="d-block">
                  {fieldState.error.message}
                </Form.Control.Feedback>
              ) : (
                <Form.Text className="text-muted">&nbsp;</Form.Text>
              )}
            </Form.Group>
          );
        }}
      />
    </Col>
  );
}

export default InputMultiSelect;
